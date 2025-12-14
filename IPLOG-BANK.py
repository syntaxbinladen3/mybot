import time
import random
import os
import sys

def clear_terminal():
    """Clear the terminal screen"""
    os.system('cls' if os.name == 'nt' else 'clear')

def green_text(text):
    """Return text with green color formatting"""
    return f"\033[92m{text}\033[0m"

def print_green(text):
    """Print text in green color"""
    print(green_text(text))

def generate_balance():
    """Generate a random but realistic-looking balance"""
    patterns = [
        lambda: f"{random.randint(0, 5)}.{random.randint(0, 99):02d}€",
        lambda: f"{random.randint(0, 50)}.{random.randint(0, 99):02d}€",
        lambda: f"{random.randint(1, 9)}.{random.randint(0, 99):02d}€",
    ]
    
    if random.random() < 0.3:
        sign = random.choice(["+", "-"])
        amount = random.choice(patterns)()
        return f"{sign}{amount}"
    else:
        return random.choice(patterns)()

def continuous_logger():
    """Run the logger continuously"""
    clear_terminal()
    
    while True:
        print_green("\n" + "=" * 50)
        print_green("[INFO] card detected — COMMERZBANK | DE77 5454 0033 0734 0045 00")
        print_green("[INFO] Processing transaction...")
        
        time.sleep(5)
        clear_terminal()
        
        print_green("=" * 50)
        print_green("Transaction Log")
        print_green("=" * 50)
        
        num_entries = random.randint(5, 10)
        
        for i in range(num_entries):
            if random.random() < 0.2:
                timestamp = time.strftime("%H:%M:%S")
                print_green(f"[{timestamp}] cr-({generate_balance()})")
            else:
                print_green(f"cr-({generate_balance()})")
            
            time.sleep(random.uniform(0.1, 0.5))
        
        print_green("\n" + "=" * 50)
        print_green("[INFO] Transaction completed successfully")
        print_green(f"[INFO] Final balance: {random.randint(50, 200)}.{random.randint(0, 99):02d}€")
        print_green("=" * 50)
        
        print_green("\n" + "=" * 50)
        print_green("Waiting for next card...")
        print_green("Press Ctrl+C to exit")
        print_green("=" * 50)
        
        time.sleep(3)
        clear_terminal()

if __name__ == "__main__":
    try:
        continuous_logger()
    except KeyboardInterrupt:
        print_green("\n\n[INFO] Fake log generator stopped")
        sys.exit(0)
