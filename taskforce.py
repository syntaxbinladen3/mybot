import sys
import asyncio
import aiohttp
from datetime import datetime

def format_section(title, content):
    return f"[ {title.ljust(16)} ]    {content}"

async def get_ip_info(ip):
    url = f"http://ip-api.com/json/{ip}?fields=status,message,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,mobile,proxy,hosting,query"
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as resp:
            data = await resp.json()
            if data["status"] == "success":
                return data
            else:
                return {"error": data.get("message", "Unknown error")}

def harop_style_output(data):
    timestamp = datetime.now().strftime("%H:%M:%S")
    output = []
    output.append("="*50)
    output.append(f"[ TASKFORCE IP INFO v1.0 ]".center(50))
    output.append(f"SCAN INITIATED @ {timestamp}".center(50))
    output.append("="*50)
    output.append("")

    if "error" in data:
        output.append(f"ERROR: {data['error']}")
    else:
        output.append(format_section("IP", data.get("query", "N/A")))
        loc = f"{data.get('city', 'N/A')}, {data.get('regionName', 'N/A')}, {data.get('country', 'N/A')}"
        output.append(format_section("Location", loc))
        output.append(format_section("ISP", data.get("isp", "N/A")))
        output.append("-"*50)
        output.append(format_section("MAP", f"https://www.google.com/maps/search/?api=1&query={data.get('lat')},{data.get('lon')}"))
        output.append(format_section("Coordinates", f"{data.get('lat', 'N/A')}, {data.get('lon', 'N/A')}"))
        output.append("-"*50)
        output.append("[ Technical Details ]")
        output.append(format_section("Mobile", str(data.get("mobile", "N/A"))))
        output.append(format_section("Proxy/VPN", str(data.get("proxy", "N/A"))))
        output.append(format_section("Hosting", str(data.get("hosting", "N/A"))))
        output.append("-"*50)
        output.append(format_section("Timezone", data.get("timezone", "N/A")))
        output.append(format_section("ZIP", data.get("zip", "N/A")))
        output.append(format_section("Country Code", data.get("countryCode", "N/A")))
    
    output.append("")
    output.append("="*50)
    output.append(f"[ SCAN COMPLETE @ {datetime.now().strftime('%H:%M:%S')} ]".center(50))
    output.append("="*50)
    return "\n".join(output)


async def main():
    if len(sys.argv) < 2:
        print("Usage: python3 taskforce.py <ip_or_domain>")
        return
    
    target = sys.argv[1]
    data = await get_ip_info(target)
    print(harop_style_output(data))

if __name__ == "__main__":
    asyncio.run(main())
