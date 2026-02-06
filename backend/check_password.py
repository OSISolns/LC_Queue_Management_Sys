from sqlalchemy.orm import Session
from backend.database import SessionLocal
import backend.models as models

db = SessionLocal()
try:
    user = db.query(models.User).filter(models.User.username == "admin").first()
    if user:
        print(f"Username: {user.username}")
        print(f"Hashed Password: {user.hashed_password}")
        print(f"Hashed Password Type: {type(user.hashed_password)}")
        print(f"Hashed Password Length: {len(user.hashed_password) if user.hashed_password else 0}")
        print(f"Role ID: {user.role_id}")
    else:
        print("User not found")
finally:
    db.close()
