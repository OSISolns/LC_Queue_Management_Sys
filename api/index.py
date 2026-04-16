import sys
import os
from pathlib import Path

# Fix Python path so the `backend` module can be imported properly by Vercel
sys.path.insert(0, str(Path(__file__).parent.parent))

# Import the FastAPI application instance
from backend.main import app
