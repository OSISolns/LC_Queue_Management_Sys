import httpx
import os
import logging
from functools import lru_cache
from typing import Optional, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)

# Cache configuration (very short TTL to keep data relatively fresh without spamming AI)
from cachetools import TTLCache
ai_cache = TTLCache(maxsize=1000, ttl=60) # 60 seconds

# In a real deployed environment, AI_SERVICE_URL would come from ENV vars or config
# Updated to point to the docker-compose service name by default
AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "https://127.0.0.1:8001/api/v1")

class QMSAIClient:
    """Client for interacting with the separate qms-ai-service."""
    
    def __init__(self, base_url: str = AI_SERVICE_URL):
        self.base_url = base_url
        self.timeout = 2.0 # Fast failure is critical for frontend UX

    def _fallback_wait_time(self) -> Dict[str, Any]:
        """Safe fallback deterministic value if AI is down."""
        logger.warning("Falling back to deterministic wait time prediction.")
        return {
            "predicted_wait_seconds": 900.0, # 15 mins default
            "predicted_wait_minutes": 15.0,
            "model_version": "fallback_rule",
            "is_fallback": True
        }

    def _fallback_recommendation(self) -> Dict[str, Any]:
        """Safe fallback strategy if AI routing is down."""
        logger.warning("Falling back to basic routing recommendation.")
        return {
            "recommended_counter_id": "General-1", # Assuming a default exists
            "estimated_wait_seconds": 900.0,
            "reason": "AI service unavailable. Using default routing.",
            "is_fallback": True
        }

    async def get_wait_time(self, hour: int, day_of_week: int, service_type: str, priority: int) -> Dict[str, Any]:
        cache_key = f"wait_time:{hour}:{day_of_week}:{service_type}:{priority}"
        if cache_key in ai_cache:
            return ai_cache[cache_key]

        payload = {
            "hour": hour,
            "day_of_week": day_of_week,
            "service_type": service_type,
            "priority": priority
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout, verify=False) as client:
                resp = await client.post(f"{self.base_url}/predict/wait_time", json=payload)
                resp.raise_for_status()
                data = resp.json()
                data["is_fallback"] = False
                ai_cache[cache_key] = data
                return data
        except Exception as e:
            logger.error(f"AI Service Wait Time prediction failed: {str(e)}")
            return self._fallback_wait_time()

    async def get_counter_recommendation(self, service_type: str, priority_id: int, age: Optional[int] = None) -> Dict[str, Any]:
        cache_key = f"recommend:{service_type}:{priority_id}:{age}"
        if cache_key in ai_cache:
            return ai_cache[cache_key]

        payload = {
            "service_type": service_type,
            "priority_id": priority_id,
            "age": age
        }


        try:
            async with httpx.AsyncClient(timeout=self.timeout, verify=False) as client:
                resp = await client.post(f"{self.base_url}/recommend/counter", json=payload)
                resp.raise_for_status()
                data = resp.json()
                data["is_fallback"] = False
                ai_cache[cache_key] = data
                return data
        except Exception as e:
            logger.error(f"AI Service Routing recommendation failed: {str(e)}")
            return self._fallback_recommendation()

    def _fallback_roster_insights(self, period: str) -> Dict[str, Any]:
        """Fallback when AI service is unavailable for roster insights."""
        return {
            "kpis": {"period": period, "total_staff_rostered": 0, "total_shifts": 0, "total_hours_rostered": 0},
            "narrative": (
                "## AI Roster Report\n\n"
                "⚠️ **The AI Service is temporarily unavailable.** "
                "Please try again shortly or check that the AI service container is running."
            ),
            "warnings": {"burnout_risks": [], "coverage_gaps": [], "low_staffed_departments": []},
            "optimizations": ["AI service offline — insights unavailable."],
            "department_breakdown": [],
            "staff_breakdown": [],
            "is_fallback": True,
        }

    async def get_roster_insights(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Call the AI service to generate roster insights for the given period."""
        period = payload.get("period", "unknown")
        try:
            async with httpx.AsyncClient(timeout=30.0, verify=False) as client:
                resp = await client.post(f"{self.base_url}/reports/roster_insights", json=payload)
                resp.raise_for_status()
                data = resp.json()
                data["is_fallback"] = False
                return data
        except Exception as e:
            logger.error(f"AI Roster Insights failed: {str(e)}")
            return self._fallback_roster_insights(period)

# Singleton instance
ai_client = QMSAIClient()
