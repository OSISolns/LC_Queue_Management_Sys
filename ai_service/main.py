from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import make_asgi_app
import logging

from .config import settings
from .routers import predict, recommend, forecast, alerts, admin

# Setup basic observable JSON-like logging 
logging.basicConfig(
    format='{"time":"%(asctime)s", "level":"%(levelname)s", "name":"%(name)s", "message":"%(message)s"}',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Enterprise AI Service for Queue Management System",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prometheus Metrics Endpoint
if settings.ENABLE_METRICS:
    metrics_app = make_asgi_app()
    app.mount("/metrics", metrics_app)

@app.on_event("startup")
async def startup_event():
    logger.info("Initializing Enterprise AI Server...")
    # Optionally load active models into memory here to verify they exist

@app.get("/health")
def health_check():
    return {"status": "ok", "service": settings.PROJECT_NAME}

@app.get("/")
def root():
    return {"message": f"Welcome to {settings.PROJECT_NAME}. See /docs for API."}

# Mount Routers
app.include_router(predict.router, prefix=settings.API_V1_STR + "/predict", tags=["prediction"])
app.include_router(recommend.router, prefix=settings.API_V1_STR + "/recommend", tags=["recommendation"])
app.include_router(forecast.router, prefix=settings.API_V1_STR + "/forecast", tags=["forecast"])
app.include_router(alerts.router, prefix=settings.API_V1_STR + "/alerts", tags=["alerts"])
app.include_router(admin.router, prefix=settings.API_V1_STR + "/admin", tags=["admin"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("ai_service.main:app", host="0.0.0.0", port=8001, reload=True)
