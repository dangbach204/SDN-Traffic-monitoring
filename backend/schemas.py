from pydantic import BaseModel
from typing import Optional

class FlowStatIn(BaseModel):
    dpid:            int
    port:            int
    topology:        str = "single"
    throughput_mbps: float
    tx_bytes:        float
    rx_bytes:        float
    tx_errors:       int = 0
    rx_errors:       int = 0

class IperfStatIn(BaseModel):
    topology:        str = "single"
    throughput_mbps: float
    jitter_ms:       float
    lost_packets:    int = 0
    total_packets:   int = 0

class FlowStatOut(BaseModel):
    timestamp:       str
    dpid:            int
    port:            int
    topology:        str
    throughput_mbps: float

class IperfStatOut(BaseModel):
    timestamp:       str
    topology:        str
    throughput_mbps: float
    jitter_ms:       float
    packet_loss_pct: float