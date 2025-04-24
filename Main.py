import ipaddress
import subprocess
import multiprocessing
from tqdm import tqdm

# Expanded Israeli IP blocks
israel_cidr_blocks = [
    "212.179.0.0/16",  # Bezeq International
    "147.235.0.0/16",  # Bezeq International
    "94.159.0.0/16",   # Partner Communications
    "37.46.0.0/16",    # Partner
    "31.154.0.0/16",   # HOTnet
    "5.29.0.0/16",     # HOTnet
    "85.64.0.0/16",    # Cellcom
    "79.179.0.0/16",   # Cellcom
    "185.32.0.0/16",   # 012 Smile Telecom
    "62.90.0.0/16",    # 012 Smile Telecom
    "109.64.0.0/16",   # Barak ITC (Netvision)
    "77.125.0.0/16",   # Barak ITC
    "20.217.0.0/16",   # Microsoft Israel
    "40.114.0.0/16",   # Microsoft Israel
    "147.237.0.0/16",  # Government ICT
    "132.72.0.0/16",   # Hebrew University
    "132.74.0.0/16",   # Tel Aviv University
    "37.142.0.0/16",   # Cellcom mobile
    "176.12.0.0/16",   # Pelephone
    "37.26.0.0/16",    # Partner mobile
    "185.3.128.0/17",  # Small ISP
    "185.60.76.0/22",  # Infrastructure
    "91.198.128.0/19"  # Hosting
]

# Function to ping a single IP
def ping(ip):
    try:
        result = subprocess.run(['ping', '-c', '1', '-W', '5', str(ip)],
                                stdout=subprocess.DEVNULL,
                                stderr=subprocess.DEVNULL)
        if result.returncode == 0:
            return str(ip)
    except:
        return None

# Process one CIDR block
def process_block(cidr_block):
    network = ipaddress.IPv4Network(cidr_block)
    with multiprocessing.Pool(processes=multiprocessing.cpu_count()) as pool:
        for ip in tqdm(pool.imap_unordered(ping, network.hosts(), chunksize=256),
                       total=network.num_addresses - 2,
                       desc=f"Pinging {cidr_block}"):
            if ip:
                with open("pingable_ips.txt", "a") as f:
                    f.write(ip + "\n")

# Main driver
if __name__ == "__main__":
    print("Starting Israeli IP scan...")
    for block in israel_cidr_blocks:
        process_block(block)
    print("Done. Pingable IPs saved in pingable_ips.txt")
