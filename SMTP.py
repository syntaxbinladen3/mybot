#!/data/data/com.termux/files/usr/bin/python3
import smtplib
import time
import random
from datetime import datetime

# ========== EASY CONFIG ==========
YOUR_EMAIL = "tskforcests@gmail.com"
APP_PASSWORD = "zbdh eovg eosl ittv"
TARGET_EMAIL = "sany.kosch@gmx.de"  # CHANGE THIS

SUBJECT = "TEST #1"
MESSAGE = "LEGAL BULK TEST"

DAILY_LIMIT = 100
BATCH_SIZE = 10
DELAY_BETWEEN_BATCHES_MIN = 31
DELAY_BETWEEN_BATCHES_MAX = 54
DELAY_BETWEEN_EMAILS_MIN = 3
DELAY_BETWEEN_EMAILS_MAX = 7
# ================================

LOG_FILE = "logs.txt"

def log(msg):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_entry = f"[{timestamp}] {msg}"
    
    with open(LOG_FILE, "a") as f:
        f.write(log_entry + "\n")
    
    print(log_entry)

def send_one(email_num):
    try:
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(YOUR_EMAIL, APP_PASSWORD)
        
        msg = f"Subject: {SUBJECT}\n\n{MESSAGE}"
        server.sendmail(YOUR_EMAIL, TARGET_EMAIL, msg)
        
        server.quit()
        return True
    except:
        return False

print("="*50)
print("SIMPLE EMAIL SENDER")
print(f"Target: {TARGET_EMAIL}")
print(f"Limit: {DAILY_LIMIT} emails")
print("="*50)
print("Starting in 3 seconds...")
time.sleep(3)

sent = 0
batch_count = 1

while sent < DAILY_LIMIT:
    batch_success = 0
    batch_size = min(BATCH_SIZE, DAILY_LIMIT - sent)
    
    print(f"\nBatch #{batch_count} ({batch_size} emails)")
    
    for i in range(batch_size):
        email_num = sent + i + 1
        print(f"Sending #{email_num}...", end=" ")
        
        if send_one(email_num):
            batch_success += 1
            print("✓")
        else:
            print("✗")
        
        if i < batch_size - 1:
            delay = random.randint(DELAY_BETWEEN_EMAILS_MIN, DELAY_BETWEEN_EMAILS_MAX)
            time.sleep(delay)
    
    sent += batch_size
    
    log(f"{batch_size} emails sent - successful: {batch_success}/{batch_size}")
    
    if sent >= DAILY_LIMIT:
        break
    
    batch_delay = random.randint(DELAY_BETWEEN_BATCHES_MIN, DELAY_BETWEEN_BATCHES_MAX)
    print(f"Waiting {batch_delay}s...")
    time.sleep(batch_delay)
    
    batch_count += 1

log(f"FINISHED: {sent} emails sent total")
print(f"\nDone! Sent {sent} emails to {TARGET_EMAIL}")
print(f"Logs: {LOG_FILE}")
