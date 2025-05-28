const { spawn } = require('child_process');
const [,, ip, durationStr] = process.argv;

if (!ip || !durationStr) {
  console.log("Usage: node zxping.js <ip> <duration_in_seconds>");
  process.exit(1);
}

const duration = parseFloat(durationStr);
const seconds = Math.floor(duration);

process.stdout.write('\x1Bc'); // Clear terminal
console.log(`S.T.S - ZX-PING | T.ME/STSVKINGDOM`);
console.log(`--------------------------------------------------------------`);

let received = 0;
let timeouts = 0;
let lost = 0;
let lastResponse = Date.now();

const ping = spawn('ping', ['-i', '1', '-w', `${seconds}`, ip]);

ping.stdout.on('data', data => {
  const lines = data.toString().split('\n');
  for (const line of lines) {
    if (/bytes from/.test(line)) {
      received++;
      lastResponse = Date.now();
      console.log(line);
    } else if (/Request timeout|Destination Host Unreachable|Time to live exceeded/.test(line)) {
      timeouts++;
      lastResponse = Date.now(); // Count these as responses too
      console.log('\x1b[31mconnection timed out\x1b[0m');
    }
  }
});

ping.stderr.on('data', data => {
  console.error(`stderr: ${data}`);
});

// ⏱ Manual timeout detector (10s without response)
const timeoutChecker = setInterval(() => {
  const now = Date.now();
  if (now - lastResponse >= 10000) {
    console.log('\x1b[31mconnection timed out\x1b[0m');
    timeouts++;
    lastResponse = now; // prevent spamming
  }
}, 1000);

ping.on('close', code => {
  clearInterval(timeoutChecker);

  lost = timeouts; // We treat timeouts as losses

  process.stdout.write('\x1Bc'); // Clear terminal again
  console.log(`ZX-PING | T.ME/STSVKINGDOM`);
  console.log(`--------------------------------------------------`);
  console.log(`RECEIVED - ${received}`);
  console.log(`LOST     - ${lost}`);
  console.log(`TIME OUT - ${timeouts}`);
  console.log(`--------------------------------------------------`);
  console.log(`TEAM S.T.S`);
  console.log(`t.me/fbigovv`);
  console.log(`t.me/stsgov`);
  console.log(`t.me/stsvkingdom`);
  console.log(`t.me/tspvkingdom`);
});
