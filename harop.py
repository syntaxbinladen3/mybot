import asyncio
import socket
import ssl
import time
import dns.resolver
import aiohttp
from datetime import datetime
import sys

COMMON_PATHS = ["/admin", "/wp-admin", "/backdoor", "/console", "/debug", "/secret", "/private"]
COMMON_SUBS = ["www", "mail", "api", "blog", "dev", "test", "admin", "secure"]

def format_section(title, content):
    return f"[ {title.ljust(16)} ]    {content}"

async def get_dns_records(domain):
    records = {"A": [], "MX": [], "TXT": []}
    try:
        answers = await asyncio.to_thread(dns.resolver.resolve, domain, 'A')
        records["A"] = [r.to_text() for r in answers]
    except Exception as e:
        records["A"] = [f"ERR: {str(e)}"]

    try:
        answers = await asyncio.to_thread(dns.resolver.resolve, domain, 'MX')
        records["MX"] = [str(r.exchange) for r in answers]
    except Exception as e:
        records["MX"] = [f"ERR: {str(e)}"]

    try:
        answers = await asyncio.to_thread(dns.resolver.resolve, domain, 'TXT')
        records["TXT"] = [r.to_text() for r in answers]
    except Exception as e:
        records["TXT"] = [f"ERR: {str(e)}"]
    return records

async def detect_protection(session, domain):
    try:
        async with session.get(f"https://{domain}", timeout=3) as response:
            headers = {k.lower(): v for k, v in response.headers.items()}
            server = headers.get('server', '').lower()

            if 'cloudflare' in server or 'cf-ray' in headers:
                return "CLOUDFLARE"
            if 'akamai' in server or 'x-akamai' in str(headers):
                return "AKAMAI"
            if 'x-amz' in str(headers) or 'awselb' in server:
                return "AWS SHIELD"
            if 'x-vercel-id' in headers or 'x-vercel-ip' in headers:
                return "VERCEL"
            if 'fastly' in server or 'x-fastly' in headers:
                return "FASTLY"
            if 'sucuri' in server or 'x-sucuri-id' in headers:
                return "SUCURI"
            if any(h in headers for h in ['x-protected-by', 'x-security']):
                return "CUSTOM PROTECTION"
            if response.status in [403, 429] or 'captcha' in str(response.text).lower():
                return "UNKNOWN PROTECTION"
            return "N/A"
    except Exception as e:
        return f"DETECTION FAILED: {str(e)}"

async def find_subdomains(domain):
    found = []
    for sub in COMMON_SUBS:
        full = f"{sub}.{domain}"
        try:
            await asyncio.to_thread(socket.gethostbyname, full)
            found.append(full)
        except:
            continue
    return found

async def get_security_headers(session, url):
    try:
        async with session.get(url, timeout=3) as response:
            headers = response.headers
            important = [
                'X-Content-Type-Options',
                'X-Frame-Options',
                'Strict-Transport-Security',
                'Content-Security-Policy',
                'X-XSS-Protection',
                'Referrer-Policy'
            ]
            return "\n".join([f"{h}: {headers[h]}" for h in important if h in headers])
    except:
        return "N/A"

async def get_ssl_info(domain):
    try:
        ctx = ssl.create_default_context()
        with ctx.wrap_socket(socket.socket(), server_hostname=domain) as s:
            s.settimeout(3)
            s.connect((domain, 443))
            cert = s.getpeercert()
            subject = dict(x[0] for x in cert['subject'])
            issuer = dict(x[0] for x in cert['issuer'])
            return {
                "CN": subject.get('commonName', 'N/A'),
                "Issuer": issuer.get('organizationName', 'N/A'),
                "Expiry": cert.get('notAfter', 'N/A')
            }
    except:
        return None

async def scan_target(target):
    output = []
    timestamp = datetime.now().strftime("%H:%M:%S")

    output.append("="*50)
    output.append(f"[ STS HAROP-TF v4.0 ]".center(50))
    output.append(f"SCAN INITIATED @ {timestamp}".center(50))
    output.append("="*50)
    output.append("")

    try:
        ip = await asyncio.to_thread(socket.gethostbyname, target)
        try:
            ptr = await asyncio.to_thread(socket.gethostbyaddr, ip)
            ptr = ptr[0]
        except:
            ptr = ip
    except:
        ip = "UNRESOLVED"
        ptr = "N/A"

    output.append(format_section("TARGET", target))
    output.append(format_section("IP", ip))
    output.append(format_section("PTR", ptr))
    output.append("-"*50)

    dns_records = await get_dns_records(target)
    output.append(format_section("DNS A RECORDS", ", ".join(dns_records["A"][:3])))
    output.append(format_section("DNS MX RECORDS", ", ".join(dns_records["MX"][:3])))
    output.append(format_section("DNS TXT RECORDS", ", ".join(dns_records["TXT"][:3])))
    output.append("-"*50)

    async with aiohttp.ClientSession() as session:
        http_status, http_time = "ERR", 0.0
        https_status, https_time = "ERR", 0.0

        try:
            start = time.time()
            async with session.get(f"http://{target}", timeout=3) as r:
                http_status = r.status
                http_time = time.time() - start
        except: pass

        try:
            start = time.time()
            async with session.get(f"https://{target}", timeout=3) as r:
                https_status = r.status
                https_time = time.time() - start
        except: pass

        output.append(format_section("HTTP STATUS", f"{http_status} ({http_time:.2f}s)"))
        output.append(format_section("HTTPS STATUS", f"{https_status} ({https_time:.2f}s)"))
        output.append("-"*50)

        protection = await detect_protection(session, target)
        output.append(format_section("PROTECTION", protection))
        output.append("-"*50)

        found_paths = []
        for path in COMMON_PATHS:
            try:
                async with session.get(f"https://{target}{path}", timeout=2) as r:
                    if r.status < 400:
                        found_paths.append(f"{path}:{r.status}")
            except: continue
        output.append(format_section("HIDDEN ROUTES", ", ".join(found_paths[:5]) or "NONE"))
        output.append("-"*50)

        subdomains = await find_subdomains(target)
        output.append(format_section("SUBDOMAINS", ", ".join(subdomains[:5]) or "NONE"))
        output.append("-"*50)

        ssl_info = await get_ssl_info(target)
        if ssl_info:
            output.append(format_section("SSL CN", ssl_info["CN"]))
            output.append(format_section("SSL ISSUER", ssl_info["Issuer"]))
            output.append(format_section("SSL EXPIRY", ssl_info["Expiry"]))
        else:
            output.append(format_section("SSL INFO", "UNAVAILABLE"))
        output.append("-"*50)

        headers = await get_security_headers(session, f"https://{target}")
        output.append(format_section("SEC HEADERS", headers.split('\n')[0] if headers != "N/A" else "N/A"))
        output.append("-"*50)

        total_requests = 10 + len(COMMON_PATHS) + len(COMMON_SUBS)
        output.append(format_section("TOTAL REQUESTS", str(total_requests)))

    output.append("")
    output.append("="*50)
    output.append(f"[ SCAN COMPLETE @ {datetime.now().strftime('%H:%M:%S')} ]".center(50))
    output.append("="*50)

    return "\n".join(output)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python main.py <domain>")
        sys.exit(1)

    target_domain = sys.argv[1].replace("http://", "").replace("https://", "").strip("/")
    result = asyncio.run(scan_target(target_domain))
    print(result)
