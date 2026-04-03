from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from ..clinical_advisor import clinical_advisor

router = APIRouter()

class VitalsAnalysisRequest(BaseModel):
    current_vitals: Dict[str, Any]
    history: Optional[List[Dict[str, Any]]] = []

class AllergyCheckRequest(BaseModel):
    medication_name: str
    patient_allergies: Optional[str] = ""

@router.post("/analyze_vitals")
def api_analyze_vitals(req: VitalsAnalysisRequest):
    """
    Analyzes current vitals and compares to historical vitals if provided.
    Returns findings, alerts, and chronic occurrence warnings.
    """
    try:
        results = clinical_advisor.analyze_vitals(req.current_vitals, req.history)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/check_allergy")
def api_check_allergy(req: AllergyCheckRequest):
    """
    Checks if a medication name overlaps with patient's allergy records.
    """
    try:
        results = clinical_advisor.check_allergy_risk(req.medication_name, req.patient_allergies)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

import requests
import time
from bs4 import BeautifulSoup
import json

_schedule_cache = {
    "data": None,
    "last_fetched": 0
}

@router.get("/schedules")
def api_get_doctor_schedules():
    """
    Fetches doctor schedules directly from the Legacy Clinics website.
    Includes a 1-hour cache to avoid excessive requests.
    """
    current_time = time.time()
    if _schedule_cache["data"] and (current_time - _schedule_cache["last_fetched"] < 3600):
        return _schedule_cache["data"]

    url = "https://www.legacyclinics.rw/spip.php?page=schedule"
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        schedules = []
        sections = soup.find_all('h2')
        
        for section in sections:
            dept_name = section.get_text(strip=True)
            if not dept_name or any(skip in dept_name for skip in ["Home", "Schedule", "Roster", "Kindly Note", "Departments"]):
                continue
            
            doctors = []
            next_node = section.find_next_sibling()
            while next_node and next_node.name != 'h2':
                if next_node.name == 'ul':
                    for li in next_node.find_all('li'):
                        text = li.get_text(strip=True)
                        if ':' in text:
                            parts = text.split(':', 1)
                            doctors.append({
                                "name": parts[0].strip(),
                                "availability": parts[1].strip() if len(parts) > 1 else ""
                            })
                elif next_node.name == 'p':
                    text = next_node.get_text(strip=True)
                    if ':' in text and not text.startswith('Kindly Note'):
                        parts = text.split(':', 1)
                        doctors.append({
                            "name": parts[0].strip(),
                            "availability": parts[1].strip() if len(parts) > 1 else ""
                        })
                next_node = next_node.find_next_sibling()
            
            if doctors:
                schedules.append({
                    "department": dept_name,
                    "doctors": doctors
                })
        
        if schedules:
            _schedule_cache["data"] = schedules
            _schedule_cache["last_fetched"] = current_time
            return schedules
        else:
            if _schedule_cache["data"]:
                return _schedule_cache["data"]
            return []
    except Exception as e:
        if _schedule_cache["data"]:
                return _schedule_cache["data"]
        raise HTTPException(status_code=500, detail=f"Failed to fetch schedules: {str(e)}")
