from pydantic import BaseModel

class FlowStatOut(BaseModel):
    timestamp: str
    dpid: int
    port: int
    tx_mbps: float
    rx_mbps: float
    utilization: float


class AlertOut(BaseModel):
    timestamp: str
    dpid: int
    port: int
    utilization: float
    message: str