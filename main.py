import aiohttp
import asyncio
import time

PROXY_API_URL = "https://api.proxyscrape.com/v3/free-proxy-list/get?request=displayproxies&protocol=http&timeout=5000"
TEST_URL = "https://httpbin.org/ip"
OUTPUT_FILE = "main.txt"


async def fetch_proxies():
    """Fetch proxy list from API."""
    async with aiohttp.ClientSession() as session:
        async with session.get(PROXY_API_URL) as resp:
            text = await resp.text()
            return [p.strip() for p in text.splitlines() if p.strip()]


async def check_proxy(proxy):
    """Test a single proxy."""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                TEST_URL,
                proxy=f"http://{proxy}",
                timeout=5
            ) as resp:
                if resp.status == 200:
                    return proxy
    except:
        return None


async def main():
    print("Fetching proxies...")
    proxies = await fetch_proxies()
    print(f"Fetched {len(proxies)} proxies.")
    print("Checking proxies...\n")

    tasks = [check_proxy(p) for p in proxies]
    results = await asyncio.gather(*tasks)

    working = [p for p in results if p]

    print(f"Working proxies found: {len(working)}")

    with open(OUTPUT_FILE, "w") as f:
        for proxy in working:
            f.write(proxy + "\n")

    print(f"Saved working proxies to {OUTPUT_FILE}")


if __name__ == "__main__":
    start = time.time()
    asyncio.run(main())
    print(f"\nCompleted in {time.time() - start:.2f}s")
