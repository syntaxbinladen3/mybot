const raw = require('raw-socket');
const chalk = require('chalk');
const os = require('os');

const [,, target, durationStr] = process.argv;

if (!target || !durationStr) {
  console.log("Usage: node zxping.js <ip> <duration_in_seconds>");
  process.exit(1);
}

const duration = parseFloat(durationStr);
const interval = 200; // 0.2 seconds
const packetSize = 512; // Heavy packet
const packetCount = Math.floor((duration * 1000) / interval);

let sent = 0;
let received = 0;
let timeouts = 0;

// Clear terminal
console.clear();

// Banner
console.log(`S.T.S - ZX-PING | T.ME/STSVKINGDOM`);
console.log(`--------------------------------------------------------------`);

const socket = raw.createSocket({ protocol: raw.Protocol.ICMP });

function checksum(buf) {
  let sum = 0;
  for (let i = 0; i < buf.length; i += 2) {
    sum += buf.readUInt16BE(i);
    while (sum >> 16) sum = (sum & 0xffff) + (sum >> 16);
  }
  return ~sum & 0xffff;
}

function createPacket(id) {
  const buf = Buffer.alloc(packetSize);
  buf.writeUInt8(8, 0); // Type
  buf.writeUInt8(0, 1); // Code
  buf.writeUInt16BE(0, 2); // Checksum placeholder
  buf.writeUInt16BE(process.pid & 0xffff, 4); // Identifier
  buf.writeUInt16BE(id, 6); // Sequence Number

  const chksum = checksum(buf);
  buf.writeUInt16BE(chksum, 2);
  return buf;
}

const times = {};
socket.on("message", (buffer, source) => {
  const id = buffer.readUInt16BE(6);
  const sentTime = times[id];
  if (sentTime) {
    const time = Date.now() - sentTime;
    received++;
    console.log(`${buffer.length} bytes from ${source} : - ttl=${buffer.readUInt8(8)} - time=${time}ms`);
  }
});

socket.on("error", err => {
  console.error("Socket Error:", err.toString());
});

let current = 0;

const pingInterval = setInterval(() => {
  if (current >= packetCount) {
    clearInterval(pingInterval);
    socket.close();

    setTimeout(() => {
      console.clear();
      console.log(`ZX-PING | T.ME/STSVKINGDOM`);
      console.log(`--------------------------------------------------`);
      console.log(`RECEIVED - ${received}`);
      console.log(`LOST     - ${sent - received}`);
      console.log(`TIME OUT - ${timeouts}`);
      console.log(`--------------------------------------------------`);
      console.log(`TEAM S.T.S`);
      console.log(`t.me/fbigovv`);
      console.log(`t.me/stsgov`);
      console.log(`t.me/stsvkingdom`);
      console.log(`t.me/tspvkingdom`);
    }, 500);
    return;
  }

  const id = current++;
  const packet = createPacket(id);
  times[id] = Date.now();
  sent++;

  try {
    socket.send(packet, 0, packet.length, target, (err) => {
      if (err) {
        timeouts++;
        console.log(chalk.red('connection timed out'));
      }
    });

    // Fallback timeout handler
    setTimeout(() => {
      if (times[id]) {
        timeouts++;
        console.log(chalk.red('connection timed out'));
        delete times[id];
      }
    }, 1000);
  } catch (err) {
    console.log(chalk.red('connection error'));
    timeouts++;
  }
}, interval);
