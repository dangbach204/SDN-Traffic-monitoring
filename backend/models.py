from sqlalchemy import Column, Integer, Float, String, DateTime, func
from database import Base

class FlowMetric(Base):
    __tablename__ = "flow_metrics"

    id          = Column(Integer, primary_key=True, index=True)
    timestamp   = Column(DateTime, server_default=func.now(), index=True)

    dpid        = Column(Integer, index=True)
    port        = Column(Integer, index=True)
    topology    = Column(String, default="3sw")

    tx_mbps     = Column(Float)
    rx_mbps     = Column(Float)
    utilization = Column(Float)

class Alert(Base):
    __tablename__ = "alerts"

    id          = Column(Integer, primary_key=True)
    timestamp   = Column(DateTime, server_default=func.now())

    dpid        = Column(Integer)
    port        = Column(Integer)
    utilization = Column(Float)

    message     = Column(String)