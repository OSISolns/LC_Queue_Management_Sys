from backend.database import SessionLocal
import backend.models as models

def cleanup_data():
    db = SessionLocal()
    try:
        print("Cleaning up invalid data...")
        
        # Rooms to delete
        bad_rooms = ["Room 101", "Room 102", "Room 103", "101", "102", "103"]
        
        deleted_count = db.query(models.Room).filter(models.Room.name.in_(bad_rooms)).delete(synchronize_session=False)
        print(f"Deleted {deleted_count} invalid rooms.")
        
        # Check for 'General Medicine' Dept if it's considered invalid (Kiosk uses 'Internal Medicine')
        # Only delete if it has no rooms (or we just deleted its rooms)
        gen_med = db.query(models.Department).filter(models.Department.name == "General Medicine").first()
        if gen_med:
            # Check if empty
            count = db.query(models.Room).filter(models.Room.department_id == gen_med.id).count()
            if count == 0:
                print("Deleting empty 'General Medicine' department...")
                db.delete(gen_med)
            else:
                print(f"'General Medicine' still has {count} rooms, skipping delete.")
                
        db.commit()
        print("Cleanup finished.")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_data()
