import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "QMS AI Service"
    API_V1_STR: str = "/api/v1"
    
    # Path to the main sqlite DB
    # In a real deployed environment, this would be an absolute path or Postgres URL
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{os.path.join(os.path.dirname(os.path.dirname(__file__)), 'queue.db')}")
    
    # Model Registry Path
    MODEL_REGISTRY_PATH: str = os.getenv("MODEL_REGISTRY_PATH", os.path.join(os.path.dirname(__file__), "models_store"))
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "DEVELOPMENT_SECRET_KEY_PLEASE_CHANGE")
    ALGORITHM: str = "HS256"
    
    # Telemetry
    ENABLE_METRICS: bool = True

    class Config:
        case_sensitive = True

settings = Settings()
