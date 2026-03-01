from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from ..models_impl.wait_time import predict_wait_time
from ..models_impl.duration import predict_duration

router = APIRouter()

class WaitTimeRequest(BaseModel):
    hour: int
    day_of_week: int
    service_type: str
    priority: int

class DurationRequest(BaseModel):
    hour: int
    day_of_week: int
    service_type: str
    priority: int
    counter_id: str

@router.post("/wait_time")
def api_predict_wait_time(req: WaitTimeRequest):
    result = predict_wait_time(req.dict())
    if "error" in result:
        raise HTTPException(status_code=503, detail=result["error"])
    return result

@router.post("/service_duration")
def api_predict_service_duration(req: DurationRequest):
    result = predict_duration(req.dict())
    if "error" in result:
        raise HTTPException(status_code=503, detail=result["error"])
    return result
