const axios = require('axios');

// Configuration
const TARGET_URL = 'https://lookthefuture.com/'; // Change this to the target URL
const CONCURRENT_REQUESTS = 1000; // Number of concurrent requests to send
const TOTAL_REQUESTS = 100000; // Total requests to send

// Function to send HTTP requests
const sendRequest = async () => {
  try {
    const response = await axios.get(TARGET_URL);
    console.log(`Request sent: Status ${response.status}`);
  } catch (error) {
    console.error(`Request failed: ${error.message}`);
  }
};

// Function to perform load testing
const performLoadTest = () => {
  const requestPromises = [];

  // Create requests in batches
  for (let i = 0; i < TOTAL_REQUESTS; i++) {
    requestPromises.push(sendRequest());
    
    // If the number of concurrent requests reaches the limit, wait for all to finish
    if (requestPromises.length >= CONCURRENT_REQUESTS) {
      Promise.all(requestPromises).then(() => {
        console.log(`${CONCURRENT_REQUESTS} requests completed.`);
        requestPromises.length = 0; // Reset the request queue
      });
    }
  }

  // Handle remaining requests that are less than the concurrent limit
  if (requestPromises.length > 0) {
    Promise.all(requestPromises).then(() => {
      console.log('All requests completed.');
    });
  }
};

// Run the load test
performLoadTest();
