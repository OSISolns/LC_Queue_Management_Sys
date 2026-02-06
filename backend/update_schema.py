from backend.database import engine
from sqlalchemy import text

def update_schema():
    with engine.connect() as conn:
        try:
            print("Adding patient_id column...")
            conn.execute(text("ALTER TABLE queue ADD COLUMN patient_id INTEGER REFERENCES patients(id)"))
            print("Added patient_id.")
        except Exception as e:
            print(f"Skipping patient_id (might exist): {e}")

        try:
            print("Adding visit_type column...")
            conn.execute(text("ALTER TABLE queue ADD COLUMN visit_type VARCHAR"))
            print("Added visit_type.")
        except Exception as e:
            print(f"Skipping visit_type (might exist): {e}")

        try:
            print("Adding completed_at column...")
            conn.execute(text("ALTER TABLE queue ADD COLUMN completed_at DATETIME"))
            print("Added completed_at.")
        except Exception as e:
            print(f"Skipping completed_at (might exist): {e}")
            
    print("Schema update attempt finished.")

if __name__ == "__main__":
    update_schema()
