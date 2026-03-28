#!/data/data/com.termux/files/usr/bin/python3
import requests
import time
import random
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

# TikTok Support Emails
SUPPORT_EMAILS = [
    "legal@tiktok.com",
    "community@tiktok.com",
    "safety@tiktok.com"
]

# Report reasons
REPORT_REASONS = [
    "Harassment and bullying",
    "Hate speech against protected groups",
    "Violent extremism",
    "Self-harm and dangerous acts",
    "Child safety violation"
]

# Timing - FASTER
DELAY_BETWEEN_REPORTS = 0.5          # 0.5 seconds between reports
COOLDOWN_AFTER_BATCH = 20            # reports before cooldown
COOLDOWN_SECONDS = 30                # 30 seconds cooldown

EMAIL_INTERVAL = 300                 # 5 minutes between emails
# ============================

def pink_print(text):
    """Print in pink"""
    print(f"\033[95m{text}\033[0m")

def send_report_h1():
    """Attack H1 - API Report"""
    try:
        url = "https://www.tiktok.com/api/report/"
        headers = {
            "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36",
            "Content-Type": "application/x-www-form-urlencoded"
        }
        data = {
            "video_id": VIDEO_ID,
            "reason": random.choice(REPORT_REASONS),
            "type": "video"
        }
        response = requests.post(url, headers=headers, data=data, timeout=5)
        return response.status_code == 200
    except:
        return False

def send_report_h2():
    """Attack H2 - Alternative API Endpoint"""
    try:
        url = "https://www.tiktok.com/api/report/video/"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Content-Type": "application/json"
        }
        data = {
            "video_id": VIDEO_ID,
            "reason": random.choice(REPORT_REASONS),
            "reporter_lang": "en"
        }
        response = requests.post(url, headers=headers, json=data, timeout=5)
        return response.status_code == 200 or response.status_code == 204
    except:
        return False

def send_email_report():
    """Send email to TikTok support"""
    try:
        sender = random.choice(SENDERS)
        target = random.choice(SUPPORT_EMAILS)
        reason = random.choice(REPORT_REASONS)
        
        subject = f"URGENT: Violation - @{USERNAME} - {VIDEO_ID}"
        body = f"""Hello TikTok Team,

Report: @{USERNAME}
Video: {VIDEO_URL}
Violation: {reason}

This content violates Community Guidelines.
Please investigate immediately.

Regards,
Community Member"""

        msg = MIMEText(body)
        msg['Subject'] = subject
        msg['From'] = sender["email"]
        msg['To'] = target
        
        server = smtplib.SMTP("smtp.gmail.com", 587, timeout=10)
        server.starttls()
        server.login(sender["email"], sender["password"])
        server.send_message(msg)
        server.quit()
        return True
    except:
        return False

def main():
    h1_success = 0
    h1_fail = 0
    h2_success = 0
    h2_fail = 0
    
    last_email_time = 0
    reports_this_batch = 0
    
    while True:
        try:
            # Attack H1
            if send_report_h1():
                h1_success += 1
            else:
                h1_fail += 1
            
            # Attack H2 (immediately after)
            if send_report_h2():
                h2_success += 1
            else:
                h2_fail += 1
            
            # Update logging
            pink_print(f"[IOS-TIKTOK] - {h1_success}/{h2_success}/{h1_fail}/{h2_fail}")
            
            reports_this_batch += 2  # Two reports per cycle
            
            # Email attack
            current_time = time.time()
            if current_time - last_email_time >= EMAIL_INTERVAL:
                if send_email_report():
                    pink_print(f"[IOS-TIKTOK] - {h1_success}/{h2_success}/{h1_fail}/{h2_fail} [E]")
                last_email_time = current_time
            
            # Cooldown after batch
            if reports_this_batch >= COOLDOWN_AFTER_BATCH:
                time.sleep(COOLDOWN_SECONDS)
                reports_this_batch = 0
            else:
                time.sleep(DELAY_BETWEEN_REPORTS)
                
        except KeyboardInterrupt:
            print("\n")
            pink_print(f"[IOS-TIKTOK] - FINAL: {h1_success}/{h2_success}/{h1_fail}/{h2_fail}")
            break

if __name__ == "__main__":
    main()
