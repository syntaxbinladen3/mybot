#!/data/data/com.termux/files/usr/bin/python3
import requests
import json
import time
import socket
import ipaddress
from datetime import datetime
import concurrent.futures

# ========== YOUR API KEYS ==========
API_KEYS = {
    "ipinfo": "587abfb7004c17",
    "virustotal": "33a51fae2724b4bce7ffd2387dddb55ba77abb01358c8ef2312f3a59a5f0340e",
    "abuseipdb": "576430416d907512f1bd37dd3b1faa4d54b31030357ef6a595f756102806c25e7df50473aea4c019",
    "shodan": "5kkY3zpzKSi5vCNIWePIvAIEbyu8R9or"
}
# ===================================

class SimpsonTracer:
    def __init__(self, target_ip):
        self.target = target_ip
        self.results = {}
        self.scan_time = None
        self.scan_id = f"SMP-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
    def validate_ip(self):
        try:
            ipaddress.ip_address(self.target)
            return True
        except:
            return False
    
    def fetch_ipinfo(self):
        try:
            url = f"https://ipinfo.io/{self.target}/json?token={API_KEYS['ipinfo']}"
            resp = requests.get(url, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                self.results['geo'] = {
                    'country': data.get('country', 'N/A'),
                    'region': data.get('region', 'N/A'),
                    'city': data.get('city', 'N/A'),
                    'postal': data.get('postal', 'N/A'),
                    'coordinates': data.get('loc', 'N/A'),
                    'timezone': data.get('timezone', 'N/A'),
                    'org': data.get('org', 'N/A')
                }
                self.results['network'] = {
                    'hostname': data.get('hostname', 'N/A'),
                    'anycast': data.get('anycast', False)
                }
                return True
        except:
            pass
        return False
    
    def fetch_virustotal(self):
        try:
            url = f"https://www.virustotal.com/api/v3/ip_addresses/{self.target}"
            headers = {"x-apikey": API_KEYS['virustotal']}
            resp = requests.get(url, headers=headers, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                stats = data.get('data', {}).get('attributes', {}).get('last_analysis_stats', {})
                self.results['threat'] = {
                    'malicious': stats.get('malicious', 0),
                    'suspicious': stats.get('suspicious', 0),
                    'undetected': stats.get('undetected', 0),
                    'harmless': stats.get('harmless', 0),
                    'total_engines': sum(stats.values()) if stats else 0
                }
                return True
        except:
            pass
        return False
    
    def fetch_abuseipdb(self):
        try:
            url = "https://api.abuseipdb.com/api/v2/check"
            headers = {
                "Key": API_KEYS['abuseipdb'],
                "Accept": "application/json"
            }
            params = {"ipAddress": self.target, "maxAgeInDays": 90}
            resp = requests.get(url, headers=headers, params=params, timeout=10)
            if resp.status_code == 200:
                data = resp.json().get('data', {})
                self.results['abuse'] = {
                    'abuse_score': data.get('abuseConfidenceScore', 0),
                    'total_reports': data.get('totalReports', 0),
                    'is_tor': data.get('isTor', False),
                    'is_vpn': data.get('isVpn', False),
                    'is_public': data.get('isPublic', False)
                }
                return True
        except:
            pass
        return False
    
    def fetch_shodan(self):
        try:
            url = f"https://api.shodan.io/shodan/host/{self.target}?key={API_KEYS['shodan']}"
            resp = requests.get(url, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                ports = data.get('ports', [])[:5]
                org = data.get('org', 'N/A')
                isp = data.get('isp', 'N/A')
                
                self.results['shodan'] = {
                    'ports': ports,
                    'org': org,
                    'isp': isp,
                    'vulns': len(data.get('vulns', [])),
                    'tags': data.get('tags', [])
                }
                return True
        except:
            pass
        return False
    
    def port_scan_fast(self):
        common_ports = [53, 80, 443, 22, 21, 25, 110, 143, 853]
        open_ports = []
        
        def check_port(port):
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(1)
                result = sock.connect_ex((self.target, port))
                sock.close()
                return port if result == 0 else None
            except:
                return None
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(check_port, port) for port in common_ports]
            for future in concurrent.futures.as_completed(futures):
                port = future.result()
                if port:
                    open_ports.append(port)
        
        self.results['ports'] = sorted(open_ports)
    
    def get_network_range(self):
        try:
            ip = ipaddress.ip_address(self.target)
            network = ipaddress.ip_network(f"{ip}/24", strict=False)
            self.results['network_range'] = {
                'subnet': str(network),
                'total_ips': network.num_addresses,
                'network_address': str(network.network_address),
                'broadcast': str(network.broadcast_address)
            }
        except:
            self.results['network_range'] = {
                'subnet': 'N/A',
                'total_ips': 'N/A',
                'network_address': 'N/A',
                'broadcast': 'N/A'
            }
    
    def fetch_whois(self):
        try:
            url = f"https://www.whoisxmlapi.com/whoisserver/WhoisService"
            params = {
                "apiKey": "free_tier_no_key_available",  # Would need actual key
                "domainName": self.target,
                "outputFormat": "JSON"
            }
            # Fallback to hackertarget if no key
            url = f"https://api.hackertarget.com/whois/?q={self.target}"
            resp = requests.get(url, timeout=10)
            if resp.status_code == 200 and "error" not in resp.text.lower():
                self.results['whois'] = resp.text[:500]  # First 500 chars
        except:
            pass
    
    def scan(self):
        if not self.validate_ip():
            return False
        
        start_time = time.time()
        
        # Run all API calls in parallel
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            futures = {
                executor.submit(self.fetch_ipinfo): "ipinfo",
                executor.submit(self.fetch_virustotal): "virustotal",
                executor.submit(self.fetch_abuseipdb): "abuseipdb",
                executor.submit(self.fetch_shodan): "shodan"
            }
            
            for future in concurrent.futures.as_completed(futures):
                service = futures[future]
                try:
                    future.result()
                except:
                    pass
        
        # Local scans
        self.port_scan_fast()
        self.get_network_range()
        self.fetch_whois()
        
        self.scan_time = time.time() - start_time
        return True
    
    def generate_report(self):
        if not self.results:
            return "No data collected"
        
        geo = self.results.get('geo', {})
        network = self.results.get('network', {})
        threat = self.results.get('threat', {})
        abuse = self.results.get('abuse', {})
        shodan = self.results.get('shodan', {})
        ports = self.results.get('ports', [])
        network_range = self.results.get('network_range', {})
        
        # Calculate threat score
        abuse_score = abuse.get('abuse_score', 0)
        malicious = threat.get('malicious', 0)
        total_engines = threat.get('total_engines', 1)
        threat_score = min(100, int((abuse_score + (malicious/total_engines*100)) / 2))
        
        # Format ports
        port_services = {
            53: "DNS", 80: "HTTP", 443: "HTTPS", 22: "SSH", 
            21: "FTP", 25: "SMTP", 110: "POP3", 143: "IMAP", 853: "DNS-TLS"
        }
        
        report = []
        report.append(f"[+] SIMPSON v2.0")
        report.append(f"[+] Target: {self.target}")
        report.append(f"[+] Scan ID: {self.scan_id}")
        report.append(f"[+] Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} UTC")
        report.append(f"[+] Client: Termux")
        report.append("═" * 55)
        
        # GEO-LOCATION
        report.append("[§] GEO-LOCATION")
        report.append(f"├─ ► Country: {geo.get('country', 'N/A')}")
        report.append(f"├─ ► Region: {geo.get('region', 'N/A')}")
        report.append(f"├─ ► City: {geo.get('city', 'N/A')}")
        report.append(f"├─ ► Postal: {geo.get('postal', 'N/A')}")
        report.append(f"├─ ► Coordinates: {geo.get('coordinates', 'N/A')}")
        report.append(f"├─ ► Timezone: {geo.get('timezone', 'N/A')}")
        report.append(f"└─ ► Org: {geo.get('org', 'N/A')}")
        
        # NETWORK DATA
        report.append("\n[§] NETWORK DATA")
        report.append(f"├─ ► Hostname: {network.get('hostname', 'N/A')}")
        report.append(f"├─ ► Anycast: {'✓' if network.get('anycast') else '✗'}")
        if shodan.get('isp') and shodan['isp'] != 'N/A':
            report.append(f"└─ ► ISP: {shodan.get('isp')}")
        
        # THREAT ASSESSMENT
        report.append("\n[§] THREAT ASSESSMENT")
        report.append(f"├─ ► Threat Level: {threat_score}/100")
        report.append(f"├─ ► Malicious: {malicious}/{total_engines}")
        report.append(f"├─ ► Abuse Score: {abuse_score}%")
        report.append(f"├─ ► Total Reports: {abuse.get('total_reports', 0)}")
        report.append(f"├─ ► VPN: {'✓' if abuse.get('is_vpn') else '✗'}")
        report.append(f"├─ ► Tor: {'✓' if abuse.get('is_tor') else '✗'}")
        report.append(f"└─ ► Public: {'✓' if abuse.get('is_public') else '✗'}")
        
        # PORT SERVICES
        if ports:
            report.append("\n[§] PORT SERVICES")
            for i, port in enumerate(ports):
                service = port_services.get(port, f"Port {port}")
                prefix = "├─" if i < len(ports)-1 else "└─"
                report.append(f"{prefix} ► Port {port}: OPEN ({service})")
        
        # NETWORK RANGE
        report.append("\n[§] NETWORK RANGE")
        report.append(f"├─ ► IP Range: {network_range.get('subnet', 'N/A')}")
        report.append(f"├─ ► IPS IN SUB: {network_range.get('total_ips', 'N/A')}")
        report.append(f"├─ ► Network: {network_range.get('network_address', 'N/A')}")
        report.append(f"└─ ► Broadcast: {network_range.get('broadcast', 'N/A')}")
        
        # SHODAN DATA
        if shodan:
            report.append("\n[§] EXTERNAL SCANS")
            report.append(f"├─ ► Open Ports: {len(shodan.get('ports', []))}")
            report.append(f"├─ ► Vulnerabilities: {shodan.get('vulns', 0)}")
            report.append(f"└─ ► Tags: {', '.join(shodan.get('tags', []))[:30]}")
        
        # ATTACK SURFACE
        report.append("\n[§] ATTACK SURFACE")
        report.append(f"├─ ► Open Ports: {len(ports)}")
        report.append(f"├─ ► Services Exposed: {len(ports)}")
        exposure = "HIGH" if threat_score > 70 else "MEDIUM" if threat_score > 30 else "LOW"
        report.append(f"└─ ► Exposure Level: {exposure}")
        
        # FOOTER
        report.append("\n" + "═" * 55)
        report.append(f"[+] Duration: {self.scan_time:.1f}s")
        report.append(f"[+] Confidence: {100 - threat_score}%")
        report.append(f"[+] Hash: {self.scan_id}")
        report.append("═" * 55)
        
        return "\n".join(report)
    
    def save_report(self, filename=None):
        if not filename:
            filename = f"SIMPSON_{self.target}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        
        report = self.generate_report()
        with open(filename, 'w') as f:
            f.write(report)
        
        return filename

def main():
    print("\n" + "═" * 55)
    print("[+] SIMPSON v2.0 - IP Intelligence")
    print("═" * 55)
    
    target = input("[?] Enter IP Address: ").strip()
    
    if not target:
        target = "8.8.8.8"  # Default test IP
    
    print(f"[~] Scanning {target}...")
    
    tracer = SimpsonTracer(target)
    
    if tracer.scan():
        report = tracer.generate_report()
        print("\n" + report)
        
        save = input("\n[?] Save report? (y/n): ").strip().lower()
        if save == 'y':
            filename = tracer.save_report()
            print(f"[+] Report saved: {filename}")
    else:
        print("[!] Invalid IP or scan failed")

if __name__ == "__main__":
    main()
