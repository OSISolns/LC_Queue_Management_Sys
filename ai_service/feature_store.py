import pandas as pd
from datetime import datetime
import json
import sqlite3
import os
from contextlib import contextmanager

from .config import settings

@contextmanager
def get_db_connection():
    db_path = settings.DATABASE_URL.replace("sqlite:///", "")
    conn = sqlite3.connect(db_path)
    # Return rows as dictionaries
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def compute_ticket_features(ticket_row, conn: sqlite3.Connection):
    """
    Computes feature dict for a single ticket.
    Expected ticket_row fields:
    - id (ticket_id)
    - created_at
    - service_type
    - priority_id
    """
    try:
        if isinstance(ticket_row['created_at'], str):
            # Parse typical sqlite datetime: "YYYY-MM-DD HH:MM:SS" or isoformat
            created_at = datetime.fromisoformat(ticket_row['created_at'].replace('Z', '+00:00'))
        else:
            created_at = ticket_row['created_at']
    except Exception:
        created_at = datetime.utcnow()

    hour = created_at.hour
    day_of_week = created_at.weekday()

    # Query active queue length (number of waiting tickets ahead of this one, roughly)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT COUNT(*) as queue_len FROM queue WHERE status = 'waiting' AND created_at <= ?", 
        (ticket_row['created_at'],)
    )
    res = cursor.fetchone()
    queue_len_at_create = res['queue_len'] if res else 0

    # Query active counters
    cursor.execute("SELECT COUNT(DISTINCT room_number) as active_counters FROM queue WHERE status = 'calling'")
    res = cursor.fetchone()
    active_counters = res['active_counters'] if res else 1

    service_type = ticket_row.get('service_type', 'default')

    # Query rolling average service time for this service type from counter_stats
    cursor.execute("""
        SELECT AVG(rolling_avg_time_seconds) as avg_time 
        FROM counter_stats 
        WHERE service_type = ?
    """, (service_type,))
    res = cursor.fetchone()
    rolling_avg_service_time = res['avg_time'] if res and res['avg_time'] else 300 # Default fallback

    features = {
        "hour": hour,
        "day_of_week": day_of_week,
        "priority": ticket_row.get('priority_id', 2), # 2 is Standard
        "service_type": service_type,
        "queue_len_at_create": queue_len_at_create,
        "active_counters": max(active_counters, 1),
        "rolling_avg_service_time_per_service_type": rolling_avg_service_time
    }
    return features

def extract_training_data_wait_time():
    """Extract and prepare the training dataset for Wait Time Prediction."""
    with get_db_connection() as conn:
        query = """
            SELECT 
                q.id, q.created_at, q.called_at, q.service_type, q.priority_id, q.counter_id
            FROM queue q
            WHERE q.called_at IS NOT NULL
        """
        df = pd.read_sql_query(query, conn)
        
    if df.empty:
        return df

    # Parse dates
    df['created_at'] = pd.to_datetime(df['created_at'], errors='coerce')
    df['called_at'] = pd.to_datetime(df['called_at'], errors='coerce')

    # Drop rows with invalid dates
    df = df.dropna(subset=['created_at', 'called_at'])

    # Compute target: wait time in seconds
    df['wait_seconds'] = (df['called_at'] - df['created_at']).dt.total_seconds()

    # Filter out anomalous times (negative or > 4 hours)
    df = df[(df['wait_seconds'] >= 0) & (df['wait_seconds'] <= 4 * 3600)]

    # Compute basic features
    df['hour'] = df['created_at'].dt.hour
    df['day_of_week'] = df['created_at'].dt.dayofweek
    df['service_type'] = df['service_type'].fillna('default')
    df['priority'] = df['priority_id'].fillna(2) # Default S
    
    # Normally we would compute queue_len_at_create for each historical entry.
    # For speed in simulation/offline training, we can approximate or compute it via window functions 
    # if using Postgres. With SQLite, an apply function is needed.
    # For MVP, we will only use hour, day_of_week, service_type, priority.
    
    return df
