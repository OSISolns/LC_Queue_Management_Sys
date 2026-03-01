from fastapi import APIRouter
from ..anomaly import get_current_anomalies

router = APIRouter()

@router.get("/anomalies")
def api_get_anomalies():
    anomalies = get_current_anomalies()
    return {"anomalies": anomalies, "count": len(anomalies)}
