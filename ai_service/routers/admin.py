from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from ..models_impl.wait_time import train_wait_time_model
from ..models_impl.duration import train_duration_model
from ..models_impl.forecast import train_forecast_model
from ..registry.manager import registry
# from ..security import get_current_admin_user # To be implemented

router = APIRouter()
# router = APIRouter(dependencies=[Depends(get_current_admin_user)])

class PromoteRequest(BaseModel):
    model_type: str
    version: str

@router.post("/train/wait_time")
def api_train_wait_time():
    try:
        metrics = train_wait_time_model()
        return {"message": "Wait time model trained successfully", "metrics": metrics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/train/duration")
def api_train_duration():
    try:
        metrics = train_duration_model()
        return {"message": "Duration model trained successfully", "metrics": metrics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/train/forecast")
def api_train_forecast():
    try:
        metrics = train_forecast_model()
        return {"message": "Forecast model trained successfully", "metrics": metrics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/promote_model")
def api_promote_model(req: PromoteRequest):
    try:
        registry.promote_model(req.model_type, req.version)
        return {"message": f"Successfully promoted {req.model_type} {req.version} to ACTIVE."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/rollback_model")
def api_rollback_model(req: PromoteRequest):
    # Rollback is functionally identically to promote in this simple registry
    return api_promote_model(req)
