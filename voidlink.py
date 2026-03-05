#!/usr/bin/env python3
"""
STARLINK - Termux Edition (No Playwright install needed)
"""

import json
import time
import random
import string
import asyncio
from datetime import datetime, timezone
from colorama import init, Fore, Style
import requests
import httpx
import os
import subprocess
import tempfile

init(autoreset=True)

# Colors
ORANGE = '\033[38;5;214m'
BRIGHT_WHITE = Style.BRIGHT + Fore.WHITE
CYAN = Fore.CYAN
GREEN = Fore.GREEN
RED = Fore.RED
YELLOW = Fore.YELLOW
RESET = Style.RESET_ALL

class StarLink:
    def __init__(self, config_file, webhook_url):
        with open(config_file, 'r') as f:
            self.config = json.load(f)
        
        self.targets = self.config['targets']
        self.req_interval = self.config['settings']['request_interval']
        self.cycle_delay = self.config['settings']['delay_between_cycles']
        self.screenshot_interval = self.config['settings']['screenshot_interval']
        self.webhook_url = webhook_url
        
        self.last_log = 0
        self.last_discord_log = 0
        self.start_time = datetime.now()
        self.request_count = 0
        self.session_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        self.last_responses = {}
        self.screenshot_counter = {}
        
        # Chromium path for Termux
        self.chromium_path = "/data/data/com.termux/files/usr/bin/chromium-browser"
        
        # User agents
        self.agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        ]
        
        # HTTP client
        self.client = httpx.Client(http2=True, verify=False, timeout=15.0)
        
        # Check Chromium
        if not os.path.exists(self.chromium_path):
            print(f"{RED}Chromium not found at {self.chromium_path}{RESET}")
            print(f"{YELLOW}Try: pkg install chromium{RESET}")
            exit(1)
        
        # Send startup
        self.send_startup_webhook()
        
    def rand_str(self, n=8):
        return ''.join(random.choices(string.ascii_lowercase + string.digits, k=n))
    
    def format_size(self, size):
        if size < 1024:
            return f"{size}B"
        elif size < 1024**2:
            return f"{size/1024:.2f}KB"
        elif size < 1024**3:
            return f"{size/1024**2:.2f}MB"
        else:
            return f"{size/1024**3:.2f}GB"
    
    def detect_cdn(self, headers):
        headers_str = str(headers).lower()
        if 'cloudflare' in headers_str or 'cf-ray' in headers_str:
            return 'cloudflare'
        if 'akamai' in headers_str:
            return 'akamai'
        if 'sucuri' in headers_str:
            return 'sucuri'
        if 'incapsula' in headers_str:
            return 'incapsula'
        if 'fastly' in headers_str:
            return 'fastly'
        return 'origin'
    
    def get_response_type(self, headers):
        content_type = headers.get('content-type', '').lower()
        if 'text/html' in content_type:
            return 'HTML'
        elif 'application/json' in content_type:
            return 'JSON'
        elif 'image/' in content_type:
            return 'IMAGE'
        elif 'text/css' in content_type:
            return 'CSS'
        elif 'javascript' in content_type:
            return 'JS'
        elif 'application/pdf' in content_type:
            return 'PDF'
        elif 'text/plain' in content_type:
            return 'TEXT'
        else:
            return 'OTHER'
    
    def send_startup_webhook(self):
        embed = {
            "title": f"🛰️ STARLINK - Session Started (Termux)",
            "color": 0x9b59b6,
            "fields": [
                {
                    "name": "Session",
                    "value": f"`{self.session_id}`",
                    "inline": True
                },
                {
                    "name": "Targets",
                    "value": f"`{len(self.targets)}`",
                    "inline": True
                },
                {
                    "name": "Start Time",
                    "value": f"`{self.start_time.strftime('%Y-%m-%d %H:%M:%S')}`",
                    "inline": True
                },
                {
                    "name": "Settings",
                    "value": f"```Interval: {self.req_interval}s\nCycle Delay: {self.cycle_delay}s\nScreenshot: every {self.screenshot_interval}```",
                    "inline": False
                }
            ],
            "footer": {
                "text": "STARLINK • Termux Edition"
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        try:
            requests.post(self.webhook_url, json={"embeds": [embed]})
        except:
            pass
    
    async def take_screenshot(self, url):
        """Take screenshot using system Chromium (no Playwright)"""
        try:
            # Create temp file for screenshot
            temp_dir = tempfile.mkdtemp()
            screenshot_path = os.path.join(temp_dir, 'screenshot.png')
            
            # Use Chromium headless directly
            cmd = [
                self.chromium_path,
                '--headless',
                '--no-sandbox',
                '--disable-gpu',
                '--screenshot=' + screenshot_path,
                '--window-size=1280,720',
                '--hide-scrollbars',
                '--disable-dev-shm-usage',
                url
            ]
            
            # Run Chromium
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.PIPE,
                stderr=asyncio.PIPE
            )
            
            try:
                await asyncio.wait_for(process.communicate(), timeout=30.0)
            except asyncio.TimeoutError:
                process.kill()
                await process.wait()
                print(f"{RED}Screenshot timeout{RESET}")
                return None
            
            # Check if screenshot exists
            if os.path.exists(screenshot_path):
                with open(screenshot_path, 'rb') as f:
                    screenshot_data = f.read()
                
                # Clean up
                os.remove(screenshot_path)
                os.rmdir(temp_dir)
                
                return screenshot_data
            else:
                return None
                
        except Exception as e:
            print(f"{RED}Screenshot failed: {str(e)[:50]}{RESET}")
            return None
    
    def send_screenshot_webhook(self, url, screenshot_data, response_info):
        """Send screenshot to Discord"""
        try:
            embed = {
                "title": f"📸 STARLINK Screenshot - {url}",
                "color": 0xf1c40f,
                "fields": [
                    {
                        "name": "Target",
                        "value": f"```{url}```",
                        "inline": False
                    },
                    {
                        "name": "Response Info",
                        "value": f"```{response_info}```",
                        "inline": False
                    },
                    {
                        "name": "Time",
                        "value": f"`{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}`",
                        "inline": True
                    }
                ],
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            files = {
                'file': ('screenshot.png', screenshot_data, 'image/png')
            }
            payload = {
                'payload_json': json.dumps({'embeds': [embed]})
            }
            
            requests.post(self.webhook_url, files=files, data=payload)
            print(f"{GREEN}✓ Screenshot sent{RESET}")
            
        except Exception as e:
            print(f"{RED}Failed to send screenshot: {e}{RESET}")
    
    def send_update_webhook(self):
        """Send update to Discord every 2-5 minutes"""
        running_time = str(datetime.now() - self.start_time).split('.')[0]
        
        last_resp_str = ""
        for url, info in list(self.last_responses.items())[-5:]:
            last_resp_str += f"{url[:30]}... | {info}\n"
        
        embed = {
            "title": f"🛰️ STARLINK - ({datetime.now().strftime('%Y-%m-%d %H:%M:%S')}) - (Session {self.session_id})",
            "color": 0x9b59b6,
            "fields": [
                {
                    "name": "🎯 Target Count",
                    "value": f"```{len(self.targets)}```",
                    "inline": True
                },
                {
                    "name": "📊 Total Requests",
                    "value": f"```{self.request_count}```",
                    "inline": True
                },
                {
                    "name": "⏱️ Session Time",
                    "value": f"```{running_time}```",
                    "inline": True
                },
                {
                    "name": "━━━━━━━━━━━━━━━━━━━━━━",
                    "value": "**Recent Responses**",
                    "inline": False
                },
                {
                    "name": "📡 Last 5 Hits",
                    "value": f"```{last_resp_str if last_resp_str else 'None'}```",
                    "inline": False
                }
            ],
            "footer": {
                "text": f"Session {self.session_id} • Update every 2-5min"
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        try:
            requests.post(self.webhook_url, json={"embeds": [embed]})
        except:
            pass
    
    async def scan_url(self, url, cycle_num):
        """Scan single URL"""
        start = time.time()
        self.request_count += 1
        
        try:
            rand_param = self.rand_str(8)
            full_url = f"{url}?{rand_param}"
            
            headers = {
                'User-Agent': random.choice(self.agents),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache',
                'Referer': random.choice([
                    "https://www.google.com/",
                    "https://www.bing.com/",
                    "https://duckduckgo.com/",
                    "https://www.reddit.com/"
                ])
            }
            
            response = self.client.get(full_url, headers=headers)
            
            resp_time = (time.time() - start) * 1000
            status = response.status_code
            size = len(response.content)
            
            cdn = self.detect_cdn(response.headers)
            if cdn == 'origin':
                hit_text = f"org-{cdn}"
                hit_color = BRIGHT_WHITE
            else:
                hit_text = f"cdn-{cdn}"
                hit_color = ORANGE if cdn == 'cloudflare' else RED
            
            resp_type = self.get_response_type(response.headers)
            
            if status < 400:
                status_color = GREEN
                result_text = f"{GREEN}pxn-s{RESET}"
            else:
                status_color = RED
                result_text = f"{RED}intercepted{RESET}"
            
            info = f"{hit_text} | {status} | {self.format_size(size)} | {resp_type} | {resp_time:.2f}ms"
            self.last_responses[url] = info
            
            current_time = time.time()
            if current_time - self.last_log >= 3:
                print(f"{CYAN}[Cycle {cycle_num}]{RESET} STARLINK ---> ({hit_color}{hit_text}{RESET}) ↓")
                print(f"({resp_time:.2f}ms) ---> {status_color}{status}{RESET} ←")
                print(f"({self.format_size(size)}) ---> {resp_type} ←")
                print(f"Result: {result_text}")
                print()
                self.last_log = current_time
            
            # Take screenshot if needed (only once per URL)
            if url not in self.screenshot_counter:
                self.screenshot_counter[url] = 0
            
            if self.screenshot_counter[url] < 1:
                print(f"{YELLOW}📸 Taking screenshot of {url}...{RESET}")
                screenshot = await self.take_screenshot(url)
                if screenshot:
                    self.send_screenshot_webhook(url, screenshot, info)
                    self.screenshot_counter[url] = 1
            
            return True
            
        except Exception as e:
            resp_time = (time.time() - start) * 1000
            
            current_time = time.time()
            if current_time - self.last_log >= 3:
                print(f"{CYAN}[Cycle {cycle_num}]{RESET} STARLINK ---> ({BRIGHT_WHITE}org-failed{RESET}) ↓")
                print(f"({resp_time:.2f}ms) ---> {RED}000{RESET} ←")
                print(f"(0B) ---> ERROR ←")
                print(f"Error: {str(e)[:50]}")
                print()
                self.last_log = current_time
            
            return False
    
    async def run_cycle(self, cycle_num):
        """Run one complete cycle through all targets"""
        print(f"\n{YELLOW}[Cycle {cycle_num}] Starting scan of {len(self.targets)} targets...{RESET}")
        
        for url in self.targets:
            await self.scan_url(url, cycle_num)
            await asyncio.sleep(self.req_interval)
        
        current_time = time.time()
        if current_time - self.last_discord_log >= random.uniform(120, 300):
            self.send_update_webhook()
            self.last_discord_log = current_time
        
        print(f"{YELLOW}[Cycle {cycle_num}] Complete. Waiting {self.cycle_delay}s...{RESET}")
    
    async def run(self):
        startup_time = self.start_time.strftime("%Y-%m-%d %H:%M:%S")
        print(f"\n{CYAN}🛰️ STARLINK ({startup_time}) - Session: {self.session_id}{RESET}")
        print(f"Chromium: {self.chromium_path}")
        print(f"Targets: {len(self.targets)} | Interval: {self.req_interval}s | Cycle Delay: {self.cycle_delay}s")
        print("=" * 70)
        
        cycle_num = 1
        try:
            while True:
                await self.run_cycle(cycle_num)
                await asyncio.sleep(self.cycle_delay)
                cycle_num += 1
                
        except KeyboardInterrupt:
            print(f"\n{YELLOW}STARLINK stopped{RESET}")
            self.client.close()

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python starlink.py <config.json>")
        sys.exit(1)
    
    webhook = "https://discord.com/api/webhooks/1478989089045876779/fDm39Cls5AfZ0gZJM0sbhtJt59jo3i1Oy2_aHO3GmmSUw3gdg4pDfH7niEiXiA18ZJsM"
    
    star = StarLink(sys.argv[1], webhook)
    asyncio.run(star.run())
