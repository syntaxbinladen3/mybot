#!/data/data/com.termux/files/usr/bin/python3
import requests
import time
import random
import threading
from datetime import datetime

# ========== CONFIG ==========
VIDEO_ID = "7451027858602853921"
USERNAME = "crazy_cc777"

REPORT_REASONS = [
    "Harassment and bullying",
    "Hate speech against protected groups",
    "Violent extremism",
    "Self-harm and dangerous acts",
    "Child safety violation"
]

DELAY_BETWEEN_REPORTS_MIN = 3
DELAY_BETWEEN_REPORTS_MAX = 7
COOLDOWN_AFTER_BATCH = 10
COOLDOWN_MIN = 45
COOLDOWN_MAX = 90
# ============================

# Counters
h1_success = 0
h1_fail = 0
h2_success = 0
h2_fail = 0
counters_lock = threading.Lock()
running = True

def log_stats():
    with counters_lock:
        print(f"\033[95m[IOS-TIKTOK]\033[0m - {h1_success}/{h2_success}/{h1_fail}/{h2_fail}")

def send_report():
    try:
        url = "https://www.tiktok.com/api/report/"
        headers = {
            "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36",
            "Content-Type": "application/x-www-form-urlencoded",
            "Referer": "https://www.tiktok.com/"
        }
        reason = random.choice(REPORT_REASONS)
        data = {
            "video_id": VIDEO_ID,
            "reason": reason,
            "type": "video",
            "source": "report_flow"
        }
        response = requests.post(url, headers=headers, data=data, timeout=10)
        return response.status_code == 200
    except:
        return False

def api_reporter_thread(thread_id):
    global h1_success, h1_fail, h2_success, h2_fail
    reports_in_batch = 0
    
    while running:
        result = send_report()
        
        with counters_lock:
            if thread_id == 1:
                if result:
                    h1_success += 1
                else:
                    h1_fail += 1
            else:
                if result:
                    h2_success += 1
                else:
                    h2_fail += 1
            log_stats()
        
        reports_in_batch += 1
        
        if reports_in_batch >= COOLDOWN_AFTER_BATCH:
            cooldown = random.randint(COOLDOWN_MIN, COOLDOWN_MAX)
            time.sleep(cooldown)
            reports_in_batch = 0
        else:
            delay = random.uniform(DELAY_BETWEEN_REPORTS_MIN, DELAY_BETWEEN_REPORTS_MAX)
            time.sleep(delay)

def main():
    global running
    
    thread1 = threading.Thread(target=api_reporter_thread, args=(1,), daemon=True)
    thread2 = threading.Thread(target=api_reporter_thread, args=(2,), daemon=True)
    
    thread1.start()
    thread2.start()
    
    print(f"\033[95m[IOS-TIKTOK]\033[0m - START | @{USERNAME} | {VIDEO_ID}")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        running = False
        print(f"\n\033[95m[IOS-TIKTOK]\033[0m - STOP")
        with counters_lock:
            print(f"\033[95m[IOS-TIKTOK]\033[0m - {h1_success}/{h2_success}/{h1_fail}/{h2_fail}")

if __name__ == "__main__":
    main()
