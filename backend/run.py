#!/usr/bin/env python3
"""
Simple backend server runner
Usage: python backend/run.py (from project root)
"""
import sys
import os
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Change to project root directory
os.chdir(project_root)

import uvicorn

if __name__ == "__main__":
    print("=" * 50)
    print("Starting Patient Queuing System Backend")
    print("=" * 50)
    print("\nBackend API: https://localhost:8000")
    print("API Docs: https://localhost:8000/docs")
    print("\nPress Ctrl+C to stop the server\n")

    uvicorn.run(
        "backend.main:socket_app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        ssl_keyfile="certs/key.pem",
        ssl_certfile="certs/cert.pem"
    )
