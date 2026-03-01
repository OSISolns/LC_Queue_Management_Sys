FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY ai_service/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy wait-time AI code
COPY ai_service/ ./ai_service/
# Need models and schemas from backend if we use them, but we only depend on SQLite directly here
# SQLite DB is expected to be mounted at /app/queue.db or configured via env var

ENV PROJECT_NAME="QMS AI Service"
ENV DATABASE_URL="sqlite:////app/queue.db"
ENV MODEL_REGISTRY_PATH="/app/ai_service/models_store"
ENV PORT=8001

EXPOSE 8001

# Command to run uvicorn
CMD ["uvicorn", "ai_service.main:app", "--host", "0.0.0.0", "--port", "8001"]
