const { exec } = require('child_process');
const os = require('os');
const fs = require('fs');

// Israeli IP blocks (expanded)
const israelCIDRBlocks = [
  "5.0.0.0/16", "31.154.0.0/16", "37.142.0.0/16", "62.90.0.0/16",
  "77.125.0.0/16", "79.179.0.0/16", "85.64.0.0/16", "94.159.0.0/16",
  "109.64.0.0/16", "132.72.0.0/16", "147.235.0.0/16", "176.12.0.0/16",
  "185.32.0.0/16", "192.114.0.0/16", "212.179.0.0/16", "213.8.0.0/16",
  // Add more if needed
];

const RESULTS_FILE = 'TXT.txt';
const CONCURRENT_SCANS = 20000; // 2000 pings at once
const LOG_EVERY = 4000; // Log every 4000 IPs checked

// Clear old results
if (fs.existsSync(RESULTS_FILE)) {
  fs.unlinkSync(RESULTS_FILE);
}

// Fast IP generator from CIDR
function* generateIPs(cidr) {
  const [network, mask] = cidr.split('/');
  const ipParts = network.split('.').map(Number);
  const networkAddr = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
  const broadcastAddr = networkAddr | (0xFFFFFFFF >>> parseInt(mask));
  
  for (let ip = networkAddr + 1; ip < broadcastAddr; ip++) {
    yield [
      (ip >>> 24) & 0xFF,
      (ip >>> 16) & 0xFF,
      (ip >>> 8) & 0xFF,
      ip & 0xFF
    ].join('.');
  }
}

// Ping function (cross-platform)
function ping(ip) {
  return new Promise((resolve) => {
    const platform = os.platform();
    const command = platform === 'win32' 
      ? `ping -n 1 -w 1000 ${ip}`
      : `ping -c 1 -W 1 ${ip}`;

    exec(command, (error, stdout, stderr) => {
      resolve(!error && stdout.includes('TTL='));
    });
  });
}

// Scan a CIDR block
async function scanBlock(cidr) {
  const ips = [...generateIPs(cidr)];
  const totalIPs = ips.length;
  let checked = 0;
  let pingable = 0;

  console.log(`\n[+] Scanning ${cidr} (${totalIPs.toLocaleString()} IPs)`);

  // Batch processing for better concurrency control
  for (let i = 0; i < ips.length; i += CONCURRENT_SCANS) {
    const batch = ips.slice(i, i + CONCURRENT_SCANS);
    const results = await Promise.all(batch.map(ip => ping(ip)));

    for (let j = 0; j < results.length; j++) {
      checked++;
      if (results[j]) {
        pingable++;
        fs.appendFileSync(RESULTS_FILE, `${batch[j]}\n`);
      }

      // Log progress
      if (checked % LOG_EVERY === 0) {
        console.log(`[${cidr}] ${checked.toLocaleString()}/${totalIPs.toLocaleString()} checked | ${pingable} pingable`);
      }
    }
  }

  return { checked, pingable };
}

// Main scanner
async function main() {
  console.log('🔥 ISRAELI IP SCANNER (Node.js) 🔥');
  console.log(`Threads: ${CONCURRENT_SCANS} | Logging every ${LOG_EVERY} IPs\n`);

  let totalChecked = 0;
  let totalPingable = 0;

  for (const block of israelCIDRBlocks) {
    const { checked, pingable } = await scanBlock(block);
    totalChecked += checked;
    totalPingable += pingable;
    console.log(`[+] ${block} done: ${pingable}/${checked} pingable`);
  }

  console.log(`\n✅ SCAN COMPLETE!`);
  console.log(`Total: ${totalPingable}/${totalChecked} pingable IPs`);
  console.log(`Results saved to ${RESULTS_FILE}`);
}

// Run it
main().catch(console.error);
