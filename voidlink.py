#!/usr/bin/env python3
"""
VOIDLINK - Stealth L7 Pinger
"""

import socket
import time
import random
import string
from datetime import datetime
from colorama import init, Fore, Style

init(autoreset=True)

# Custom orange (ANSI 256)
ORANGE = '\033[38;5;214m'
BRIGHT_WHITE = Style.BRIGHT + Fore.WHITE

class VoidLink:
    def __init__(self, target):
        self.target = target
        self.http_versions = ["HTTP/0.9", "HTTP/1.0", "HTTP/1.1"]
        self.last_log = 0
        self.start_time = datetime.now()
        
        # User agents
        self.agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
        ]
        
        # Unblockable referers
        self.refs = [
            "https://www.google.com/",
            "https://www.bing.com/",
            "https://duckduckgo.com/",
            "https://www.reddit.com/",
            "https://twitter.com/",
            "https://www.facebook.com/",
            "https://www.instagram.com/",
            "https://www.youtube.com/",
            "https://archive.org/",
            "https://en.wikipedia.org/"
        ]
        
        # Log file
        self.log_file = open("voidlink.txt", "a")
        
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
        headers = headers.lower()
        if 'cloudflare' in headers or 'cf-ray' in headers:
            return 'cloudflare'
        if 'akamai' in headers:
            return 'akamai'
        if 'sucuri' in headers:
            return 'sucuri'
        if 'incapsula' in headers:
            return 'incapsula'
        return None
    
    def write_log(self, text):
        """Write to log file with timestamp"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self.log_file.write(f"[{timestamp}] {text}\n")
        self.log_file.flush()
    
    def send_req(self):
        start = time.time()
        
        try:
            # Build request
            http_ver = random.choice(self.http_versions)
            rand_param = self.rand_str(8)
            
            request = f"POST /?{rand_param} HTTP/1.1\r\n"
            request += f"Host: {self.target}\r\n"
            request += f"User-Agent: {random.choice(self.agents)}\r\n"
            request += "Accept: text/html,application/xhtml+xml\r\n"
            request += "Accept-Language: en-US,en;q=0.9\r\n"
            request += "Cache-Control: no-cache\r\n"
            request += f"Referer: {random.choice(self.refs)}\r\n"
            request += "Connection: keep-alive\r\n"
            request += "\r\n"
            
            payload = f"GET /?{rand_param} {http_ver}\r\n"
            payload += f"Host: {self.target}\r\n"
            payload += "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)\r\n"
            payload += "Accept: text/html,application/xhtml+xml\r\n"
            payload += "Accept-Language: en-US,en;q=0.9\r\n"
            payload += "Cache-Control: no-cache\r\n"
            payload += "Connection: keep-alive\r\n\r\n"
            
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(10)
            sock.connect((self.target, 80))
            sock.send(request.encode() + payload.encode())
            
            resp = b''
            while True:
                try:
                    chunk = sock.recv(4096)
                    if not chunk:
                        break
                    resp += chunk
                    if len(resp) > 1024*1024:
                        break
                except:
                    break
            sock.close()
            
            resp_time = (time.time() - start) * 1000
            
            try:
                headers = resp.split(b'\r\n\r\n')[0].decode('utf-8', errors='ignore')
                status = int(headers.split()[1])
                all_headers = headers.lower()
            except:
                status = 0
                all_headers = ''
            
            cdn = self.detect_cdn(all_headers)
            if cdn:
                if cdn == 'cloudflare':
                    hit_color = ORANGE
                    hit_text = f"cdn-cloudflare"
                else:
                    hit_color = Fore.RED
                    hit_text = f"cdn-{cdn}"
            else:
                hit_color = BRIGHT_WHITE
                hit_text = f"org-{self.target}"
            
            if status < 400:
                result = f"{Fore.GREEN}pxn-s{Style.RESET_ALL}"
                log_result = "pxn-s"
            else:
                result = f"{Fore.RED}intercepted{Style.RESET_ALL}"
                log_result = "intercepted"
            
            current_time = time.time()
            if current_time - self.last_log >= 3:
                print(f"VOIDLINK ---> ({hit_color}{hit_text}{Style.RESET_ALL}) ↓")
                print(f"({resp_time:.2f}ms) ---> {status} ←")
                print(f"({self.format_size(len(resp))}) ---> {result}")
                print()
                self.last_log = current_time
                
                log_entry = f"{self.target} | {hit_text} | {status} | {resp_time:.2f}ms | {self.format_size(len(resp))} | {log_result}"
                self.write_log(log_entry)
            
            return True
            
        except Exception as e:
            resp_time = (time.time() - start) * 1000
            
            current_time = time.time()
            if current_time - self.last_log >= 3:
                print(f"VOIDLINK ---> ({BRIGHT_WHITE}org-{self.target}{Style.RESET_ALL}) ↓")
                print(f"({resp_time:.2f}ms) ---> 000 ←")
                print(f"(0B) ---> {Fore.RED}intercepted{Style.RESET_ALL}")
                print()
                self.last_log = current_time
                
                log_entry = f"{self.target} | org-{self.target} | 000 | {resp_time:.2f}ms | 0B | intercepted"
                self.write_log(log_entry)
            
            return False
    
    def run(self):
        startup_time = self.start_time.strftime("%Y-%m-%d %H:%M:%S")
        print(f"\n{Fore.CYAN}VOIDLINK ({startup_time}) - Target: {self.target} \\ logs to voidlink.txt{Style.RESET_ALL}")
        print("=" * 60)
        
        try:
            while True:
                self.send_req()
                time.sleep(random.uniform(2, 3))
        except KeyboardInterrupt:
            print(f"\n{Fore.YELLOW}Stopped{Style.RESET_ALL}")
            self.log_file.close()

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python voidlink.py <target>")
        sys.exit(1)
    
    v = VoidLink(sys.argv[1])
    v.run()
