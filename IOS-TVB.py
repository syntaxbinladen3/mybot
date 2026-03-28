#!/data/data/com.termux/files/usr/bin/python3
import requests
import random
import time

# ========== CONFIG ==========
VIDEO_ID = "7614694084996795670"
USERNAME = "hiddenheadline"
VIDEO_URL = f"https://www.tiktok.com/@{USERNAME}/video/{VIDEO_ID}"
EMBED_URL = f"https://www.tiktok.com/embed/video/{VIDEO_ID}"

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

# User agents
USER_AGENTS = [
    "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0.6099.210 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 Chrome/119.0.6045.163 Mobile Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Version/16.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/121.0.6167.164 Mobile Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 15_6 like Mac OS X) AppleWebKit/605.1.15 Version/15.6 Mobile/15E148 Safari/604.1"
]

DELAY_BETWEEN = random.uniform(4, 8)   # seconds between view attempts
# ============================

def pink_print(text):
    print(f"\033[95m{text}\033[0m")

def get_session(proxy):
    """Get a fresh requests session with new cookies"""
    sess = requests.Session()
    sess.headers.update({"User-Agent": random.choice(USER_AGENTS)})
    try:
        # Visit homepage to get a session cookie
        sess.get("https://www.tiktok.com", proxies=proxy, timeout=10)
        return sess
    except:
        return None

def send_embed_view(proxy):
    """Method 1: Embed player (counts as view)"""
    try:
        headers = {"User-Agent": random.choice(USER_AGENTS)}
        r = requests.get(EMBED_URL, headers=headers, proxies=proxy, timeout=10)
        return r.status_code == 200
    except:
        return False

def send_direct_view(proxy):
    """Method 2: Direct video page with fresh session"""
    try:
        sess = get_session(proxy)
        if not sess:
            return False
        r = sess.get(VIDEO_URL, proxies=proxy, timeout=10)
        time.sleep(random.uniform(3, 6))  # simulate view time
        return r.status_code == 200
    except:
        return False

def send_hybrid_view(proxy):
    """Method 3: Embed + direct in one go (double hit)"""
    embed_ok = send_embed_view(proxy)
    time.sleep(random.uniform(1, 2))
    direct_ok = send_direct_view(proxy)
    return embed_ok or direct_ok

def main():
    success = 0
    fail = 0
    
    pink_print("=" * 50)
    pink_print("IOS-TVB v3.0 – Mixed TikTok View Bot")
    pink_print("=" * 50)
    pink_print(f"Target: @{USERNAME} | Video ID: {VIDEO_ID}")
    pink_print(f"Proxies loaded: {len(PROXIES)}")
    pink_print("Methods: Embed | Guest Session | Hybrid")
    pink_print("=" * 50)
    input("Press Enter to start...")
    
    try:
        while True:
            # Rotate proxy
            proxy = {"http": random.choice(PROXIES), "https": random.choice(PROXIES)}
            
            # Randomly choose which method to use
            method = random.choice(["embed", "direct", "hybrid"])
            
            if method == "embed":
                ok = send_embed_view(proxy)
            elif method == "direct":
                ok = send_direct_view(proxy)
            else:
                ok = send_hybrid_view(proxy)
            
            if ok:
                success += 1
            else:
                fail += 1
            
            pink_print(f"[IOS-TVB] - {success}/{fail}  [{method}]")
            
            # Delay between attempts
            delay = random.uniform(4, 8)
            time.sleep(delay)
            
    except KeyboardInterrupt:
        pink_print("\n" + "=" * 50)
        pink_print(f"[IOS-TVB] FINAL – {success} successful / {fail} failed")
        pink_print("=" * 50)

if __name__ == "__main__":
    main()
