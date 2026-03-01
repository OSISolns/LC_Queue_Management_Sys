# QMS AI Service - Operations Runbook

This runbook covers the operational procedures for the Enterprise AI Service implemented for the Queue Management System (QMS).

## 1. Architecture Overview
- **qms-api**: Primary FastApi backend. Handles typical ticket operations.
- **qms-ai-service**: Dedicated FastApi inference engine running on `port 8001`.
- Both services share the same SQLite database (`queue.db`) for extracting features and storing predictions.

## 2. Starting the Services

### Local Development
To run the AI service locally:
```bash
source venv/bin/activate
uvicorn ai_service.main:app --host 0.0.0.0 --port 8001 --reload
```

### Docker Compose
To run both the QMS API and AI Service together:
```bash
docker-compose -f docker-compose-ai.yml up --build -d
```

## 3. Training Models

The AI Service exposes Admin endpoints to explicitly trigger model retraining. 

**Wait Time Model:**
```bash
curl -X POST http://localhost:8001/api/v1/admin/train/wait_time
```

**Service Duration Model:**
```bash
curl -X POST http://localhost:8001/api/v1/admin/train/duration
```

**Arrival Forecast Model:**
```bash
curl -X POST http://localhost:8001/api/v1/admin/train/forecast
```

*Note: Training requires sufficient historical data in the database (e.g., at least 50 valid tickets).*

## 4. Model Versioning (Promote / Rollback)

When training succeeds, a new version (e.g., `v0002`) is saved to `ai_service/models_store/` and automatically promoted to `ACTIVE` (for MVP convenience).

To manually rollback or promote a specific version:
```bash
curl -X POST http://localhost:8001/api/v1/admin/promote_model \
     -H "Content-Type: application/json" \
     -d '{"model_type": "wait_time", "version": "v0001"}'
```

## 5. Monitoring Health and Anomalies

**Predictive Anomalies Pipeline:**
To check if there are idle counters or wait time spikes:
```bash
curl -X GET http://localhost:8001/api/v1/alerts/anomalies
```

**Prometheus Metrics:**
Metrics are exposed at `http://localhost:8001/metrics`. This includes standard ASGI metrics (request counts, latency distributions). You can configure a local Prometheus instance to scrape this endpoint.

**Drift Detection:**
Currently, drift is monitored via the Test vs Train MAE printed during the `/train` endpoint execution. Significant divergence (e.g., Test MAE > 50% worse than Train MAE) indicates concept drift and implies the need for fresh data or feature engineering.
