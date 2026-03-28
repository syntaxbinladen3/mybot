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
COOLDOWN_AFTER_BATCH = 10  # reports before cooldown
COOLDOWN_MIN = 45
COOLDOWN_MAX = 90
EMAIL_INTERVAL_MIN = 600   # 10 minutes
EMAIL_INTERVAL_MAX = 1200  # 20 minutes

# ============================

def log_report(total, success, fail):
    """Log format: [IOS-TIKTOK] ---> [X] ---> [Y/Z]"""
    print(f"[IOS-TIKTOK] ---> [{total}] ---> [{success}/{fail}]")

def log_email(email, status, timestamp):
    """Log email: [EMAIL] legal@tiktok.com ✓ (12:34:56)"""
    symbol = "✓" if status else "✗"
    print(f"[EMAIL] {email} {symbol} ({timestamp})")

def send_report():
    """Send report via TikTok API (no cookie/login needed)"""
    try:
        # TikTok's report endpoint (public, no auth)
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
        
        # TikTok returns 200 even if report is queued
        if response.status_code == 200:
            return True
        else:
            return False
            
    except Exception:
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
        
    except Exception:
        return False

def main():
    print("=" * 50)
    print("IOS-TIKTOK v1.0")
    print("=" * 50)
    print(f"Target: @{USERNAME}")
    print(f"Video: {VIDEO_ID}")
    print(f"Reports: API + Email")
    print("=" * 50)
    
    input("Press Enter to start...")
    
    total_reports = 0
    success_reports = 0
    fail_reports = 0
    reports_in_batch = 0
    
    last_email_time = 0
    email_sender_index = 0
    email_target_index = 0
    
    print("\n[RUNNING] Press Ctrl+C to stop\n")
    
    try:
        while True:
            # Send API report
            result = send_report()
            total_reports += 1
            reports_in_batch += 1
            
            if result:
                success_reports += 1
            else:
                fail_reports += 1
            
            # Log after each report
            log_report(total_reports, success_reports, fail_reports)
            
            # Check if email needed (every 10-20 minutes)
            current_time = time.time()
            if current_time - last_email_time >= random.randint(EMAIL_INTERVAL_MIN, EMAIL_INTERVAL_MAX):
                # Send email
                sender = SENDERS[email_sender_index % len(SENDERS)]
                target = SUPPORT_EMAILS[email_target_index % len(SUPPORT_EMAILS)]
                
                email_success = send_email_report(sender["email"], sender["password"], target)
                timestamp = datetime.now().strftime("%H:%M:%S")
                log_email(target, email_success, timestamp)
                
                # Rotate indices
                email_sender_index += 1
                email_target_index += 1
                last_email_time = current_time
            
            # Cooldown after batch
            if reports_in_batch >= COOLDOWN_AFTER_BATCH:
                cooldown = random.randint(COOLDOWN_MIN, COOLDOWN_MAX)
                print(f"  [COOLDOWN] {cooldown}s...")
                time.sleep(cooldown)
                reports_in_batch = 0
            else:
                # Delay between reports
                delay = random.uniform(DELAY_BETWEEN_REPORTS_MIN, DELAY_BETWEEN_REPORTS_MAX)
                time.sleep(delay)
                
    except KeyboardInterrupt:
        print("\n\n" + "=" * 50)
        print("IOS-TIKTOK - COMPLETE")
        print("=" * 50)
        log_report(total_reports, success_reports, fail_reports)
        print("=" * 50)

if __name__ == "__main__":
    main()
