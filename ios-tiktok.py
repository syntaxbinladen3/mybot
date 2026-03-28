#!/data/data/com.termux/files/usr/bin/python3
import requests
import time
import random
import smtplib
from datetime import datetime
from email.mime.text import MIMEText
import uuid

# ========== CONFIG ==========
VIDEO_ID = "7451027858602853921"
USERNAME = "crazy_cc777"
VIDEO_URL = f"https://www.tiktok.com/@{USERNAME}/video/{VIDEO_ID}"
PROFILE_URL = f"https://www.tiktok.com/@{USERNAME}"

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

# Report reasons for different actions
VIDEO_REASONS = [
    "Harassment and bullying",
    "Hate speech",
    "Violent extremism",
    "Self-harm and dangerous acts",
    "Child safety violation"
]

ACCOUNT_REASONS = [
    "Impersonation",
    "Spam or misleading",
    "Harassment and cyberbullying",
    "Hate speech"
]

# Timing (Erratic Human Behavior)
CYCLE_LENGTH = 3  # Number of reports in a burst
BURST_DELAY_MIN = 2
BURST_DELAY_MAX = 5
PAUSE_AFTER_CYCLE_MIN = 45
PAUSE_AFTER_CYCLE_MAX = 120
LONG_PAUSE_EVERY = 5  # Every X cycles, take a longer break
LONG_PAUSE_MIN = 180   # 3 minutes
LONG_PAUSE_MAX = 300   # 5 minutes

EMAIL_INTERVAL_MIN = 7200   # 2 hours minimum
EMAIL_INTERVAL_MAX = 14400  # 4 hours maximum

# ============================

# --- Helper Functions ---
def get_random_headers():
    """Generate random headers to avoid fingerprinting"""
    user_agents = [
        "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.5993.80 Mobile Safari/537.36",
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    ]
    return {
        "User-Agent": random.choice(user_agents),
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120"',
        "Sec-Ch-Ua-Mobile": "?1",
        "Sec-Ch-Ua-Platform": '"Android"',
        "Origin": "https://www.tiktok.com",
        "Referer": "https://www.tiktok.com/",
    }

def log_report(total, success, fail):
    """Log format: [IOS-TIKTOK] ---> [X] ---> [Y/Z]"""
    print(f"[IOS-TIKTOK] ---> [{total}] ---> [{success}/{fail}]")

def send_video_report():
    """Report the video via API"""
    try:
        url = "https://www.tiktok.com/api/report/"
        headers = get_random_headers()
        reason = random.choice(VIDEO_REASONS)
        data = {
            "video_id": VIDEO_ID,
            "reason": reason,
            "type": "video",
            "source": "report_flow"
        }
        r = requests.post(url, headers=headers, data=data, timeout=10)
        return r.status_code == 200
    except:
        return False

def send_account_report():
    """Report the user account via API"""
    try:
        url = "https://www.tiktok.com/api/report/"
        headers = get_random_headers()
        reason = random.choice(ACCOUNT_REASONS)
        data = {
            "user_id": USERNAME,
            "reason": reason,
            "type": "user",
            "source": "profile_report"
        }
        r = requests.post(url, headers=headers, data=data, timeout=10)
        return r.status_code == 200
    except:
        return False

def send_abuse_form():
    """Submit via a secondary abuse channel (e.g., a public form endpoint)"""
    try:
        # This is a public-facing form that doesn't require login, used for general abuse reports.
        url = "https://www.tiktok.com/legal/report/feedback"
        headers = get_random_headers()
        payload = {
            "video_id": VIDEO_ID,
            "report_type": "user_abuse",
            "description": f"User @{USERNAME} is repeatedly violating community guidelines. The video at {VIDEO_URL} contains {random.choice(VIDEO_REASONS).lower()}.",
            "email": random.choice(SENDERS)["email"]
        }
        r = requests.post(url, headers=headers, data=payload, timeout=10)
        return r.status_code == 200 or r.status_code == 302
    except:
        return False

def send_email_report():
    """Send an advanced, escalating complaint email"""
    try:
        sender = random.choice(SENDERS)
        target = random.choice(SUPPORT_EMAILS)
        case_id = str(uuid.uuid4())[:8]
        
        subject = f"Case #{case_id}: URGENT - Repeated Violations - @{USERNAME}"
        body = f"""Hello TikTok Trust & Safety Team,

I am escalating a report regarding user @{USERNAME} (Video: {VIDEO_ID}). 

This is not an isolated incident. The user's content, specifically the video at {VIDEO_URL}, continues to violate your Community Guidelines despite prior reports.

Violation: {random.choice(VIDEO_REASONS)}.

I have submitted multiple reports through the in-app system, and the content remains active. I request a thorough investigation of this account and immediate action.

I expect a confirmation of receipt and an update on the action taken.

Regards,
A Concerned Community Member
Case Reference: {case_id}"""

        msg = MIMEText(body)
        msg['Subject'] = subject
        msg['From'] = sender['email']
        msg['To'] = target
        
        server = smtplib.SMTP("smtp.gmail.com", 587, timeout=15)
        server.starttls()
        server.login(sender['email'], sender['password'])
        server.send_message(msg)
        server.quit()
        return True
    except:
        return False

# --- Main Execution ---
def main():
    # Clean start - no startup logs
    total = 0
    success = 0
    fail = 0
    cycle_count = 0
    last_email_time = 0
    
    try:
        while True:
            # Perform a cycle of reports
            for _ in range(CYCLE_LENGTH):
                # Randomly choose attack type for unpredictability
                attack_type = random.choice(['video', 'account', 'abuse'])
                if attack_type == 'video':
                    result = send_video_report()
                elif attack_type == 'account':
                    result = send_account_report()
                else:
                    result = send_abuse_form()
                
                total += 1
                if result:
                    success += 1
                else:
                    fail += 1
                
                # Log after each report
                log_report(total, success, fail)
                
                # Short burst delay
                if _ < CYCLE_LENGTH - 1:
                    time.sleep(random.uniform(BURST_DELAY_MIN, BURST_DELAY_MAX))
            
            cycle_count += 1
            
            # Take a medium pause
            pause_duration = random.randint(PAUSE_AFTER_CYCLE_MIN, PAUSE_AFTER_CYCLE_MAX)
            time.sleep(pause_duration)
            
            # Long pause every X cycles
            if cycle_count % LONG_PAUSE_EVERY == 0:
                long_pause = random.randint(LONG_PAUSE_MIN, LONG_PAUSE_MAX)
                time.sleep(long_pause)
            
            # Send email at a much slower, random interval
            current_time = time.time()
            if current_time - last_email_time >= random.randint(EMAIL_INTERVAL_MIN, EMAIL_INTERVAL_MAX):
                send_email_report()
                last_email_time = current_time
                
    except KeyboardInterrupt:
        # Final summary with the same clean log format
        print(f"\n[IOS-TIKTOK] ---> [{total}] ---> [{success}/{fail}]")

if __name__ == "__main__":
    main()
