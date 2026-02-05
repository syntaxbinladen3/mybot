#!/data/data/com.termux/files/usr/bin/python3
import smtplib
import time
import random
import threading
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

# ========== CONFIG ==========
SENDERS = [
    {
        "email": "tskforcests@gmail.com",
        "password": "zbdh eovg eosl ittv",
        "limit": 100,
        "sent": 0
    },
    {
        "email": "stsvxpmain@gmail.com",
        "password": "wkhq qgxy kqau idyu",
        "limit": 100,
        "sent": 0
    }
]

TARGET_EMAIL = "legenza.emilia@web.de"  # CHANGE THIS
SUBJECT = "CUSTOM2x-#1 V2 TEST"
MESSAGE = "msg-1x ratio"

TOTAL_LIMIT = 200                    # 100 per sender = 200 total
WAVE_SIZE = 50
DELAY_BETWEEN_EMAILS = 0.0005
DELAY_BETWEEN_WAVES_MIN = 120
DELAY_BETWEEN_WAVES_MAX = 180
MAX_WORKERS = 8
# ============================

def clear_terminal():
    print("\033[H\033[J", end="")
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[+] SK1-SSMTØS | [{timestamp}]")
    print("-" * 50)

def get_active_sender():
    """Get next sender that hasn't reached its limit"""
    for sender in SENDERS:
        if sender["sent"] < sender["limit"]:
            return sender
    return None

def send_single(sender_email, sender_password):
    """Send one email using specified sender"""
    try:
        server = smtplib.SMTP("smtp.gmail.com", 587, timeout=15)
        server.starttls()
        server.login(sender_email, sender_password)
        msg = f"Subject: {SUBJECT}\n\n{MESSAGE}"
        server.sendmail(sender_email, TARGET_EMAIL, msg)
        server.quit()
        return True
    except:
        return False

def execute_wave(wave_num):
    """Execute one wave, rotating senders"""
    successful = 0
    wave_emails = 0
    
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = []
        
        # Prepare emails for this wave
        while wave_emails < WAVE_SIZE:
            sender = get_active_sender()
            if not sender:
                break  # All senders reached limit
            
            # Submit email with this sender
            future = executor.submit(send_single, sender["email"], sender["password"])
            futures.append((future, sender))
            wave_emails += 1
            
            # Tiny delay between starting threads
            if wave_emails < WAVE_SIZE:
                time.sleep(DELAY_BETWEEN_EMAILS)
        
        # Collect results and update sender counts
        for future, sender in futures:
            if future.result():
                successful += 1
                sender["sent"] += 1
    
    return successful, wave_emails

def main():
    clear_terminal()
    
    total_sent = 0
    total_successful = 0
    wave_count = 0
    
    # Initialize sender stats
    for sender in SENDERS:
        sender["sent"] = 0
    
    try:
        while total_sent < TOTAL_LIMIT:
            wave_count += 1
            
            # Update terminal
            clear_terminal()
            print(f"[∞] SSMTØS — [≠] {total_sent} — [+] {total_successful}")
            
            # Check if any sender still has capacity
            if get_active_sender() is None:
                break
            
            # Send wave
            wave_successful, wave_emails = execute_wave(wave_count)
            total_sent += wave_emails
            total_successful += wave_successful
            
            # Update terminal
            clear_terminal()
            print(f"[∞] SSMTØS — [≠] {total_sent} — [+] {total_successful}")
            
            # Show sender stats
            print("-" * 30)
            for i, sender in enumerate(SENDERS, 1):
                used = sender["sent"]
                limit = sender["limit"]
                percent = (used / limit * 100) if limit > 0 else 0
                print(f"[{i}] {sender['email'][:15]}...: {used}/{limit} ({percent:.0f}%)")
            
            # Check if done
            if total_sent >= TOTAL_LIMIT or get_active_sender() is None:
                break
            
            # Cooldown
            cooldown = random.randint(DELAY_BETWEEN_WAVES_MIN, DELAY_BETWEEN_WAVES_MAX)
            remaining = cooldown
            
            while remaining > 0:
                if remaining % 30 == 0 or remaining <= 5:
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
        
        # Final sender stats
        print("SENDER STATISTICS:")
        for i, sender in enumerate(SENDERS, 1):
            used = sender["sent"]
            limit = sender["limit"]
            success_rate = "N/A"
            if used > 0:
                success_rate = f"{total_successful/total_sent*100:.1f}%"
            print(f"  [{i}] {sender['email']}: {used}/{limit}")
        
        print("-" * 50)
        print(f"✅ Complete | Total: {total_sent} | Successful: {total_successful}")
        print(f"   Success Rate: {total_successful/total_sent*100:.1f}%" if total_sent > 0 else "✅ Complete")
        
    except KeyboardInterrupt:
        clear_terminal()
        print(f"[+] SK1-SSMTØS | [STOPPED]")
        print("-" * 50)
        print(f"[∞] SSMTØS — [≠] {total_sent} — [+] {total_successful}")

if __name__ == "__main__":
    main()
