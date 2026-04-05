from sqlalchemy import Column, Integer, Float, String, DateTime, func
from database import Base

class FlowMetric(Base):
    """Throughput từ Ryu PortStats — poll mỗi 10s"""
    __tablename__ = "flow_metrics"

    id              = Column(Integer, primary_key=True, index=True)
    timestamp       = Column(DateTime, server_default=func.now(), index=True)
    dpid            = Column(Integer)
    port            = Column(Integer)
    topology        = Column(String, default="single")
    throughput_mbps = Column(Float)
    tx_bytes        = Column(Float)
    rx_bytes        = Column(Float)
    tx_errors       = Column(Integer, default=0)
    rx_errors       = Column(Integer, default=0)

class IperfMetric(Base):
    """Jitter + throughput từ iperf3 UDP"""
    __tablename__ = "iperf_metrics"

    id              = Column(Integer, primary_key=True, index=True)
    timestamp       = Column(DateTime, server_default=func.now(), index=True)
    topology        = Column(String, default="single")
    throughput_mbps = Column(Float)
    jitter_ms       = Column(Float)
    lost_packets    = Column(Integer, default=0)
    total_packets   = Column(Integer, default=0)