import os
import sys
import time
import ipaddress
import subprocess
from datetime import datetime

if len(sys.argv) != 3:
    print("Usage: python3 ZX-SN-PING.py <subnet> <duration_in_seconds>")
    sys.exit(1)

subnet = sys.argv[1]
duration = int(sys.argv[2])

try:
    net = ipaddress.ip_network(subnet, strict=False)
except ValueError:
    print("Invalid subnet.")
    sys.exit(1)

ip_list = [str(ip) for ip in net.hosts()]
total_ips = len(ip_list)
start_time = time.time()

online = set()
offline = set()
total_pings = 0

def clear():
    os.system('clear' if os.name == 'posix' else 'cls')

def ping(ip):
    try:
        output = subprocess.check_output(
            ["ping", "-c", "1", "-W", "1", ip],
            stderr=subprocess.DEVNULL,
            universal_newlines=True
        )
        return "bytes from" in output
    except subprocess.CalledProcessError:
        return False

while time.time() - start_time < duration:
    current_online = set()
    for ip in ip_list:
        is_up = ping(ip)
        total_pings += 1
        if is_up:
            current_online.add(ip)
        else:
            offline.add(ip)

    online = current_online
    offline = set(ip_list) - online
    running_time = int(time.time() - start_time)

    clear()
    print("ZX-SN-PING | T.ME/STSVKINGDOM")
    print("--------------------------------------------------")
    print(f"pings:      {total_pings}")
    print(f"bytes:      64")
    print(f"total ips:  {total_ips}")
    print(f"online:     {len(online)}/{total_ips}")
    print(f"offline:    {len(offline)}")
    print(f"running:    {running_time} sec")
    print("--------------------------------------------------")
    print("TEAM S.T.S")
    print("t.me/fbigovv")
    print("t.me/stsgov")
    print("t.me/stsvkingdom")
    print("t.me/tspvkingdom")

    time.sleep(1)
