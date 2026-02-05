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

SUBJECT = "SSMTOS M TEST #1"           # Normal subject
MESSAGE = "null"     # Normal message

TOTAL_LIMIT = 100
WAVE_SIZE = 50
DELAY_BETWEEN_EMAILS = 0.0005
DELAY_BETWEEN_WAVES_MIN = 120
DELAY_BETWEEN_WAVES_MAX = 180
MAX_WORKERS = 8                    # Even more conservative
# ============================

def clear_terminal():
    """Clear terminal and show header"""
    print("\033[H\033[J", end="")
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[+] SK1-SSMTØS | [{timestamp}]")
    print("-" * 50)

def send_single():
    """Send one email - SIMPLE VERSION"""
    try:
        server = smtplib.SMTP("smtp.gmail.com", 587, timeout=15)
        server.starttls()
        server.login(YOUR_EMAIL, APP_PASSWORD)
        
        # PLAIN MESSAGE - NO TRACKING NUMBERS
        msg = f"Subject: {SUBJECT}\n\n{MESSAGE}"
        server.sendmail(YOUR_EMAIL, TARGET_EMAIL, msg)
        server.quit()
        return True
        
    except Exception as e:
        # Don't print errors to terminal
        return False

def execute_wave(wave_num, emails_in_wave):
    """Execute one wave"""
    successful = 0
    
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = []
        
        # Start all emails in wave
        for i in range(emails_in_wave):
            future = executor.submit(send_single)
            futures.append(future)
            
            # Tiny delay between starting threads
            if i < emails_in_wave - 1:
                time.sleep(DELAY_BETWEEN_EMAILS)
        
        # Collect results silently
        for future in as_completed(futures):
            if future.result():
                successful += 1
    
    return successful

def main():
    clear_terminal()
    
    total_sent = 0
    total_successful = 0
    wave_count = 0
    
    try:
        while total_sent < TOTAL_LIMIT:
            wave_count += 1
            emails_in_wave = min(WAVE_SIZE, TOTAL_LIMIT - total_sent)
            
            # Update terminal
            clear_terminal()
            print(f"[∞] SSMTØS — [≠] {total_sent} — [+] {total_successful}")
            
            # Send wave
            wave_successful = execute_wave(wave_count, emails_in_wave)
            
            total_sent += emails_in_wave
            total_successful += wave_successful
            
            # Update terminal
            clear_terminal()
            print(f"[∞] SSMTØS — [≠] {total_sent} — [+] {total_successful}")
            
            # Check if done
            if total_sent >= TOTAL_LIMIT:
                break
            
            # Cooldown
            cooldown = random.randint(DELAY_BETWEEN_WAVES_MIN, DELAY_BETWEEN_WAVES_MAX)
            remaining = cooldown
            
            while remaining > 0:
                if remaining % 30 == 0 or remaining <= 5:
                    # Update timestamp only
                    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    mins = remaining // 60
                    secs = remaining % 60
                    print(f"\033[1;1H[+] SK1-SSMTØS | [{timestamp}]")
                    print(f"\033[2;1H[∞] SSMTØS — [≠] {total_sent} — [+] {total_successful} | Next: {mins:02d}:{secs:02d}")
                time.sleep(1)
                remaining -= 1
        
        # Final display
        clear_terminal()
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[+] SK1-SSMTØS | [{timestamp}]")
        print("-" * 50)
        print(f"[∞] SSMTØS — [≠] {total_sent} — [+] {total_successful}")
        print("-" * 50)
        print(f"✅ Complete | Rate: {total_successful}/{total_sent}")
        
    except KeyboardInterrupt:
        clear_terminal()
        print(f"[+] SK1-SSMTØS | [STOPPED]")
        print("-" * 50)
        print(f"[∞] SSMTØS — [≠] {total_sent} — [+] {total_successful}")

if __name__ == "__main__":
    main()
