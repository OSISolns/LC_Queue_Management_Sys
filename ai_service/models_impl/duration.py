import pandas as pd
import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
from datetime import datetime

from ..feature_store import get_db_connection
from ..registry.manager import registry
from ..config import settings

def extract_training_data_duration():
    """Extract dataset for Service Duration Prediction."""
    with get_db_connection() as conn:
        query = """
            SELECT 
                q.id, q.service_start_at, q.service_end_at, q.service_type, q.priority_id, q.counter_id
            FROM queue q
            WHERE q.service_start_at IS NOT NULL AND q.service_end_at IS NOT NULL
        """
        df = pd.read_sql_query(query, conn)
        
    if df.empty:
        return df

    df['service_start_at'] = pd.to_datetime(df['service_start_at'], errors='coerce')
    df['service_end_at'] = pd.to_datetime(df['service_end_at'], errors='coerce')
    df = df.dropna(subset=['service_start_at', 'service_end_at'])

    df['duration_seconds'] = (df['service_end_at'] - df['service_start_at']).dt.total_seconds()
    
    # Filter anomalous durations (e.g. less than 10 seconds or more than 2 hours)
    df = df[(df['duration_seconds'] >= 10) & (df['duration_seconds'] <= 2 * 3600)]

    df['hour'] = df['service_start_at'].dt.hour
    df['day_of_week'] = df['service_start_at'].dt.dayofweek
    df['service_type'] = df['service_type'].fillna('default')
    df['priority'] = df['priority_id'].fillna(2)
    df['counter_id'] = df['counter_id'].fillna('unknown')
    
    return df

def train_duration_model():
    """Trains the service duration prediction model and saves it."""
    print("Extracting duration dataset...")
    df = extract_training_data_duration()
    
    if df is None or len(df) < 50:
        raise ValueError("Not enough historical data to train the duration model.")

    X = df[['hour', 'day_of_week', 'service_type', 'priority', 'counter_id']]
    y = df['duration_seconds']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, shuffle=False)

    categorical_features = ['service_type', 'priority', 'counter_id']
    categorical_transformer = OneHotEncoder(handle_unknown='ignore')

    preprocessor = ColumnTransformer(
        transformers=[
            ('cat', categorical_transformer, categorical_features)
        ],
        remainder='passthrough'
    )

    pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('regressor', HistGradientBoostingRegressor(random_state=42))
    ])

    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    mae_seconds = mean_absolute_error(y_test, y_pred)
    mae_minutes = mae_seconds / 60.0

    print(f"Service Duration Model Evaluation (Test MAE): {mae_minutes:.2f} mins")

    metadata = {
        "model_type": "duration",
        "dataset_size": len(df),
        "mae_seconds": float(mae_seconds),
        "mae_minutes": float(mae_minutes)
    }

    signature = {
        "inputs": [
            {"name": "hour", "type": "int"},
            {"name": "day_of_week", "type": "int"},
            {"name": "service_type", "type": "string"},
            {"name": "priority", "type": "int"},
            {"name": "counter_id", "type": "string"}
        ],
        "output": {"name": "duration_seconds", "type": "float"}
    }

    version = registry.save_model("duration", pipeline, metadata, signature)
    registry.promote_model("duration", version)
    
    return metadata

def predict_duration(features: dict) -> dict:
    pipeline, metadata = registry.get_active_model("duration")
    
    if not pipeline:
        return {"error": "No active duration model found."}
        
    df_features = pd.DataFrame([features])
    pred_seconds = pipeline.predict(df_features)[0]
    
    return {
        "predicted_duration_seconds": float(pred_seconds),
        "predicted_duration_minutes": float(pred_seconds / 60.0),
        "model_version": metadata.get("version", "unknown")
    }
