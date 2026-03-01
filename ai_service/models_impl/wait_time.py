import pandas as pd
import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
from datetime import datetime

from ..feature_store import extract_training_data_wait_time
from ..registry.manager import registry
from ..config import settings

def train_wait_time_model():
    """Extracts data, trains the wait time model, and registers the new version."""
    
    print("Extracting dataset...")
    df = extract_training_data_wait_time()
    
    if df is None or len(df) < 50:
        raise ValueError("Not enough historical data to train the model (need at least 50 valid tickets).")

    print(f"Dataset extracted: {len(df)} rows.")

    # Features: hour, day_of_week, service_type, priority
    # Target: wait_seconds
    X = df[['hour', 'day_of_week', 'service_type', 'priority']]
    y = df['wait_seconds']

    # Time-based split to avoid leakage (train on older data, test on newer)
    # df is naturally ordered by created_at since it's queried from DB. We can use train_test_split without shuffling.
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, shuffle=False)

    print(f"Training shapes: X_train {X_train.shape}, y_train {y_train.shape}")

    # Build Pipeline
    categorical_features = ['service_type', 'priority']
    categorical_transformer = OneHotEncoder(handle_unknown='ignore')

    preprocessor = ColumnTransformer(
        transformers=[
            ('cat', categorical_transformer, categorical_features)
        ],
        remainder='passthrough' # hour, day_of_week are passed directly
    )

    pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('regressor', HistGradientBoostingRegressor(random_state=42))
    ])

    print("Training model...")
    pipeline.fit(X_train, y_train)

    print("Evaluating model...")
    y_pred = pipeline.predict(X_test)
    mae_seconds = mean_absolute_error(y_test, y_pred)
    mae_minutes = mae_seconds / 60.0
    
    y_pred_train = pipeline.predict(X_train)
    mae_train_minutes = mean_absolute_error(y_train, y_pred_train) / 60.0

    print(f"Wait Time Model Evaluation: MAE {mae_minutes:.2f} mins (Test) | {mae_train_minutes:.2f} mins (Train)")

    # Prepare metadata
    metadata = {
        "model_type": "wait_time",
        "dataset_size": len(df),
        "train_size": len(X_train),
        "test_size": len(X_test),
        "mae_seconds": float(mae_seconds),
        "mae_minutes": float(mae_minutes)
    }

    signature = {
        "inputs": [
            {"name": "hour", "type": "int"},
            {"name": "day_of_week", "type": "int"},
            {"name": "service_type", "type": "string"},
            {"name": "priority", "type": "int"}
        ],
        "output": {"name": "wait_seconds", "type": "float"}
    }

    print("Saving model to registry...")
    version = registry.save_model("wait_time", pipeline, metadata, signature)
    
    # Auto-promote for now since this is the primary training mechanism
    # In a real environment, this would be an explicit admin call.
    registry.promote_model("wait_time", version)
    
    print(f"Wait Time Model version {version} saved and promoted to ACTIVE.")
    
    return metadata

def predict_wait_time(features: dict) -> dict:
    """Predict wait time using the ACTIVE model."""
    pipeline, metadata = registry.get_active_model("wait_time")
    
    if not pipeline:
        return {"error": "No active wait_time model found."}
        
    df_features = pd.DataFrame([features])
    pred_seconds = pipeline.predict(df_features)[0]
    
    return {
        "predicted_wait_seconds": float(pred_seconds),
        "predicted_wait_minutes": float(pred_seconds / 60.0),
        "model_version": metadata.get("version", "unknown")
    }
