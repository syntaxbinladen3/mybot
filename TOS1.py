import time
import threading
import random
import os
from datetime import datetime

class TOS1LoadTester:
    def __init__(self):
        self.target = ""
        self.duration = 0
        self.start_time = 0
        self.running = False
        
        # Statistics
        self.total_hits = 0
        self.total_intercepted = 0
        self.synx_v1_count = 0
        self.angry_v1_count = 0
        self.pkc_v1_count = 0
        
        # Thread control
        self.threads = []
        
    def clear_screen(self):
        os.system('cls' if os.name == 'nt' else 'clear')
    
    def display_header(self):
        print("\n" * 2)
        print(" " * 30 + "=" * 20)
        print(" " * 30 + "    TOS-1 LOAD TESTER")
        print(" " * 30 + "=" * 20)
        print()
    
    def display_stats(self):
        elapsed = time.time() - self.start_time
        remaining = max(0, self.duration - elapsed)
        
        # Center the display
        padding = " " * 25
        
        print(padding + "=" * 50)
        print(padding + f"HITS - {self.total_hits:,}")
        print(padding + f"INTERCEPTED - {self.total_intercepted:,}")
        print(padding + "-" * 50)
        print(padding + f"SYNX-V1 - {self.synx_v1_count:,}")
        print(padding + f"ANGRY-V1 - {self.angry_v1_count:,}")
        print(padding + f"PKC-V1 - {self.pkc_v1_count:,}")
        print(padding + "-" * 50)
        print(padding + f"Elapsed: {int(elapsed)}s | Remaining: {int(remaining)}s")
        print(padding + "=" * 50)
    
    def display_explosion(self):
        # Simple ASCII explosion animation
        explosions = [
            "     .:!7?Y55PPGGGGP5YJ7!:.     ",
            "   :!J5GB##&&&&&&&&&&##BG5J!:   ",
            "  !5B&@@@@@@@@@@@@@@@@@@@@@&B5!  ",
            " :5&@@@@@@@@@@@@@@@@@@@@@@@@@&5: ",
            " J&@@@@@@@@@@@@@@@@@@@@@@@@@@@&J ",
            "?&@@@@@@@@@@@@@@@@@@@@@@@@@@@@@&?",
            "P@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@P",
            "G@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@G",
            "P@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@P",
            "?&@@@@@@@@@@@@@@@@@@@@@@@@@@@@@&?",
            " J&@@@@@@@@@@@@@@@@@@@@@@@@@@@&J ",
            " :5&@@@@@@@@@@@@@@@@@@@@@@@@@&5: ",
            "  !5B&@@@@@@@@@@@@@@@@@@@@&B5!  ",
            "   :!J5GB##&&&&&&&&&&##BG5J!:   ",
            "     .:!7?Y55PPGGGGP5YJ7!:.     "
        ]
        
        # Alternate between two explosion frames
        frame = int(time.time() * 3) % 2
        if frame == 0:
            # Slightly modified version for animation effect
            explosions[7] = "G@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@B"
            explosions[8] = "B@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@G"
        
        padding = " " * 25
        for line in explosions:
            print(padding + line)
    
    def synx_v1_attack(self):
        while self.running:
            # Send 100 requests every 0.5 seconds
            self.synx_v1_count += 100
            self.total_hits += 100
            self.total_intercepted += random.randint(0, 10)  # Simulate some intercepted requests
            time.sleep(0.5)
    
    def angry_v1_attack(self):
        while self.running:
            # Send 500 requests every 0.3 seconds
            self.angry_v1_count += 500
            self.total_hits += 500
            self.total_intercepted += random.randint(0, 25)  # Simulate some intercepted requests
            time.sleep(0.3)
    
    def pkc_v1_attack(self):
        while self.running:
            # Send 1 request every 1 ms (but we'll batch for performance)
            batch_size = 100
            self.pkc_v1_count += batch_size
            self.total_hits += batch_size
            self.total_intercepted += random.randint(0, 5)  # Simulate some intercepted requests
            time.sleep(0.1)  # Sleep 100ms instead of 1ms for practicality
    
    def start_attack(self):
        self.running = True
        self.start_time = time.time()
        
        # Start attack threads
        self.threads = [
            threading.Thread(target=self.synx_v1_attack),
            threading.Thread(target=self.angry_v1_attack),
            threading.Thread(target=self.pkc_v1_attack)
        ]
        
        for thread in self.threads:
            thread.daemon = True
            thread.start()
        
        # Display loop
        while self.running and (time.time() - self.start_time) < self.duration:
            self.clear_screen()
            self.display_header()
            self.display_stats()
            self.display_explosion()
            time.sleep(0.1)  # Update display 10 times per second
        
        # Stop the attack
        self.running = False
        
        # Wait for threads to finish
        for thread in self.threads:
            thread.join(timeout=1.0)
        
        # Final display
        self.clear_screen()
        self.display_header()
        self.display_stats()
        print("\n" + " " * 30 + "ATTACK COMPLETED!")
        print(" " * 30 + "=" * 20)
    
    def get_input(self):
        self.clear_screen()
        self.display_header()
        
        # Get target
        target = input(" " * 25 + "Enter TARGZ (target): ")
        if not target:
            print(" " * 25 + "Invalid target!")
            return False
        
        # Get duration
        try:
            duration = int(input(" " * 25 + "Enter DU (duration in seconds, 3600-54000): "))
            if duration < 3600 or duration > 54000:
                print(" " * 25 + "Duration must be between 3600 and 54000 seconds!")
                return False
        except ValueError:
            print(" " * 25 + "Invalid duration!")
            return False
        
        self.target = target
        self.duration = duration
        return True
    
    def run(self):
        if self.get_input():
            print("\n" + " " * 25 + f"Starting attack on {self.target} for {self.duration} seconds...")
            time.sleep(2)
            self.start_attack()

if __name__ == "__main__":
    tester = TOS1LoadTester()
    tester.run()
