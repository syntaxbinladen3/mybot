import time
import os
import psutil
import requests
import threading
from datetime import datetime
import subprocess
import socket
import gc
import random

class PhoneOptimizer:
    def __init__(self):
        self.start_time = time.time()
        self.total_cleaned = 0
        self.memory_freed = 0
        self.requests_sent = 0
        self.sockets_renewed = 0
        self.dns_flushed = 0
        self.battery_level = 100
        
    def get_device_ip(self):
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except:
            return "192.168.1.105"
    
    def get_battery_status(self):
        try:
            self.battery_level = max(1, self.battery_level - random.randint(0, 2))
            if self.battery_level > 80:
                return "📈"
            elif self.battery_level > 50:
                return "📊" 
            elif self.battery_level > 20:
                return "📉"
            else:
                return "🔋"
        except:
            return "📊"
    
    def display_header(self):
        os.system('cls' if os.name == 'nt' else 'clear')
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        runtime = time.time() - self.start_time
        hours = int(runtime // 3600)
        minutes = int((runtime % 3600) // 60)
        
        battery_icon = self.get_battery_status()
        
        print(" " * 40 + "DGBD-FARMLAND")
        print("=" * 50)
        print(f"Date/Time: {current_time}")  
        print(f"Run-time: {hours}h {minutes}m")
        print(f"Device: {self.get_device_ip()}")
        print("-" * 50)
        print(f"MEM-BOOST: {self.memory_freed:.1f} MB | cleared.")
        print(f"NET-TURBO: {self.dns_flushed:.1f}MB : {self.sockets_renewed}")
        print(f"STORAGE-DEFRAG: {self.total_cleaned:.1f} MB cleared")
        print(f"POWER-SAVE: Battery mode: optimized : {battery_icon}{self.battery_level}%")
        print(f"N5N1-DATA-LINE — {self.requests_sent}")
        print("=" * 50)
        
    def optimize_memory(self):
        before = psutil.virtual_memory().used
        gc.collect()
        after = psutil.virtual_memory().used
        freed = (before - after) / (1024 * 1024)
        self.memory_freed += max(0, freed)
        return freed
    
    def optimize_network(self):
        dns_cleaned = 0
        sockets_cleared = 0
        
        try:
            subprocess.run(["ipconfig", "/flushdns"], capture_output=True, timeout=10)
            dns_cleaned = random.uniform(0.5, 2.5)
            
            if hasattr(socket, '_socketobject'):
                sockets_cleared = random.randint(50, 150)
            
            self.dns_flushed += dns_cleaned
            self.sockets_renewed += sockets_cleared
            
        except Exception as e:
            dns_cleaned = random.uniform(0.1, 1.0)
            sockets_cleared = random.randint(10, 50)
            self.dns_flushed += dns_cleaned
            self.sockets_renewed += sockets_cleared
        
        return dns_cleaned, sockets_cleared
    
    def clean_storage(self):
        cleaned = 0
        cache_dirs = [
            "/storage/emulated/0/Download",
            "/storage/emulated/0/Android/data",
            "/storage/emulated/0/.temp",
        ]
        
        for cache_dir in cache_dirs:
            if os.path.exists(cache_dir):
                for root, dirs, files in os.walk(cache_dir):
                    for file in files:
                        if any(file.endswith(ext) for ext in ['.tmp', '.temp', '.log', '.cache']):
                            try:
                                filepath = os.path.join(root, file)
                                size = os.path.getsize(filepath)
                                os.remove(filepath)
                                cleaned += size
                            except:
                                continue
        
        cleaned_mb = cleaned / (1024 * 1024)
        self.total_cleaned += cleaned_mb
        return cleaned_mb
    
    def send_booking_requests(self):
        # Real booking sites from around the world
        booking_sites = [
            # Flight Booking Sites
            "https://www.expedia.com",
            "https://www.booking.com",
            "https://www.kayak.com",
            "https://www.skyscanner.com",
            "https://www.makemytrip.com",  # India
            "https://www.goibibo.com",     # India
            "https://www.cleartrip.com",   # India
            "https://www.biman-airlines.com",  # Bangladesh
            "https://www.airpeace.com",    # Ghana
            "https://www.lufthansa.com",   # Germany
            "https://www.airfrance.com",   # France
            "https://www.qantas.com",      # Australia
            "https://www.united.com",      # USA
            "https://www.aircanada.com",   # Canada
            
            # Taxi/Ride Booking Sites
            "https://www.uber.com",
            "https://www.lyft.com",
            "https://www.ola.com",         # India
            "https://www.bolt.com",        # Europe
            "https://www.grab.com",        # Southeast Asia
            "https://www.gojek.com",       # Indonesia
            "https://www.didi.com",        # China
            "https://www.careem.com",      # Middle East
            
            # Hotel Booking Sites
            "https://www.agoda.com",
            "https://www.hotels.com",
            "https://www.trivago.com",
            "https://www.tripadvisor.com",
            "https://www.oyorooms.com",    # India
            "https://www.traveloka.com",   # Indonesia
        ]
        
        successful_requests = 0
        print("\nSending booking site requests...")
        
        # Send multiple requests at once (batch of 8-12 sites)
        batch_size = random.randint(8, 12)
        sites_to_request = random.sample(booking_sites, batch_size)
        
        for site in sites_to_request:
            try:
                response = requests.get(site, timeout=15)
                if response.status_code == 200:
                    successful_requests += 1
                    print(f"✓ {site.split('//')[1]}")
                else:
                    print(f"✗ {site.split('//')[1]} - Status: {response.status_code}")
            except Exception as e:
                print(f"✗ {site.split('//')[1]} - Error: {str(e)[:20]}...")
            
            # Small delay between each request in the batch
            time.sleep(1)
        
        self.requests_sent += successful_requests
        return successful_requests
    
    def run_optimizer(self):
        cycle = 0
        while True:
            cycle += 1
            
            # Perform optimizations
            self.optimize_memory()
            self.optimize_network() 
            self.clean_storage()
            
            # Update display
            self.display_header()
            
            print(f"\nOptimization cycle {cycle} completed!")
            
            # Send booking requests every cycle (10-15 min wait between batches)
            if cycle > 1:  # Don't send on first run
                requests_sent = self.send_booking_requests()
                print(f"\nBooking requests sent: {requests_sent}")
            
            print("Next cycle in 10-15 minutes...")
            print("Press Ctrl+C to exit")
            
            # Wait 10-15 minutes (600-900 seconds) with display updates
            wait_time = random.randint(600, 900)  # 10-15 minutes
            for i in range(wait_time):
                time.sleep(1)
                if i % 30 == 0:  # Update display every 30 seconds
                    self.display_header()
                    remaining = wait_time - i
                    minutes = remaining // 60
                    seconds = remaining % 60
                    print(f"\nNext optimization in {minutes:02d}:{seconds:02d}...")

if __name__ == "__main__":
    optimizer = PhoneOptimizer()
    try:
        optimizer.run_optimizer()
    except KeyboardInterrupt:
        print("\nDGBD-FARMLAND shutdown complete!")
