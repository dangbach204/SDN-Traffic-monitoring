import subprocess
import json

SERVER = "10.0.0.1"
DURATION = 30


def run():
    cmd = [
        "iperf3",
        "-c", SERVER,
        "-u",
        "-b", "20M",
        "-t", str(DURATION),
        "-i", "5",
        "--json"
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)

    try:
        data = json.loads(result.stdout)
    except:
        print("parse error")
        return

    for iv in data["intervals"]:
        udp = iv["sum"]
        print({
            "throughput": round(udp["bits_per_second"] / 1e6, 2),
            "jitter": udp.get("jitter_ms", 0)
        })


if __name__ == "__main__":
    run()