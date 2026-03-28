#!/data/data/com.termux/files/usr/bin/python3
import requests
import time
import random
import smtplib
import threading
from datetime import datetime
from email.mime.text import MIMEText

# ========== CONFIG ==========
VIDEO_ID = "7451027858602853921"
USERNAME = "crazy_cc777"
VIDEO_URL = f"https://www.tiktok.com/@{USERNAME}/video/{VIDEO_ID}"

# SMTP Accounts (from SMTP-SIMPSON)
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

# Report reasons (max impact)
REPORT_REASONS = [
    "Harassment and bullying",
    "Hate speech against protected groups",
    "Violent extremism",
    "Self-harm and dangerous acts",
    "Child safety violation"
]

# Timing
DELAY_BETWEEN_REPORTS_MIN = 3
DELAY_BETWEEN_REPORTS_MAX = 7
COOLDOWN_AFTER_BATCH = 10
COOLDOWN_MIN = 45
COOLDOWN_MAX = 90
EMAIL_INTERVAL_MIN = 600
EMAIL_INTERVAL_MAX = 1200

# ============================

# Global counters
total_reports = 0
success_reports = 0
fail_reports = 0
reports_lock = threading.Lock()

def log(msg):
    """Main logging with [IOS-TIKTOK] tag only"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[IOS-TIKTOK] {timestamp} | {msg}")

def send_report():
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
    except:
        return False

def send_email_report(sender_email, sender_pass, target_email):
    """Send email to TikTok support"""
    try:
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
        msg['From'] = sender_email
        msg['To'] = target_email
        
        server = smtplib.SMTP("smtp.gmail.com", 587, timeout=15)
        server.starttls()
        server.login(sender_email, sender_pass)
        server.send_message(msg)
        server.quit()
        return True
    except:
        return False

def api_reporter_thread(thread_id):
    """Thread for sending API reports"""
    global total_reports, success_reports, fail_reports
    reports_in_batch = 0
    
    while True:
        result = send_report()
        
        with reports_lock:
            total_reports += 1
            if result:
                success_reports += 1
            else:
                fail_reports += 1
            current_total = total_reports
            current_success = success_reports
            current_fail = fail_reports
        
        log(f"[H{thread_id}] R{current_total} | S:{current_success} F:{current_fail}")
        
        reports_in_batch += 1
        
        if reports_in_batch >= COOLDOWN_AFTER_BATCH:
            cooldown = random.randint(COOLDOWN_MIN, COOLDOWN_MAX)
            log(f"[H{thread_id}] cool {cooldown}s")
            time.sleep(cooldown)
            reports_in_batch = 0
        else:
            delay = random.uniform(DELAY_BETWEEN_REPORTS_MIN, DELAY_BETWEEN_REPORTS_MAX)
            time.sleep(delay)

def email_reporter_thread():
    """Thread for sending email reports"""
    last_email_time = 0
    email_sender_index = 0
    email_target_index = 0
    
    while True:
        current_time = time.time()
        if current_time - last_email_time >= random.randint(EMAIL_INTERVAL_MIN, EMAIL_INTERVAL_MAX):
            sender = SENDERS[email_sender_index % len(SENDERS)]
            target = SUPPORT_EMAILS[email_target_index % len(SUPPORT_EMAILS)]
            
            result = send_email_report(sender["email"], sender["password"], target)
            status = "✓" if result else "✗"
            log(f"[E] {target} {status}")
            
            email_sender_index += 1
            email_target_index += 1
            last_email_time = current_time
        
        time.sleep(5)

def main():
    # Start 2 API reporter threads
    thread1 = threading.Thread(target=api_reporter_thread, args=(1,), daemon=True)
    thread2 = threading.Thread(target=api_reporter_thread, args=(2,), daemon=True)
    
    # Start email reporter thread
    email_thread = threading.Thread(target=email_reporter_thread, daemon=True)
    
    thread1.start()
    thread2.start()
    email_thread.start()
    
    log(f"START | @{USERNAME} | {VIDEO_ID} | H1+H2+E")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        with reports_lock:
            log(f"STOP | TOTAL:{total_reports} | OK:{success_reports} | FAIL:{fail_reports}")

if __name__ == "__main__":
    main()
