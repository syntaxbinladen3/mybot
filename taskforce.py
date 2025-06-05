import aiohttp
from datetime import datetime

async def scan_ip_target(ip: str) -> str:
    url = f"http://ip-api.com/json/{ip}?fields=66846719"

    async with aiohttp.ClientSession() as session:
        async with session.get(url, timeout=5) as resp:
            data = await resp.json()

    output = []
    timestamp = datetime.now().strftime("%H:%M:%S")

    output.append("="*50)
    output.append(f"[ STS TASKFORCE IP SCAN ]".center(50))
    output.append(f"SCAN INITIATED @ {timestamp}".center(50))
    output.append("="*50)
    output.append("")

    if data["status"] != "success":
        output.append("[ ERROR ]     Failed to resolve IP")
        return "\n".join(output)

    def f(label, val): return f"[ {label.ljust(16)} ]    {val}"

    # Basic info
    output.append(f("IP", ip))
    output.append(f("CITY", data.get("city", "N/A")))
    output.append(f("REGION", data.get("regionName", "N/A")))
    output.append(f("COUNTRY", f'{data.get("country")} ({data.get("countryCode")})'))
    output.append(f("ZIP CODE", data.get("zip", "N/A")))
    output.append(f("TIMEZONE", data.get("timezone", "N/A")))
    output.append("-"*50)

    # Network info
    output.append(f("ISP", data.get("isp", "N/A")))
    output.append(f("ORG", data.get("org", "N/A")))
    output.append(f("ASN", data.get("as", "N/A")))
    output.append(f("MOBILE", str(data.get("mobile", False))))
    output.append(f("PROXY", str(data.get("proxy", False))))
    output.append(f("HOSTING", str(data.get("hosting", False))))
    output.append("-"*50)

    # Location links
    lat = data.get("lat", "N/A")
    lon = data.get("lon", "N/A")
    output.append(f("COORDINATES", f"{lat}, {lon}"))
    output.append(f("GOOGLE MAPS", f"https://maps.google.com/?q={lat},{lon}"))
    output.append("-"*50)

    output.append(f("LOOKUP COMPLETE", datetime.now().strftime("%H:%M:%S")))
    output.append("="*50)

    return "\n".join(output)
