from backend.database import SessionLocal
import backend.models as models

def cleanup_depts():
    db = SessionLocal()
    try:
        # Move GP Rooms to Family Medicine
        fam_med = db.query(models.Department).filter(models.Department.name == "Family Medicine").first()
        gp = db.query(models.Department).filter(models.Department.name == "General Practitioner").first()
        
        if gp:
            print(f"Found General Practitioner Dept (ID: {gp.id}). Moving rooms to Family Medicine...")
            if not fam_med:
                print("Family Medicine Dept not found! Creating it...")
                fam_med = models.Department(name="Family Medicine")
                db.add(fam_med)
                db.commit()
                db.refresh(fam_med)
            
            # Find rooms
            rooms = db.query(models.Room).filter(models.Room.department_id == gp.id).all()
            for r in rooms:
                r.department_id = fam_med.id
                # print(f"Moved Room {r.name} to Family Medicine")
            print(f"Moved {len(rooms)} rooms.")
            
            db.commit()
            
            # Delete GP
            db.delete(gp)
            print("Deleted General Practitioner Dept.")
        else:
            print("General Practitioner Dept not found.")
            
        # Delete Emergency Dept if exists
        emergency = db.query(models.Department).filter(models.Department.name.ilike("%Emergency%")).first()
        if emergency:
            print(f"Found '{emergency.name}' Dept. Deleting...")
            # Check for rooms
            rooms = db.query(models.Room).filter(models.Room.department_id == emergency.id).all()
            if rooms:
                print(f"Warning: Dept has {len(rooms)} rooms. Moving to Family Medicine.")
                if not fam_med: fam_med = db.query(models.Department).filter(models.Department.name == "Family Medicine").first()
                for r in rooms:
                    r.department_id = fam_med.id
            db.delete(emergency)
            print("Deleted Emergency Dept.")
        else:
            print("Emergency Dept not found.")
            
        db.commit()
        print("Cleanup completed.")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_depts()
