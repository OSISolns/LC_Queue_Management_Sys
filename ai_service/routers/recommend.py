from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..models_impl.routing import recommend_counter

router = APIRouter()

class RecommendRequest(BaseModel):
    service_type: str
    priority_id: int

@router.post("/counter")
def api_recommend_counter(req: RecommendRequest):
    try:
        result = recommend_counter(req.service_type, req.priority_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
