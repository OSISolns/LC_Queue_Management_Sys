from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..models_impl.forecast import predict_arrivals

router = APIRouter()

class ForecastRequest(BaseModel):
    hour: int
    day_of_week: int
    arrivals_prev_hour: float
    arrivals_prev_day_same_hour: float

@router.post("/arrivals")
def api_forecast_arrivals(req: ForecastRequest):
    result = predict_arrivals(req.dict())
    if "error" in result:
        raise HTTPException(status_code=503, detail=result["error"])
    return result
