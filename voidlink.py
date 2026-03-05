#!/usr/bin/env python3
"""
MK2VOIDLINK - Stealth L7 Pinger (HTTP/2 Only)
"""

import socket
import ssl
import time
import random
import string
from datetime import datetime, timezone
from colorama import init, Fore, Style
import requests
import h2.connection
import h2.config

init(autoreset=True)

# Custom orange (ANSI 256)
ORANGE = '\033[38;5;214m'
BRIGHT_WHITE = Style.BRIGHT + Fore.WHITE

class MK2VoidLink:
    def __init__(self, target, webhook_url):
        self.target = target
        self.webhook_url = webhook_url
        self.last_log = 0
        self.last_discord_log = 0
        self.start_time = datetime.now()
        self.request_count = 0
        self.session_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        self.last_status = "None"
        self.last_response_info = "None"
        
        # User agents
        self.agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        ]
        
        # Unblockable referers
        self.refs = [
            "https://www.google.com/",
            "https://www.bing.com/",
            "https://duckduckgo.com/",
            "https://www.reddit.com/",
            "https://twitter.com/",
            "https://www.facebook.com/",
            "https://www.instagram.com/",
            "https://www.youtube.com/",
            "https://archive.org/",
            "https://en.wikipedia.org/"
        ]
        
        # Send startup webhook
        self.send_startup_webhook()
        
    def rand_str(self, n=8):
        return ''.join(random.choices(string.ascii_lowercase + string.digits, k=n))
    
    def format_size(self, size):
        if size < 1024:
            return f"{size}B"
        elif size < 1024**2:
            return f"{size/1024:.2f}KB"
        elif size < 1024**3:
            return f"{size/1024**2:.2f}MB"
        else:
            return f"{size/1024**3:.2f}GB"
    
    def detect_cdn(self, headers):
        headers = headers.lower()
        if 'cloudflare' in headers or 'cf-ray' in headers:
            return 'cloudflare'
        if 'akamai' in headers:
            return 'akamai'
        if 'sucuri' in headers:
            return 'sucuri'
        if 'incapsula' in headers:
            return 'incapsula'
        return None
    
    def send_startup_webhook(self):
        """Send startup message to Discord"""
        embed = {
            "title": f"🚀 MK2VOIDLINK (HTTP/2) - Session Started",
            "color": 0x00ff00,
            "fields": [
                {
                    "name": "Session",
                    "value": f"`{self.session_id}`",
                    "inline": True
                },
                {
                    "name": "Target",
                    "value": f"`{self.target}`",
                    "inline": True
                },
                {
                    "name": "Start Time",
                    "value": f"`{self.start_time.strftime('%Y-%m-%d %H:%M:%S')}`",
                    "inline": True
                }
            ],
            "footer": {
                "text": "MK2VOIDLINK • HTTP/2 Only"
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        try:
            requests.post(self.webhook_url, json={"embeds": [embed]})
        except:
            pass
    
    def send_update_webhook(self):
        """Send update to Discord every 2-5 minutes"""
        running_time = str(datetime.now() - self.start_time).split('.')[0]
        
        embed = {
            "title": f"📡 MK2VOIDLINK (HTTP/2) - ({datetime.now().strftime('%Y-%m-%d %H:%M:%S')}) - (Session {self.session_id})",
            "color": 0x3498db,
            "fields": [
                {
                    "name": "🎯 Target",
                    "value": f"```{self.target}```",
                    "inline": False
                },
                {
                    "name": "📊 Requests",
                    "value": f"```{self.request_count}```",
                    "inline": True
                },
                {
                    "name": "⏱️ Session Time",
                    "value": f"```{running_time}```",
                    "inline": True
                },
                {
                    "name": "━━━━━━━━━━━━━━━━━━━━━━",
                    "value": "**Last Response Info**",
                    "inline": False
                },
                {
                    "name": "📨 Last Response",
                    "value": f"```{self.last_response_info}```",
                    "inline": False
                },
                {
                    "name": "🔢 Last Response Code",
                    "value": f"```{self.last_status}```",
                    "inline": False
                }
            ],
            "footer": {
                "text": f"Session {self.session_id} • HTTP/2 • Update every 2-5min"
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        try:
            requests.post(self.webhook_url, json={"embeds": [embed]})
        except:
            pass
    
    def send_req(self):
        start = time.time()
        self.request_count += 1
        
        try:
            rand_param = self.rand_str(8)
            
            # Setup SSL for HTTP/2
            context = ssl.create_default_context()
            context.set_alpn_protocols(['h2', 'http/1.1'])
            context.set_npn_protocols(['h2', 'http/1.1'])
            
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(10)
            sock.connect((self.target, 443))
            
            # Wrap socket with SSL
            ssock = context.wrap_socket(sock, server_hostname=self.target)
            
            # Check if HTTP/2 was negotiated
            if ssock.selected_alpn_protocol() != 'h2':
                raise Exception("HTTP/2 not supported")
            
            # Create HTTP/2 connection
            config = h2.config.H2Configuration(client_side=True)
            conn = h2.connection.H2Connection(config=config)
            conn.initiate_connection()
            ssock.send(conn.data_to_send())
            
            # Build headers
            headers = [
                (':method', 'POST'),
                (':path', f'/?{rand_param}'),
                (':authority', self.target),
                (':scheme', 'https'),
                ('user-agent', random.choice(self.agents)),
                ('accept', 'text/html,application/xhtml+xml'),
                ('accept-language', 'en-US,en;q=0.9'),
                ('cache-control', 'no-cache'),
                ('referer', random.choice(self.refs)),
                ('content-length', '0')
            ]
            
            # Send request
            stream_id = conn.get_next_available_stream_id()
            conn.send_headers(stream_id, headers, end_stream=True)
            ssock.send(conn.data_to_send())
            
            # Get response
            resp_data = b''
            while True:
                try:
                    data = ssock.recv(65535)
                    if not data:
                        break
                    
                    events = conn.receive_data(data)
                    for event in events:
                        if isinstance(event, h2.events.ResponseReceived):
                            pass
                        elif isinstance(event, h2.events.DataReceived):
                            resp_data += event.data
                            conn.acknowledge_received_data(event.flow_controlled_length, event.stream_id)
                    
                    ssock.send(conn.data_to_send())
                    
                except:
                    break
            
            ssock.close()
            
            resp_time = (time.time() - start) * 1000
            
            # Try to get status code from response
            try:
                # Parse first line for status
                headers_end = resp_data.find(b'\r\n\r\n')
                if headers_end != -1:
                    first_line = resp_data[:resp_data.find(b'\r\n')].decode('utf-8', errors='ignore')
                    status = int(first_line.split()[1])
                    all_headers = resp_data[:headers_end].decode('utf-8', errors='ignore').lower()
                else:
                    status = 200
                    all_headers = ''
            except:
                status = 0
                all_headers = ''
            
            cdn = self.detect_cdn(all_headers)
            if cdn:
                if cdn == 'cloudflare':
                    hit_color = ORANGE
                    hit_text = f"cdn-cloudflare"
                else:
                    hit_color = Fore.RED
                    hit_text = f"cdn-{cdn}"
            else:
                hit_color = BRIGHT_WHITE
                hit_text = f"org-{self.target}"
            
            if status < 400:
                result = f"{Fore.GREEN}pxn-s{Style.RESET_ALL}"
                log_result = "pxn-s"
            else:
                result = f"{Fore.RED}intercepted{Style.RESET_ALL}"
                log_result = "intercepted"
            
            # Store last response info for Discord
            self.last_response_info = f"{hit_text} | {self.format_size(len(resp_data))} | {resp_time:.2f}ms | {log_result}"
            self.last_status = str(status)
            
            current_time = time.time()
            
            # Terminal output every 3 seconds
            if current_time - self.last_log >= 3:
                print(f"MK2VOIDLINK (H2) ---> ({hit_color}{hit_text}{Style.RESET_ALL}) ↓")
                print(f"({resp_time:.2f}ms) ---> {status} ←")
                print(f"({self.format_size(len(resp_data))}) ---> {result}")
                print()
                self.last_log = current_time
            
            # Discord logging every 2-5 minutes (120-300 seconds)
            if current_time - self.last_discord_log >= random.uniform(120, 300):
                self.send_update_webhook()
                self.last_discord_log = current_time
            
            return True
            
        except Exception as e:
            resp_time = (time.time() - start) * 1000
            
            # Store last response info for Discord
            self.last_response_info = f"org-{self.target} | 0B | {resp_time:.2f}ms | intercepted"
            self.last_status = "000"
            
            current_time = time.time()
            
            # Terminal output every 3 seconds
            if current_time - self.last_log >= 3:
                print(f"MK2VOIDLINK (H2) ---> ({BRIGHT_WHITE}org-{self.target}{Style.RESET_ALL}) ↓")
                print(f"({resp_time:.2f}ms) ---> 000 ←")
                print(f"(0B) ---> {Fore.RED}intercepted{Style.RESET_ALL}")
                print(f"Error: {str(e)[:50]}")
                print()
                self.last_log = current_time
            
            # Discord logging every 2-5 minutes
            if current_time - self.last_discord_log >= random.uniform(120, 300):
                self.send_update_webhook()
                self.last_discord_log = current_time
            
            return False
    
    def run(self):
        startup_time = self.start_time.strftime("%Y-%m-%d %H:%M:%S")
        print(f"\n{Fore.CYAN}MK2VOIDLINK (HTTP/2) ({startup_time}) - Target: {self.target} \\ Discord logging active (every 2-5min){Style.RESET_ALL}")
        print("=" * 60)
        
        try:
            while True:
                self.send_req()
                time.sleep(random.uniform(2, 3))
        except KeyboardInterrupt:
            print(f"\n{Fore.YELLOW}Stopped{Style.RESET_ALL}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python mk2voidlink.py <target>")
        sys.exit(1)
    
    webhook = "https://discord.com/api/webhooks/1478911049263612055/iAcn2jqsiWMonGi7Q74k2s4utvR5ERn2sdYOM3j0FqqwnkhugMsPJTfz3oNvrouCwYUr"
    v = MK2VoidLink(sys.argv[1], webhook)
    v.run()
