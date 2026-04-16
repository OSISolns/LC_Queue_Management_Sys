import pandas as pd
from datetime import datetime
import logging

from ..feature_store import get_db_connection
from .duration import predict_duration

logger = logging.getLogger(__name__)

def get_available_doctors(age: Optional[int] = None):
    """Find doctors who are rostered today, available, and not currently busy."""
    day_name = datetime.now().strftime("%A")
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Base query
        query = """
            SELECT u.id, u.full_name, u.room_number, u.salutation, d.name as department_name
            FROM users u
            JOIN roles r ON u.role_id = r.id
            JOIN doctor_rosters dr ON u.id = dr.doctor_id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.is_active = 1 
              AND u.is_available = 1
              AND (r.name = 'Doctor' OR r.category = 'Doctor')
              AND dr.day_of_week = ?
              AND dr.status = 'available'
              AND u.id NOT IN (
                  SELECT doctor_id FROM queue 
                  WHERE status IN ('calling', 'in-consultation') 
                    AND doctor_id IS NOT NULL
              )
        """
        
        # Pediatrics Restriction: Only kids (<= 15) in Pediatrics
        if age is not None and age > 15:
            query += " AND (d.name IS NULL OR d.name NOT LIKE '%Pediatrics%')"
        
        cursor.execute(query, (day_name,))
        doctors = [dict(row) for row in cursor.fetchall()]
        return doctors

def recommend_counter(service_type: str, priority_id: int, age: Optional[int] = None):
    """
    Recommends the best counter/doctor based on priority, availability, and predicted durations.
    """
    service_type_lower = service_type.lower() if service_type else ""
    is_clinical = service_type_lower in ["consultation", "review"]

    # 1. If it's a clinical visit, try to find an available doctor first
    if is_clinical:
        available_doctors = get_available_doctors(age)
        if available_doctors:
            # If we find doctors who are free NOW, pick one
            doc = available_doctors[0]
            name = f"{doc['salutation'] or 'Dr.'} {doc['full_name']}"
            return {
                "recommended_counter_id": doc['room_number'] or "Consultation Room",
                "recommended_doctor_id": doc['id'],
                "estimated_wait_seconds": 0.0,
                "reason": f"AI selected {name} who is currently available and rostered for {service_type}."
            }

    # 2. Fallback to generic counter recommendation based on queue length
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Determine active counters from recent queue activity
        query = """
            SELECT DISTINCT q.room_number as counter_id, d.name as department_name
            FROM queue q
            LEFT JOIN users u ON q.room_number = u.room_number
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE q.status IN ('calling', 'waiting') 
              AND q.room_number IS NOT NULL
        """
        
        if age is not None and age > 15:
            # Exclude Pediatrics rooms
            query += " AND (d.name IS NULL OR d.name NOT LIKE '%Pediatrics%')"
            
        cursor.execute(query)
        active_counters = [row['counter_id'] for row in cursor.fetchall()]

    if not active_counters:
        # Final safety fallback: get any room from non-pediatrics if age > 15
        return {
            "recommended_counter_id": "General-1",
            "estimated_wait_seconds": 300.0,
            "reason": "AI selected default routing (Age restriction applied if applicable)."
        }
        
    best_counter = None
    min_wait = float('inf')
    
    now = datetime.utcnow()
    features = {
        "hour": now.hour,
        "day_of_week": now.weekday(),
        "service_type": service_type,
        "priority": priority_id
    }
    
    for counter_id in active_counters:
        features["counter_id"] = counter_id
        
        # Predict duration for this ticket at this counter
        duration_resp = predict_duration(features)
        ticket_duration = duration_resp.get('predicted_duration_seconds', 300.0)
        
        # Estimate wait time behind existing queue
        with get_db_connection() as conn:
            c = conn.cursor()
            c.execute("""
                SELECT COUNT(*) as q_len 
                FROM queue 
                WHERE status = 'waiting' AND (room_number = ? OR target_room = ?)
            """, (counter_id, counter_id))
            res = c.fetchone()
            q_len = res['q_len'] if res else 0

        estimated_wait = q_len * ticket_duration
        
        if estimated_wait < min_wait:
            min_wait = estimated_wait
            best_counter = counter_id

    if best_counter is None:
        best_counter = active_counters[0]

    return {
        "recommended_counter_id": best_counter,
        "estimated_wait_seconds": min_wait,
        "reason": f"Selected Room {best_counter} based on minimum predicted queue wait time (Age verified)."
    }

