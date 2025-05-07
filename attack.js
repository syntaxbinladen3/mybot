const http = require('http');
const https = require('https');
const url = require('url');

// Basic HTTP requester function
function makeRequest(targetUrl, callback) {
    const parsedUrl = url.parse(targetUrl);
    const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.path,
        method: 'GET',
    };

    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const req = protocol.request(options, (res) => {
        const startTime = Date.now();
        res.on('data', () => {});  // To make sure we consume the response
        res.on('end', () => {
            const duration = Date.now() - startTime;
            callback(null, { statusCode: res.statusCode, duration });
        });
    });

    req.on('error', (err) => {
        callback(err);
    });

    req.end();
}

// Function to simulate a flood of requests (no concurrency control)
function startFloodTest(targetUrl, numRequests) {
    let completedRequests = 0;
    let totalDuration = 0;
    let errors = 0;

    console.log(`Starting flood test on ${targetUrl}`);
    console.log(`Total Requests: ${numRequests}`);

    function runRequest() {
        if (completedRequests < numRequests) {
            makeRequest(targetUrl, (err, result) => {
                completedRequests++;

                if (err) {
                    console.error(`Error: ${err.message}`);
                    errors++;
                } else {
                    totalDuration += result.duration;
                    console.log(`Request ${completedRequests}: Status ${result.statusCode}, Duration ${result.duration}ms`);
                }

                // If all requests are complete, print the summary
                if (completedRequests === numRequests) {
                    console.log(`Flood Test Complete:`);
                    console.log(`Total Requests: ${numRequests}`);
                    console.log(`Completed Requests: ${completedRequests}`);
                    console.log(`Errors: ${errors}`);
                    console.log(`Average Duration: ${totalDuration / completedRequests}ms`);
                } else {
                    runRequest(); // Continue firing more requests
                }
            });
            runRequest(); // Keep firing requests immediately
        }
    }

    // Start sending requests
    runRequest();
}

// CLI: Getting user input and starting the flood test
const args = process.argv.slice(2);

if (args.length < 2) {
    console.log('Usage: node loadTest.js <URL> <number_of_requests>');
    process.exit(1);
}

const [targetUrl, numRequests] = args;
startFloodTest(targetUrl, parseInt(numRequests));
