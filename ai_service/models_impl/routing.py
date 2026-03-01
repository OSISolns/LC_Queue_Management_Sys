import pandas as pd
from datetime import datetime

from ..feature_store import get_db_connection
from .duration import predict_duration

def recommend_counter(service_type: str, priority_id: int):
    """
    Recommends the best counter based on priority and predicted service durations.
    Returns:
        {
            "recommended_counter_id": str,
            "estimated_wait_seconds": float,
            "reason": str
        }
    """
    # 1. Get all active counters that handle this service type (from DB)
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # In a real app, counters/rooms and services have a mapping.
        # Here we look at the last hour to see which counters handled this service type
        # Or just fall back to all active counters if none specific found
        cursor.execute("""
            SELECT DISTINCT counter_id 
            FROM queue 
            WHERE status IN ('calling', 'waiting') 
              AND counter_id IS NOT NULL
        """)
        active_counters = [row['counter_id'] for row in cursor.fetchall()]

    if not active_counters:
        return {
            "recommended_counter_id": "Counter-1", # Fallback
            "estimated_wait_seconds": 300.0,
            "reason": "No active counters found, falling back to default."
        }
        
    # 2. Estimate queue wait per counter
    # For each counter, find how many people are waiting
    # Then add predicted service duration for the new ticket 
    # to estimate total wait time till completion.
    
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
        
        # Predict duration using ML for this specific ticket at this counter
        duration_resp = predict_duration(features)
        ticket_duration = duration_resp.get('predicted_duration_seconds', 300.0)
        
        # Apply strict priority rules
        # If 'Emergency' (0), we route to fastest clearing counter regardless of queue size
        if priority_id == 0:
            if ticket_duration < min_wait:
                min_wait = ticket_duration
                best_counter = counter_id
            continue

        # Otherwise, estimate wait time behind existing queue
        with get_db_connection() as conn:
            c = conn.cursor()
            c.execute("""
                SELECT COUNT(*) as q_len 
                FROM queue 
                WHERE status = 'waiting' AND counter_id = ?
            """, (counter_id,))
            res = c.fetchone()
            q_len = res['q_len'] if res else 0

        # Rough estimate: queue length * expected duration
        estimated_wait = q_len * ticket_duration
        
        if estimated_wait < min_wait:
            min_wait = estimated_wait
            best_counter = counter_id

    # Fallback if logic somehow fails
    if best_counter is None:
        best_counter = active_counters[0]

    return {
        "recommended_counter_id": best_counter,
        "estimated_wait_seconds": min_wait,
        "reason": f"Selected {best_counter} based on minimum combined wait time and priority rules."
    }
