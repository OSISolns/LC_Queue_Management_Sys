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
    # Use absolute paths for SSL certs
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    key_path = os.path.join(base_dir, "certs", "key.pem")
    cert_path = os.path.join(base_dir, "certs", "cert.pem")

    uvicorn.run(
        "backend.main:socket_app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        ssl_keyfile=key_path,
        ssl_certfile=cert_path
    )
