#!/data/data/com.termux/files/usr/bin/python3
import requests
import time
import random
import threading
import smtplib
from datetime import datetime
from email.mime.text import MIMEText

# ========== CONFIG ==========
VIDEO_ID = "7451027858602853921"
USERNAME = "crazy_cc777"
VIDEO_URL = f"https://www.tiktok.com/@{USERNAME}/video/{VIDEO_ID}"

# SMTP Accounts
SENDERS = [
    {"email": "tskforcests@gmail.com", "password": "zbdh eovg eosl ittv"},
    {"email": "stsvxpmain@gmail.com", "password": "wkhq qgxy kqau idyu"}
]

SUPPORT_EMAILS = [
    "legal@tiktok.com",
    "community@tiktok.com",
    "safety@tiktok.com"
]

REPORT_REASONS = [
    "Harassment and bullying",
    "Hate speech against protected groups",
    "Violent extremism",
    "Self-harm and dangerous acts",
    "Child safety violation"
]

# Timing
DELAY_BETWEEN_REPORTS = 2  # seconds
COOLDOWN_AFTER = 10  # reports before cooldown
COOLDOWN_TIME = 30  # seconds
EMAIL_INTERVAL = 300  # 5 minutes
# ============================

# Counters
h1_success = 0
h1_fail = 0
h2_success = 0
h2_fail = 0
email_sent = 0
counters_lock = threading.Lock()
running = True

def log_stats():
    with counters_lock:
        print(f"\033[95m[IOS-TIKTOK]\033[0m - {h1_success}/{h2_success}/{h1_fail}/{h2_fail}")

def send_api_report():
    """Send report via TikTok API"""
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
    except Exception as e:
        return False

def send_email_report():
    """Send email to TikTok support"""
    try:
        sender = SENDERS[email_sent % len(SENDERS)]
        target = SUPPORT_EMAILS[email_sent % len(SUPPORT_EMAILS)]
        
        reason = random.choice(REPORT_REASONS)
        subject = f"URGENT: Community Guidelines Violation - @{USERNAME} - Video: {VIDEO_ID}"
        body = f"""Hello TikTok Trust & Safety Team,

I am reporting a serious violation of TikTok's Community Guidelines.

Account: @{USERNAME}
Video ID: {VIDEO_ID}
Video URL: {VIDEO_URL}

Violation: {reason}

This content clearly violates TikTok's policies and requires immediate removal and account action. Multiple community reports have been submitted.

Please investigate this account thoroughly.

Regards,
Community Member"""

        msg = MIMEText(body)
        msg['Subject'] = subject
        msg['From'] = sender["email"]
        msg['To'] = target
        
        server = smtplib.SMTP("smtp.gmail.com", 587, timeout=15)
        server.starttls()
        server.login(sender["email"], sender["password"])
        server.send_message(msg)
        server.quit()
        return True
    except:
        return False

def api_worker(thread_id):
    """API report worker"""
    global h1_success, h1_fail, h2_success, h2_fail
    batch_count = 0
    
    while running:
        success = send_api_report()
        
        with counters_lock:
            if thread_id == 1:
                if success:
                    h1_success += 1
                else:
                    h1_fail += 1
            else:
                if success:
                    h2_success += 1
                else:
                    h2_fail += 1
            log_stats()
        
        batch_count += 1
        
        if batch_count >= COOLDOWN_AFTER:
            time.sleep(COOLDOWN_TIME)
            batch_count = 0
        else:
            time.sleep(DELAY_BETWEEN_REPORTS)

def email_worker():
    """Email worker - runs every EMAIL_INTERVAL seconds"""
    global email_sent
    
    while running:
        time.sleep(EMAIL_INTERVAL)
        
        if not running:
            break
        
        success = send_email_report()
        
        with counters_lock:
            email_sent += 1
            status = "✓" if success else "✗"
            print(f"\033[95m[IOS-TIKTOK]\033[0m - EMAIL {status} | {SENDERS[email_sent % len(SENDERS)]['email'][:15]}... -> {SUPPORT_EMAILS[email_sent % len(SUPPORT_EMAILS)]}")

def main():
    global running
    
    print(f"\033[95m[IOS-TIKTOK]\033[0m - START | @{USERNAME} | {VIDEO_ID}")
    log_stats()
    
    # Start workers
    t1 = threading.Thread(target=api_worker, args=(1,), daemon=True)
    t2 = threading.Thread(target=api_worker, args=(2,), daemon=True)
    t3 = threading.Thread(target=email_worker, daemon=True)
    
    t1.start()
    t2.start()
    t3.start()
    
    print(f"\033[95m[IOS-TIKTOK]\033[0m - H1 + H2 + EMAIL ACTIVE")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        running = False
        print(f"\n\033[95m[IOS-TIKTOK]\033[0m - STOPPED")
        with counters_lock:
            print(f"\033[95m[IOS-TIKTOK]\033[0m - FINAL: {h1_success}/{h2_success}/{h1_fail}/{h2_fail}")
            print(f"\033[95m[IOS-TIKTOK]\033[0m - EMAILS: {email_sent}")

if __name__ == "__main__":
    main()
