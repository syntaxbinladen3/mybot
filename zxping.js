const { spawn } = require('child_process');
const [,, ip, durationStr] = process.argv;

if (!ip || !durationStr) {
  console.log("Usage: node zxping.js <ip> <duration_in_seconds>");
  process.exit(1);
}

const duration = parseFloat(durationStr);
const seconds = Math.floor(duration);
const pingArgs = ['-i', '0.2', '-w', `${seconds}`, ip];

process.stdout.write('\x1Bc'); // Clear screen
console.log(`S.T.S - ZX-PING | T.ME/STSVKINGDOM`);
console.log(`--------------------------------------------------------------`);

let received = 0;
let timeouts = 0;
let lost = 0;

const ping = spawn('ping', pingArgs);

ping.stdout.on('data', data => {
  const lines = data.toString().split('\n');
  for (const line of lines) {
    if (/bytes from/.test(line)) {
      received++;
      console.log(line);
    } else if (/Request timeout|Destination Host Unreachable|Time to live exceeded/.test(line)) {
      timeouts++;
      console.log('\x1b[31mconnection timed out\x1b[0m');
    }
  }
});

ping.stderr.on('data', data => {
  console.error(`stderr: ${data}`);
});

ping.on('close', code => {
  lost = timeouts; // We treat timeouts as losses

  process.stdout.write('\x1Bc'); // Clear screen again
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
