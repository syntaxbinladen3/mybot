#!/data/data/com.termux/files/usr/bin/python3
import smtplib
import time
import random
from datetime import datetime

# ========== EASY CONFIG ==========
YOUR_EMAIL = "tskforcests@gmail.com"
APP_PASSWORD = "zbdh eovg eosl ittv"
TARGET_EMAIL = "sany.kosch@gmx.de"  # CHANGE THIS

SUBJECT = "TEST INFO #2"
MESSAGE = "BULK TEST #2"

DAILY_LIMIT = 100
BATCH_SIZE = 50                     # CHANGED: 50 per batch
DELAY_BETWEEN_BATCHES_MIN = 22     # CHANGED: 22s timeout
DELAY_BETWEEN_BATCHES_MAX = 23     # CHANGED: 23s timeout
DELAY_BETWEEN_EMAILS_MIN = 0.012   # CHANGED: 12ms minimum
DELAY_BETWEEN_EMAILS_MAX = 2       # CHANGED: 2s maximum
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
    except Exception as e:
        print(f"Error: {str(e)[:50]}")  # Show short error
        return False

print("="*50)
print("FAST BATCH EMAIL SENDER")
print(f"Target: {TARGET_EMAIL}")
print(f"Limit: {DAILY_LIMIT} emails")
print(f"Batch: {BATCH_SIZE} emails")
print("="*50)
print("Starting NOW...")

sent = 0
batch_count = 1
total_success = 0

while sent < DAILY_LIMIT:
    batch_success = 0
    batch_size = min(BATCH_SIZE, DAILY_LIMIT - sent)
    
    print(f"\n{'='*40}")
    print(f"BATCH #{batch_count} ({batch_size} emails)")
    print(f"{'='*40}")
    
    for i in range(batch_size):
        email_num = sent + i + 1
        print(f"#{email_num:3d} → ", end="")
        
        if send_one(email_num):
            batch_success += 1
            total_success += 1
            print("✓")
        else:
            print("✗")
        
        # Random delay between emails (12ms to 2s)
        if i < batch_size - 1:
            delay = random.uniform(DELAY_BETWEEN_EMAILS_MIN, DELAY_BETWEEN_EMAILS_MAX)
            time.sleep(delay)
    
    sent += batch_size
    
    # Log batch results
    log(f"Batch #{batch_count}: {batch_size} sent - {batch_success} successful")
    
    # Check if done
    if sent >= DAILY_LIMIT:
        break
    
    # Timeout between batches (22-23s)
    batch_delay = random.randint(DELAY_BETWEEN_BATCHES_MIN, DELAY_BETWEEN_BATCHES_MAX)
    print(f"\n⏳ Timeout: {batch_delay}s before next batch...")
    
    # Simple countdown
    for sec in range(batch_delay, 0, -1):
        if sec % 5 == 0 or sec <= 3:
            print(f"{sec}s", end=" ", flush=True)
        time.sleep(1)
    print("GO!")
    
    batch_count += 1

# Final log and summary
log(f"COMPLETED: {sent} total | {total_success} successful")
print(f"\n{'='*50}")
print(f"🎯 CAMPAIGN COMPLETE")
print(f"{'='*50}")
print(f"Batches: {batch_count-1}")
print(f"Total sent: {sent}")
print(f"Successful: {total_success}")
print(f"Failed: {sent - total_success}")
print(f"Log file: {LOG_FILE}")
print(f"{'='*50}")
