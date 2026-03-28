#!/data/data/com.termux/files/usr/bin/python3
import requests
import random
import time
from datetime import datetime

# ========== CONFIG ==========
VIDEO_URL = "https://www.tiktok.com/@username/video/123456789"  # CHANGE THIS

# Proxies (HTTP)
PROXIES = [
    "http://31.59.20.176:6754",
    "http://23.95.150.145:6114",
    "http://198.23.239.134:6540",
    "http://45.38.107.97:6014",
    "http://107.172.163.27:6543",
    "http://198.105.121.200:6462",
    "http://216.10.27.159:6837",
    "http://142.111.67.146:5611",
    "http://191.96.254.138:6185",
    "http://31.58.9.4:6077"
]

# User Agents
USER_AGENTS = [
    "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.210 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.6045.163 Mobile Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.164 Mobile Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 15_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.5993.111 Mobile Safari/537.36"
]

DELAY_BETWEEN_VIEWS_MIN = 2
DELAY_BETWEEN_VIEWS_MAX = 5
# ============================

def pink_print(text):
    print(f"\033[95m{text}\033[0m")

def get_random_proxy():
    return {"http": random.choice(PROXIES), "https": random.choice(PROXIES)}

def send_view(proxy):
    """Send one view request"""
    try:
        headers = {
            "User-Agent": random.choice(USER_AGENTS),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1"
        }
        
        # First request to get video page (counts as view)
        response = requests.get(
            VIDEO_URL, 
            headers=headers, 
            proxies=proxy,
            timeout=10,
            allow_redirects=True
        )
        
        # Simulate view time (3-15 seconds)
        view_time = random.uniform(3, 15)
        time.sleep(view_time)
        
        # Second request simulates engagement (scroll)
        if random.random() > 0.3:
            requests.get(VIDEO_URL, headers=headers, proxies=proxy, timeout=5)
        
        return response.status_code == 200
        
    except Exception:
        return False

def main():
    print("\033[95m" + "=" * 50 + "\033[0m")
    print("\033[95mIOS-TVB v1.0 - TikTok View Bot\033[0m")
    print("\033[95m" + "=" * 50 + "\033[0m")
    print(f"Target: {VIDEO_URL}")
    print(f"Proxies: {len(PROXIES)}")
    print("\033[95m" + "=" * 50 + "\033[0m")
    
    input("Press Enter to start...")
    
    success = 0
    fail = 0
    proxy_index = 0
    
    try:
        while True:
            # Rotate proxies
            proxy = get_random_proxy()
            proxy_index = (proxy_index + 1) % len(PROXIES)
            
            # Send view
            if send_view(proxy):
                success += 1
            else:
                fail += 1
            
            # Log
            pink_print(f"[IOS-TVB] - {success}/{fail}")
            
            # Random delay
            delay = random.uniform(DELAY_BETWEEN_VIEWS_MIN, DELAY_BETWEEN_VIEWS_MAX)
            time.sleep(delay)
            
    except KeyboardInterrupt:
        print("\n")
        pink_print("=" * 50)
        pink_print(f"[IOS-TVB] - FINAL: {success}/{fail}")
        pink_print("=" * 50)

if __name__ == "__main__":
    main()
