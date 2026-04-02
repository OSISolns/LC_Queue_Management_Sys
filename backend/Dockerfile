FROM python:3.12-slim

WORKDIR /app

# system deps (bcrypt/crypto can need build tools sometimes)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# copy backend code into /app
COPY . /app

# DB lives at /app/queue.db (project root), so create it via volume mount
EXPOSE 8000

CMD ["uvicorn", "backend.main:socket_app", "--host", "0.0.0.0", "--port", "8000", "--ssl-keyfile", "/app/certs/key.pem", "--ssl-certfile", "/app/certs/cert.pem"]
