import os, random, time, socket, tempfile, shutil

# --- Config ---
TARGET_SIZE_MB = (100, 540)
FLUSH_INTERVAL = 60  # seconds

# --- runtime counters ---
total_bytes = 0
total_flushes = 0
start_time = time.time()

def random_sentence():
    airlines = ["Ryanair", "Lufthansa", "KLM", "Emirates", "Qatar Airways"]
    foods = ["bistro", "pizzeria", "steakhouse", "sushi bar", "café"]
    cities = ["Paris", "Tokyo", "New York", "Berlin", "Rome", "Toronto"]
    return f"Booking at {random.choice(airlines)} or dining in a {random.choice(foods)} in {random.choice(cities)}.\n"

def generate_junk_data():
    target_mb = random.randint(*TARGET_SIZE_MB)
    bytes_target = target_mb * 1024 * 1024
    tempdir = tempfile.mkdtemp(prefix="junkdata_")
    filepath = os.path.join(tempdir, "junk.txt")

    with open(filepath, "w", encoding="utf-8") as f:
        written = 0
        while written < bytes_target:
            s = random_sentence()
            f.write(s)
            written += len(s.encode("utf-8"))

    return tempdir, bytes_target

def flush_python_dns():
    socket.getaddrinfo("example.com", 80)
    print("DNS/socket flush simulated.")

def print_status():
    runtime_min = (time.time() - start_time) / 60
    print(f"\n=== STATUS ===")
    print(f"TOTAL DATA PRODUCED: {total_bytes / (1024**3):.3f} GB")
    print(f"TOTAL FLUSHES: {total_flushes}")
    print(f"RUNTIME: {runtime_min:.2f} minutes\n")

def main():
    global total_bytes, total_flushes

    while True:
        folder, bytes_now = generate_junk_data()
        total_bytes += bytes_now
        print(f"Produced {bytes_now/1024/1024:.1f} MB → {folder}")

        # wait 1 minute
        time.sleep(FLUSH_INTERVAL)

        # delete junk + flush DNS/socket state
        shutil.rmtree(folder)
        flush_python_dns()
        total_flushes += 1

        print_status()

if __name__ == "__main__":
    main()
