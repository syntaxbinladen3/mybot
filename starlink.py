#!/usr/bin/env python3
"""
STARLINK - Terminal Surveillance Array
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
        self.webhook_url = webhook_url
        
        self.last_log = 0
        self.last_discord_log = 0
        self.start_time = datetime.now()
        self.request_count = 0
        self.session_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        self.last_responses = {}
        self.screenshot_counter = {}
        
        # Chromium path
        self.chromium_path = "/data/data/com.termux/files/usr/bin/chromium-browser"
        
        # User agents
        self.agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
        ]
        
        # HTTP client
        self.client = httpx.Client(http2=True, verify=False, timeout=15.0)
        
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
        return 'origin'
    
    def get_response_type(self, headers):
        content_type = headers.get('content-type', '').lower()
        if 'text/html' in content_type:
            return 'HTML'
        elif 'application/json' in content_type:
            return 'JSON'
        elif 'image/' in content_type:
            return 'IMG'
        elif 'text/css' in content_type:
            return 'CSS'
        elif 'javascript' in content_type:
            return 'JS'
        else:
            return 'BIN'
    
    def send_startup_webhook(self):
        embed = {
            "title": f"STARLINK • Session Initiated",
            "color": 0x2b2d31,
            "fields": [
                {
                    "name": "Session ID",
                    "value": f"`{self.session_id}`",
                    "inline": True
                },
                {
                    "name": "Targets",
                    "value": f"`{len(self.targets)}`",
                    "inline": True
                },
                {
                    "name": "Started",
                    "value": f"`{self.start_time.strftime('%H:%M:%S')}`",
                    "inline": True
                }
            ],
            "footer": {
                "text": "STARLINK • v1.0"
            }
        }
        
        try:
            requests.post(self.webhook_url, json={"embeds": [embed]})
        except:
            pass
    
    def take_screenshot_sync(self, url):
        """Fixed screenshot for Termux"""
        try:
            temp_dir = tempfile.mkdtemp()
            screenshot_path = os.path.join(temp_dir, 'shot.png')
            
            # Termux Chromium needs extra flags
            cmd = [
                self.chromium_path,
                '--headless',
                '--no-sandbox',
                '--disable-gpu',
                '--disable-software-rasterizer',
                '--disable-dev-shm-usage',
                '--no-first-run',
                '--no-default-browser-check',
                '--disable-extensions',
                '--disable-background-networking',
                '--screenshot=' + screenshot_path,
                '--window-size=1280,1024',
                '--hide-scrollbars',
                '--virtual-time-budget=5000',
                url
            ]
            
            # Run with timeout
            process = subprocess.run(
                cmd,
                timeout=25,
                capture_output=True,
                env={**os.environ, 'DISPLAY': ':0'}
            )
            
            if os.path.exists(screenshot_path) and os.path.getsize(screenshot_path) > 1000:
                with open(screenshot_path, 'rb') as f:
                    data = f.read()
                
                os.remove(screenshot_path)
                os.rmdir(temp_dir)
                return data
            
            # If failed, try alternate method
            alt_cmd = [
                self.chromium_path,
                '--headless',
                '--no-sandbox',
                '--screenshot=' + screenshot_path,
                '--window-size=1280,1024',
                url
            ]
            
            process = subprocess.run(alt_cmd, timeout=25, capture_output=True)
            
            if os.path.exists(screenshot_path) and os.path.getsize(screenshot_path) > 1000:
                with open(screenshot_path, 'rb') as f:
                    data = f.read()
                
                os.remove(screenshot_path)
                os.rmdir(temp_dir)
                return data
                
            return None
                
        except Exception as e:
            return None
    
    async def take_screenshot(self, url):
        return await asyncio.get_event_loop().run_in_executor(
            None, self.take_screenshot_sync, url
        )
    
    def send_screenshot_webhook(self, url, screenshot_data, response_info):
        """Clean screenshot delivery"""
        try:
            embed = {
                "title": f"STARLINK • Capture • {url.split('//')[-1][:30]}",
                "color": 0x2b2d31,
                "fields": [
                    {
                        "name": "Target",
                        "value": f"`{url}`",
                        "inline": False
                    },
                    {
                        "name": "Response",
                        "value": f"`{response_info}`",
                        "inline": False
                    }
                ]
            }
            
            files = {'file': ('capture.png', screenshot_data, 'image/png')}
            payload = {'payload_json': json.dumps({'embeds': [embed]})}
            
            requests.post(self.webhook_url, files=files, data=payload)
            print(f"{GREEN}[CAPTURE] {url}{RESET}")
            
        except Exception as e:
            pass
    
    def send_update_webhook(self):
        """Clean periodic update - no emoji spam"""
        running_time = str(datetime.now() - self.start_time).split('.')[0]
        
        # Last 3 responses only
        last_resp = ""
        for url, info in list(self.last_responses.items())[-3:]:
            short_url = url.split('//')[-1][:25]
            last_resp += f"{short_url} › {info}\n"
        
        embed = {
            "title": f"STARLINK • Session {self.session_id}",
            "color": 0x2b2d31,
            "fields": [
                {
                    "name": "Runtime",
                    "value": f"`{running_time}`",
                    "inline": True
                },
                {
                    "name": "Requests",
                    "value": f"`{self.request_count}`",
                    "inline": True
                },
                {
                    "name": "Targets",
                    "value": f"`{len(self.targets)}`",
                    "inline": True
                },
                {
                    "name": "Recent",
                    "value": f"```{last_resp}```",
                    "inline": False
                }
            ]
        }
        
        try:
            requests.post(self.webhook_url, json={"embeds": [embed]})
        except:
            pass
    
    async def scan_url(self, url, cycle_num):
        start = time.time()
        self.request_count += 1
        
        try:
            rand_param = self.rand_str(8)
            full_url = f"{url}?{rand_param}"
            
            headers = {
                'User-Agent': random.choice(self.agents),
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache',
                'Referer': 'https://www.google.com/'
            }
            
            response = self.client.get(full_url, headers=headers, follow_redirects=True)
            
            resp_time = (time.time() - start) * 1000
            status = response.status_code
            size = len(response.content)
            
            cdn = self.detect_cdn(response.headers)
            if cdn == 'origin':
                hit_text = f"origin"
                hit_color = BRIGHT_WHITE
            else:
                hit_text = f"{cdn}"
                hit_color = ORANGE if cdn == 'cloudflare' else RED
            
            resp_type = self.get_response_type(response.headers)
            
            if status < 400:
                status_color = GREEN
                result = "SUCCESS"
            else:
                status_color = RED
                result = "BLOCKED"
            
            info = f"{hit_text} | {status} | {self.format_size(size)} | {resp_type}"
            self.last_responses[url] = info
            
            # Terminal - clean format
            current_time = time.time()
            if current_time - self.last_log >= 3:
                print(f"{CYAN}[{cycle_num:02d}]{RESET} {hit_color}{hit_text:>10}{RESET} {status_color}{status:3d}{RESET} {self.format_size(size):>7} {resp_type:4} {resp_time:6.0f}ms • {url}")
                self.last_log = current_time
            
            # Screenshot (once per URL)
            if url not in self.screenshot_counter:
                self.screenshot_counter[url] = 0
            
            if self.screenshot_counter[url] < 1 and status < 500:
                print(f"{YELLOW}[CAP] {url}{RESET}")
                screenshot = await self.take_screenshot(url)
                if screenshot and len(screenshot) > 1000:
                    self.send_screenshot_webhook(url, screenshot, info)
                    self.screenshot_counter[url] = 1
            
            return True
            
        except Exception as e:
            resp_time = (time.time() - start) * 1000
            
            current_time = time.time()
            if current_time - self.last_log >= 3:
                print(f"{CYAN}[{cycle_num:02d}]{RESET} {RED}    failed{RESET} {resp_time:6.0f}ms • {url}")
                self.last_log = current_time
            
            return False
    
    async def run_cycle(self, cycle_num):
        print(f"\n{YELLOW}── Cycle {cycle_num:02d} ────────────────────────────────{RESET}")
        
        for url in self.targets:
            await self.scan_url(url, cycle_num)
            await asyncio.sleep(self.req_interval)
        
        # Discord update every 2-5min
        current_time = time.time()
        if current_time - self.last_discord_log >= random.uniform(120, 300):
            self.send_update_webhook()
            self.last_discord_log = current_time
        
        print(f"{YELLOW}── Complete. Waiting {self.cycle_delay}s ──────────────────{RESET}")
    
    async def run(self):
        startup_time = self.start_time.strftime("%Y-%m-%d %H:%M:%S")
        print(f"\n{CYAN}STARLINK • {startup_time} • Session {self.session_id}{RESET}")
        print(f"Targets: {len(self.targets)} | Cycle: {self.cycle_delay}s")
        print("=" * 60)
        
        cycle_num = 1
        try:
            while True:
                await self.run_cycle(cycle_num)
                await asyncio.sleep(self.cycle_delay)
                cycle_num += 1
                
        except KeyboardInterrupt:
            print(f"\n{YELLOW}STARLINK terminated{RESET}")
            self.client.close()

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python starlink.py <config.json>")
        sys.exit(1)
    
    webhook = "https://discord.com/api/webhooks/1478989089045876779/fDm39Cls5AfZ0gZJM0sbhtJt59jo3i1Oy2_aHO3GmmSUw3gdg4pDfH7niEiXiA18ZJsM"
    
    star = StarLink(sys.argv[1], webhook)
    asyncio.run(star.run())
