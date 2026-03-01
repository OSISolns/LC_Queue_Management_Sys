import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_absolute_percentage_error

from ..feature_store import get_db_connection
from ..registry.manager import registry

def extract_training_data_forecast():
    """Extracts aggregated hourly arrivals for forecasting."""
    with get_db_connection() as conn:
        query = "SELECT created_at FROM queue"
        df = pd.read_sql_query(query, conn)
        
    if df.empty:
        return df

    df['created_at'] = pd.to_datetime(df['created_at'], errors='coerce')
    df = df.dropna()
    
    # Aggregate into hourly slots
    df['date_hour'] = df['created_at'].dt.floor('H')
    hourly_counts = df.groupby('date_hour').size().reset_index(name='arrivals')
    
    # Create lag features
    hourly_counts = hourly_counts.sort_values('date_hour')
    hourly_counts['hour'] = hourly_counts['date_hour'].dt.hour
    hourly_counts['day_of_week'] = hourly_counts['date_hour'].dt.dayofweek
    hourly_counts['arrivals_prev_hour'] = hourly_counts['arrivals'].shift(1)
    
    # 24 hours ago
    hourly_counts['arrivals_prev_day_same_hour'] = hourly_counts['arrivals'].shift(24)
    
    # Drop NaNs from shifts
    hourly_counts = hourly_counts.dropna()
    
    return hourly_counts

def train_forecast_model():
    """Trains the arrival forecasting model and registers it."""
    print("Extracting forecast dataset...")
    df = extract_training_data_forecast()
    
    if df is None or len(df) < 48:
        raise ValueError("Not enough historical data to train the forecast model (need > 48 hours).")

    X = df[['hour', 'day_of_week', 'arrivals_prev_hour', 'arrivals_prev_day_same_hour']]
    y = df['arrivals']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, shuffle=False)

    pipeline = Pipeline(steps=[
        ('scaler', StandardScaler()),
        ('regressor', Ridge(random_state=42))
    ])

    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    mape = mean_absolute_percentage_error(y_test, y_pred)

    print(f"Forecast Model Evaluation: MAE {mae:.2f} | MAPE {mape:.2f}")

    metadata = {
        "model_type": "forecast",
        "dataset_size": len(df),
        "mae": float(mae),
        "mape": float(mape)
    }

    signature = {
        "inputs": [
            {"name": "hour", "type": "int"},
            {"name": "day_of_week", "type": "int"},
            {"name": "arrivals_prev_hour", "type": "float"},
            {"name": "arrivals_prev_day_same_hour", "type": "float"}
        ],
        "output": {"name": "predicted_arrivals", "type": "float"}
    }

    version = registry.save_model("forecast", pipeline, metadata, signature)
    registry.promote_model("forecast", version)
    
    return metadata

def predict_arrivals(features: dict) -> dict:
    pipeline, metadata = registry.get_active_model("forecast")
    
    if not pipeline:
        return {"error": "No active forecast model found."}
        
    df_features = pd.DataFrame([features])
    pred_arrivals = pipeline.predict(df_features)[0]
    
    # Cannot have negative arrivals
    pred_arrivals = max(0.0, pred_arrivals)
    
    return {
        "predicted_arrivals": float(pred_arrivals),
        "model_version": metadata.get("version", "unknown")
    }
