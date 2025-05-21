import uuid
import random
import os

output_file = "devices.txt"

def generate_device_id():
    part1 = str(random.randint(10**18, 10**19 - 1))
    part2 = str(random.randint(10**18, 10**19 - 1))
    part3 = str(uuid.uuid4())
    part4 = uuid.uuid4().hex[:16]
    return f"{part1}:{part2}:{part3}:{part4}"

# Ensure the file exists
if not os.path.exists(output_file):
    open(output_file, 'w').close()

print(f"Generating IDs into {output_file}. Press Ctrl+C to stop.")

try:
    with open(output_file, "a") as f:
        while True:
            device_id = generate_device_id()
            f.write(device_id + "\n")
except KeyboardInterrupt:
    print("\nStopped by user.")
