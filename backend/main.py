from fastapi import FastAPI, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func as F
from typing import Optional
import database, models, schemas

# Tạo bảng nếu chưa có
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="SDN Monitor API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Nhận dữ liệu từ Ryu và iperf3 ─────────────────────────────────

@app.post("/stats/flow")
def receive_flow(stat: schemas.FlowStatIn,
                 db: Session = Depends(database.get_db)):
    db.add(models.FlowMetric(**stat.model_dump()))
    db.commit()
    return {"status": "ok"}

@app.post("/stats/iperf")
def receive_iperf(stat: schemas.IperfStatIn,
                  db: Session = Depends(database.get_db)):
    db.add(models.IperfMetric(**stat.model_dump()))
    db.commit()
    return {"status": "ok"}

# ── Cung cấp dữ liệu cho React Dashboard ──────────────────────────

@app.get("/metrics/throughput", response_model=list[schemas.FlowStatOut])
def get_throughput(
    topology: Optional[str] = None,
    limit: int = Query(60, le=500),
    db: Session = Depends(database.get_db)
):
    q = db.query(models.FlowMetric)
    if topology:
        q = q.filter(models.FlowMetric.topology == topology)
    rows = q.order_by(models.FlowMetric.timestamp.desc()).limit(limit).all()
    return [
        schemas.FlowStatOut(
            timestamp=r.timestamp.isoformat(),
            dpid=r.dpid, port=r.port, topology=r.topology,
            throughput_mbps=round(r.throughput_mbps, 3),
        ) for r in reversed(rows)
    ]

@app.get("/metrics/jitter", response_model=list[schemas.IperfStatOut])
def get_jitter(
    topology: Optional[str] = None,
    limit: int = Query(60, le=500),
    db: Session = Depends(database.get_db)
):
    q = db.query(models.IperfMetric)
    if topology:
        q = q.filter(models.IperfMetric.topology == topology)
    rows = q.order_by(models.IperfMetric.timestamp.desc()).limit(limit).all()
    return [
        schemas.IperfStatOut(
            timestamp=r.timestamp.isoformat(),
            topology=r.topology,
            throughput_mbps=round(r.throughput_mbps, 3),
            jitter_ms=round(r.jitter_ms, 4),
            packet_loss_pct=round(
                r.lost_packets / max(r.total_packets, 1) * 100, 2
            ),
        ) for r in reversed(rows)
    ]

@app.get("/metrics/summary")
def get_summary(
    topology: Optional[str] = None,
    db: Session = Depends(database.get_db)
):
    fq = db.query(models.FlowMetric)
    iq = db.query(models.IperfMetric)
    if topology:
        fq = fq.filter(models.FlowMetric.topology == topology)
        iq = iq.filter(models.IperfMetric.topology == topology)

    flow  = fq.with_entities(
        F.avg(models.FlowMetric.throughput_mbps),
        F.max(models.FlowMetric.throughput_mbps),
        F.min(models.FlowMetric.throughput_mbps),
    ).first()
    iperf = iq.with_entities(
        F.avg(models.IperfMetric.jitter_ms),
        F.max(models.IperfMetric.jitter_ms),
    ).first()

    return {
        "avg_throughput_mbps": round(flow[0] or 0, 2),
        "max_throughput_mbps": round(flow[1] or 0, 2),
        "min_throughput_mbps": round(flow[2] or 0, 2),
        "avg_jitter_ms":       round(iperf[0] or 0, 4),
        "max_jitter_ms":       round(iperf[1] or 0, 4),
    }

@app.get("/health")
def health():
    return {"status": "ok"}