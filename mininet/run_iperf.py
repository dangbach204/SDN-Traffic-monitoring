#!/usr/bin/env python3
import subprocess, json, requests, sys

FASTAPI_URL = "http://127.0.0.1:8000/stats/iperf"
SERVER_IP   = "10.0.0.1"
TOPOLOGY    = sys.argv[1] if len(sys.argv) > 1 else "single"
DURATION    = 60
INTERVAL    = 10

def run():
    cmd = [
        "iperf3", "-c", SERVER_IP,
        "-u",                     # UDP để đo jitter
        "-b", "50M",
        "-t", str(DURATION),
        "-i", str(INTERVAL),
        "--json"
    ]
    print(f"[iperf3] Chạy {DURATION}s UDP → {SERVER_IP} ...")
    result = subprocess.run(cmd, capture_output=True, text=True)

    try:
        data = json.loads(result.stdout)
    except json.JSONDecodeError:
        print("[iperf3] Lỗi parse JSON:", result.stderr)
        return

    for iv in data.get("intervals", []):
        udp = iv["sum"]
        payload = {
            "topology":        TOPOLOGY,
            "throughput_mbps": round(udp["bits_per_second"] / 1e6, 3),
            "jitter_ms":       round(udp.get("jitter_ms", 0), 4),
            "lost_packets":    udp.get("lost_packets", 0),
            "total_packets":   udp.get("packets", 0),
        }
        try:
            r = requests.post(FASTAPI_URL, json=payload, timeout=3)
            print(f"[iperf3] pushed → {payload} | status={r.status_code}")
        except Exception as e:
            print(f"[iperf3] lỗi push: {e}")

if __name__ == "__main__":
    run()