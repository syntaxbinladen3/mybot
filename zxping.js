const raw = require('raw-socket');
const [,, target, durationStr] = process.argv;

if (!target || !durationStr) {
  console.log("Usage: node zxping.js <ip> <duration_in_seconds>");
  process.exit(1);
}

const duration = parseFloat(durationStr);
const endTime = Date.now() + duration * 1000;

const packetSize = 512;
let sent = 0, received = 0, timeouts = 0;

process.stdout.write('\x1Bc'); // Clear screen
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

socket.on("error", err => {
  console.error("Socket Error:", err.toString());
});

let seq = 0;
let awaitingReply = false;
const replies = new Map();

socket.on("message", (buffer, source) => {
  const id = buffer.readUInt16BE(6);
  const sentTime = replies.get(id);
  if (sentTime) {
    const rtt = Date.now() - sentTime;
    received++;
    console.log(`${buffer.length} bytes from ${source} : - ttl=${buffer.readUInt8(8)} - time=${rtt}ms`);
    replies.delete(id);
    awaitingReply = false;
  }
});

async function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function pingLoop() {
  while (Date.now() < endTime) {
    const id = seq++;
    const packet = createPacket(id);
    replies.set(id, Date.now());
    sent++;
    awaitingReply = true;

    try {
      socket.send(packet, 0, packet.length, target, (err) => {
        if (err) {
          console.log('\x1b[31mconnection timed out\x1b[0m');
          awaitingReply = false;
          timeouts++;
        }
      });
    } catch (err) {
      console.log('\x1b[31mconnection error\x1b[0m');
      timeouts++;
      awaitingReply = false;
    }

    const timeout = 1000; // 1s timeout
    const startWait = Date.now();

    while (awaitingReply && (Date.now() - startWait) < timeout) {
      await delay(10);
    }

    if (awaitingReply) {
      console.log('\x1b[31mconnection timed out\x1b[0m');
      awaitingReply = false;
      replies.delete(id);
      timeouts++;
    }

    await delay(200); // Throttle between packets
  }

  socket.close();
  showSummary();
}

function showSummary() {
  process.stdout.write('\x1Bc');
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
}

pingLoop();
