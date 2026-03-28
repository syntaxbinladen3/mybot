#!/data/data/com.termux/files/usr/bin/python3
import requests
import random
import time

# ========== CONFIG ==========
VIDEO_URL = "https://www.tiktok.com/@hiddenheadline/video/7614694084996795670"

# Proxies
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

# Simple mobile user agents
USER_AGENTS = [
    "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/121.0.6167.164 Mobile Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0.6099.210 Mobile Safari/537.36"
]

DELAY = 3  # seconds between requests
# ============================

def pink_print(text):
    print(f"\033[95m{text}\033[0m")

def send_view():
    """Simple page request with session and proxy"""
    proxy = {"http": random.choice(PROXIES), "https": random.choice(PROXIES)}
    headers = {"User-Agent": random.choice(USER_AGENTS)}
    
    try:
        # Create session to keep cookies
        session = requests.Session()
        
        # First hit homepage to get session cookie
        session.get("https://www.tiktok.com", headers=headers, proxies=proxy, timeout=10)
        
        # Then request the video page
        response = session.get(VIDEO_URL, headers=headers, proxies=proxy, timeout=10)
        
        # Check if we got the page
        if response.status_code == 200:
            return True
        else:
            return False
            
    except Exception as e:
        return False

def main():
    success = 0
    fail = 0
    
    pink_print("=" * 40)
    pink_print("IOS-TVB v4.0 - Basic Page Views")
    pink_print("=" * 40)
    pink_print(f"Target: {VIDEO_URL}")
    pink_print(f"Proxies: {len(PROXIES)}")
    pink_print("=" * 40)
    
    input("Press Enter to start...")
    
    try:
        while True:
            if send_view():
                success += 1
            else:
                fail += 1
            
            pink_print(f"[IOS-TVB] - {success}/{fail}")
            time.sleep(DELAY)
            
    except KeyboardInterrupt:
        pink_print(f"\n[IOS-TVB] FINAL: {success}/{fail}")

if __name__ == "__main__":
    main()
