"""
reports.py — AI Service Router
Exposes POST /api/v1/reports/roster_insights
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import logging

from ..models_impl.roster_insights import generate_roster_insights

router = APIRouter()
logger = logging.getLogger(__name__)


class RosterAssignmentInput(BaseModel):
    id: int
    staff_id: int
    staff_name: str
    role: str
    department_id: int
    department_name: Optional[str] = "Unknown"
    shift_start_time: str  # "HH:MM" or "HH:MM:SS"
    shift_end_time: str
    shift_label: str
    date: str  # "YYYY-MM-DD"


class RosterInsightsRequest(BaseModel):
    start_date: str   # "YYYY-MM-DD"
    end_date: str     # "YYYY-MM-DD"
    period: str       # "weekly" | "monthly" | "quarterly" | "yearly"
    assignments: List[RosterAssignmentInput]


@router.post("/roster_insights")
def api_get_roster_insights(req: RosterInsightsRequest):
    """
    Analyse a collection of roster assignments over a date range and return
    AI-generated KPIs, warnings, and a natural language narrative.
    """
    try:
        result = generate_roster_insights(
            req.assignments,
            req.start_date,
            req.end_date,
            req.period,
        )
        return result
    except Exception as exc:
        logger.error(f"Roster insights generation failed: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"AI report generation failed: {exc}")
