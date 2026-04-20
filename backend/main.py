from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager
import requests
import time

import database, models, schemas

import requests

RYU_CONTROL_URL = "http://127.0.0.1:8080/qos/limit"
RYU_URL = "http://127.0.0.1:8080/stats"
POLL_INTERVAL = 5
ALERT_THRESHOLD = 70  # %

models.Base.metadata.create_all(bind=database.engine)


# BACKGROUND TASK

def fetch_and_store():
    db = database.SessionLocal()

    try:
        res = requests.get(RYU_URL, timeout=3)
        data = res.json()

        for dpid, ports in data.items():
            for port, stat in ports.items():

                tx = stat["tx_mbps"]
                rx = stat["rx_mbps"]
                util = stat["utilization"]

                row = models.FlowMetric(
                    dpid=int(dpid),
                    port=int(port),
                    tx_mbps=tx,
                    rx_mbps=rx,
                    utilization=util
                )

                db.add(row)

                # ALERT
                if util > ALERT_THRESHOLD:
                    db.add(models.Alert(
                        dpid=int(dpid),
                        port=int(port),
                        utilization=util,
                        message=f"High utilization {util}%"
                    ))

        db.commit()

    except Exception as e:
        print("[ERROR fetch]", e)

    finally:
        db.close()


def scheduler():
    while True:
        fetch_and_store()
        time.sleep(POLL_INTERVAL)


# FASTAPI

@asynccontextmanager
async def lifespan(app: FastAPI):
    import threading
    t = threading.Thread(target=scheduler, daemon=True)
    t.start()
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# API

@app.get("/metrics", response_model=list[schemas.FlowStatOut])
def get_metrics(db: Session = Depends(database.get_db)):
    rows = db.query(models.FlowMetric)\
        .order_by(models.FlowMetric.timestamp.desc())\
        .limit(100)\
        .all()

    return [
        schemas.FlowStatOut(
            timestamp=r.timestamp.isoformat(),
            dpid=r.dpid,
            port=r.port,
            tx_mbps=r.tx_mbps,
            rx_mbps=r.rx_mbps,
            utilization=r.utilization
        )
        for r in reversed(rows)
    ]


@app.get("/alerts", response_model=list[schemas.AlertOut])
def get_alerts(db: Session = Depends(database.get_db)):
    rows = db.query(models.Alert)\
        .order_by(models.Alert.timestamp.desc())\
        .limit(50)\
        .all()

    return [
        schemas.AlertOut(
            timestamp=r.timestamp.isoformat(),
            dpid=r.dpid,
            port=r.port,
            utilization=r.utilization,
            message=r.message
        )
        for r in rows
    ]


@app.get("/health")
def health():
    return {"status": "ok"}

# CONTROL API
@app.post("/control/limit")
def limit_bandwidth(dpid: int, port: int, rate: int):
    """
    rate: Mbps
    """

    res = requests.post(RYU_CONTROL_URL, json={
    "dpid": dpid,
    "port": port,
    "rate": rate
})

    try:
        return res.json()
    except:
        return {
            "status": "ok",
            "ryu_response": res.text
        }