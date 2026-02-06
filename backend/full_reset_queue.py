from backend.database import SessionLocal, engine
import backend.models as models
from sqlalchemy import text

def full_reset():
    db = SessionLocal()
    try:
        print("Starting full queue reset (Waiting, Calling, History)...")
        
        # Delete all records in the queue table
        num_deleted = db.query(models.Queue).delete()
        
        # Reset the ID sequence (if SQLite) to restart IDs from 1
        # This is strictly for aesthetics so ticket IDs might reset if logic relies on auto-increment,
        # but usually Token Numbers are generated based on daily counts anyway.
        # However, clearing the table is the main goal.
        
        db.commit()
        print(f"✅ Successfully deleted {num_deleted} records. Queue is empty.")
        
    except Exception as e:
        print(f"❌ Error during reset: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    full_reset()
