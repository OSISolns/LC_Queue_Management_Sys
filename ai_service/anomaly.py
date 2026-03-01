from datetime import datetime
import sqlite3

from .feature_store import get_db_connection

def check_counter_idle_anomalies():
    """Returns a list of counters that are idle while there are waiting patients."""
    anomalies = []
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Are there any waiting patients?
        cursor.execute("SELECT COUNT(*) as waiting_count FROM queue WHERE status = 'waiting'")
        res = cursor.fetchone()
        waiting_count = res['waiting_count'] if res else 0
        
        if waiting_count == 0:
            return anomalies # No queue, no anomaly
            
        # Check for active counters (ones that exist but aren't calling anyone)
        # Assuming we can find counter_id from recent completed/called tickets
        
        # Find counters that haven't called anyone in the last 15 minutes but were active today
        cursor.execute("""
            SELECT counter_id, MAX(called_at) as last_called
            FROM queue 
            WHERE 
              called_at IS NOT NULL 
              AND called_at > datetime('now', '-1 day')
              AND counter_id IS NOT NULL
            GROUP BY counter_id
        """)
        
        for row in cursor.fetchall():
            counter_id = row['counter_id']
            last_called_str = row['last_called']
            if not last_called_str:
                continue
            
            # Remove Z or parse
            last_called = datetime.fromisoformat(last_called_str.replace('Z', '+00:00'))
            idle_seconds = (datetime.utcnow().replace(tzinfo=last_called.tzinfo) - last_called).total_seconds()
            
            # If idle for > 15 mins (900s) and there are people waiting
            if idle_seconds > 900:
                anomalies.append({
                    "type": "idle_counter",
                    "counter_id": counter_id,
                    "idle_minutes": round(idle_seconds / 60, 1),
                    "description": f"Counter {counter_id} has been idle for {round(idle_seconds / 60, 1)} minutes while {waiting_count} patients wait."
                })
                
    return anomalies

def check_wait_spike_anomalies(ticket_features: dict, predicted_wait_seconds: float):
    """Checks if the newly predicted wait deviates heavily from rolling average."""
    service_type = ticket_features.get('service_type', 'default')
    rolling_avg = ticket_features.get('rolling_avg_service_time_per_service_type', 300)
    
    # If predicted wait is > 30 mins AND > 3x the rolling average
    if predicted_wait_seconds > 1800 and predicted_wait_seconds > 3 * rolling_avg:
        return {
            "type": "wait_spike",
            "service_type": service_type,
            "predicted_wait_minutes": round(predicted_wait_seconds / 60, 1),
            "description": f"Wait time spike detected for {service_type}: {round(predicted_wait_seconds/60, 1)} mins predicted."
        }
    return None

def get_current_anomalies():
    """Aggregates all current system anomalies."""
    anomalies = []
    anomalies.extend(check_counter_idle_anomalies())
    return anomalies
