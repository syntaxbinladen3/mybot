const { spawn } = require('child_process');
const os = require('os');
const [,, subnetArg, durationStr] = process.argv;

if (!subnetArg || !durationStr) {
  console.log("Usage: node ZX-SN-PING.js <subnet/mask> <duration_in_ms>");
  process.exit(1);
}

const cidrToIps = (cidr) => {
  const [base, bits] = cidr.split('/');
  const baseParts = base.split('.').map(Number);
  const maskBits = parseInt(bits, 10);
  const hosts = 2 ** (32 - maskBits);

  const baseNum =
    (baseParts[0] << 24) |
    (baseParts[1] << 16) |
    (baseParts[2] << 8) |
    (baseParts[3]);

  const ips = [];
  for (let i = 1; i < hosts - 1; i++) {
    const ip = baseNum + i;
    const ipStr = [
      (ip >> 24) & 255,
      (ip >> 16) & 255,
      (ip >> 8) & 255,
      ip & 255
    ].join('.');
    ips.push(ipStr);
  }

  return ips;
};

const allIps = cidrToIps(subnetArg);
const totalIps = allIps.length;
const duration = parseInt(durationStr);
const startTime = Date.now();

let totalPings = 0;
let onlineIps = new Set();
let lastPingResult = {}; // Stores last known online/offline status

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function pingIp(ip) {
  const ping = spawn('ping', ['-c', '1', '-s', '64', '-W', '1', ip]);

  ping.stdout.on('data', (data) => {
    if (data.toString().includes('bytes from')) {
      onlineIps.add(ip);
      lastPingResult[ip] = true;
    }
  });

  ping.on('close', () => {
    if (!lastPingResult[ip]) {
      lastPingResult[ip] = false;
      onlineIps.delete(ip);
    }
    totalPings++;
  });
}

function updateDisplay() {
  process.stdout.write('\x1Bc');
  console.log(`ZX-SN-PING | T.ME/STSVKINGDOM`);
  console.log(`--------------------------------------------------`);
  console.log(`pings: ${totalPings}`);
  console.log(`bytes: 64`);
  console.log(`total ips: ${totalIps}`);
  console.log(`online: ${onlineIps.size}/${totalIps}`);
  console.log(`offline: ${totalIps - onlineIps.size}`);
  console.log(`running: ${formatUptime(Date.now() - startTime)}`);
}

function tick() {
  const now = Date.now();
  if (now - startTime >= duration) {
    clearInterval(loop);
    updateDisplay();
    console.log("\nDone. Stopping.");
    process.exit(0);
  }

  allIps.forEach(ip => {
    pingIp(ip);
  });

  updateDisplay();
}

const loop = setInterval(tick, 1000);
