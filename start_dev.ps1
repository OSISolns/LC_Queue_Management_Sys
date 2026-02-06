Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", ".\venv\Scripts\activate; uvicorn backend.main:socket_app --reload --port 8000"
