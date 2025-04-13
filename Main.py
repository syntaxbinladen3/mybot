import time
import asyncio
import aiohttp
import random
from datetime import datetime

# Configuration
TARGET_URL = "https://up.triotion.xyz/?=h2syntaxfr"  # Change this to your target
TEST_DURATION = 300  # Seconds
MAX_CONCURRENT = 500  # Simultaneous connections
MIN_UPDATE_INTERVAL = 1  # Seconds between updates
MAX_UPDATE_INTERVAL = 3  # Seconds between updates

# User Agents and Referers
IPHONE_USER_AGENTS = [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/93.0.4577.63 Mobile/15E148 Safari/604.1"
]

REFERERS = [
    "https://www.google.com/",
    "https://www.facebook.com/",
    "https://www.twitter.com/",
    "https://www.youtube.com/",
    "https://www.reddit.com/",
    "https://www.linkedin.com/",
    "https://www.instagram.com/",
    "https://www.bing.com/",
    "https://www.yahoo.com/",
    "https://www.amazon.com/"
]

class RequestWorker:
    def __init__(self, session):
        self.session = session
    
    async def make_request(self):
        headers = {
            "User-Agent": random.choice(IPHONE_USER_AGENTS),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Cache-Control": "max-age=0",
            "TE": "Trailers",
            "Referer": random.choice(REFERERS)
        }
        
        try:
            start_time = time.time()
            async with self.session.get(TARGET_URL, headers=headers, timeout=10) as response:
                elapsed = time.time() - start_time
                success = 200 <= response.status <= 299
                return {
                    "status": response.status,
                    "time": elapsed,
                    "success": success
                }
        except Exception as e:
            return {
                "status": str(e),
                "time": 0,
                "success": False
            }

async def run_test():
    print(f"Starting connection test to {TARGET_URL} for {TEST_DURATION} seconds...")
    
    # Performance tracking
    start_time = time.time()
    end_time = start_time + TEST_DURATION
    stats = {
        'total': 0,
        'success': 0,
        'failed': 0,
        'latency': 0,
        'last_rps': 0,
        'peak_rps': 0,
        'last_update': time.time(),
        'last_console_update': 0
    }
    
    # Create optimized session
    connector = aiohttp.TCPConnector(
        force_close=True,
        enable_cleanup_closed=True,
        limit=0,
        ttl_dns_cache=300
    )
    
    # Main test loop
    async with aiohttp.ClientSession(connector=connector) as session:
        workers = [RequestWorker(session) for _ in range(MAX_CONCURRENT)]
        
        while time.time() < end_time:
            # Fixed batch size since we removed CPU monitoring
            batch_size = MAX_CONCURRENT
            
            # Process batch
            tasks = []
            for worker in random.sample(workers, batch_size):
                tasks.append(worker.make_request())
            
            results = await asyncio.gather(*tasks)
            
            # Update stats
            for result in results:
                stats['total'] += 1
                if result['success']:
                    stats['success'] += 1
                    stats['latency'] += result['time']
                else:
                    stats['failed'] += 1
            
            # Calculate RPS
            current_time = time.time()
            time_elapsed = current_time - stats['last_update']
            if time_elapsed >= 1.0:
                stats['last_rps'] = (stats['total'] - (stats['total'] - len(results))) / time_elapsed
                stats['peak_rps'] = max(stats['peak_rps'], stats['last_rps'])
                stats['last_update'] = current_time
            
            # Update console every 2-4 seconds
            if current_time - stats['last_console_update'] >= random.uniform(MIN_UPDATE_INTERVAL, MAX_UPDATE_INTERVAL):
                stats['last_console_update'] = current_time
                avg_latency = (stats['latency'] / stats['success']) * 1000 if stats['success'] > 0 else 0
                time_remaining = max(0, end_time - current_time)
                
                print(f"\nRequests: {stats['total']} | Success: {stats['success']} | Failed: {stats['failed']}")
                print(f"Current RPS: {stats['last_rps']:.1f} | Peak RPS: {stats['peak_rps']:.1f}")
                print(f"Avg Latency: {avg_latency:.2f}ms | Time Remaining: {time_remaining:.1f}s")
            
            # Small delay to prevent 100% CPU usage
            await asyncio.sleep(0.1)
    
    # Final stats
    total_time = time.time() - start_time
    avg_rps = stats['total'] / total_time if total_time > 0 else 0
    avg_latency = (stats['latency'] / stats['success']) * 1000 if stats['success'] > 0 else 0
    
    # Print final results
    print("\nTest completed!")
    print("="*40)
    print(f"Total Requests: {stats['total']}")
    print(f"Successful: {stats['success']} | Failed: {stats['failed']}")
    print(f"Average RPS: {avg_rps:.1f} | Peak RPS: {stats['peak_rps']:.1f}")
    print(f"Average Latency: {avg_latency:.2f}ms")
    print(f"Test Duration: {total_time:.2f}s")
    print("="*40)
    
    # Save results to file
    with open("test_results.txt", "w") as f:
        f.write(f"Test Results for {TARGET_URL} at {datetime.now()}\n")
        f.write("="*40 + "\n")
        f.write(f"Total Requests: {stats['total']}\n")
        f.write(f"Successful: {stats['success']}\n")
        f.write(f"Failed: {stats['failed']}\n")
        f.write(f"Average RPS: {avg_rps:.1f}\n")
        f.write(f"Peak RPS: {stats['peak_rps']:.1f}\n")
        f.write(f"Average Latency: {avg_latency:.2f}ms\n")
        f.write(f"Test Duration: {total_time:.2f}s\n")

if __name__ == "__main__":
    try:
        asyncio.run(run_test())
    except KeyboardInterrupt:
        print("\nTest stopped by user")
    except Exception as e:
        print(f"\nError occurred: {str(e)}")
