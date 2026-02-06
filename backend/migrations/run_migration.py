#!/usr/bin/env python3
"""
Database migration script to reorganize departments and rooms
"""
import sqlite3
import sys
from pathlib import Path

# Get the database path
db_path = Path(__file__).parent.parent.parent / "queue.db"

def run_migration():
    print("Starting department reorganization migration...")
    
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Step 1: Create new Radiology & Laboratory department
        print("Step 1: Creating Radiology & Laboratory department...")
        cursor.execute("INSERT OR IGNORE INTO departments (id, name) VALUES (28, 'Radiology & Laboratory')")
        
        # Step 2: Merge Gyn (6) into Gynecology (25)
        print("Step 2: Merging Gyn into Gynecology...")
        cursor.execute("UPDATE users SET department_id = 25 WHERE department_id = 6")
        cursor.execute("UPDATE rooms SET department_id = 25 WHERE department_id = 6")
        cursor.execute("UPDATE queue SET target_dept = 'Gynecology' WHERE target_dept = 'Gyn'")
        
        # Step 3: Merge Dental (19) into Dentistry (16)
        print("Step 3: Merging Dental into Dentistry...")
        cursor.execute("UPDATE users SET department_id = 16 WHERE department_id = 19")
        cursor.execute("UPDATE rooms SET department_id = 16 WHERE department_id = 19")
        cursor.execute("UPDATE queue SET target_dept = 'Dentistry' WHERE target_dept = 'Dental'")
        
        # Step 4: Rename Paediatrics to Pediatrics
        print("Step 4: Renaming Paediatrics to Pediatrics...")
        cursor.execute("UPDATE departments SET name = 'Pediatrics' WHERE name = 'Paediatrics'")
        cursor.execute("UPDATE queue SET target_dept = 'Pediatrics' WHERE target_dept = 'Paediatrics'")
        
        # Step 5: Reassign procedure rooms to Radiology & Laboratory
        print("Step 5: Reassigning procedure rooms to Radiology & Laboratory...")
        cursor.execute("UPDATE rooms SET department_id = 28 WHERE id IN (1, 2, 3, 4, 5)")
        cursor.execute("""UPDATE queue SET target_dept = 'Radiology & Laboratory' 
                         WHERE target_dept IN ('Phlebotomy', 'CT-Scan', 'MRI', 'X-Ray', 'Ultrasound', 'Procedure')""")
        
        # Step 6: Delete redundant departments
        print("Step 6: Removing redundant departments...")
        cursor.execute("DELETE FROM departments WHERE id IN (6, 19, 20, 21, 22, 23, 24)")
        
        # Step 7: Fix doctor room assignments
        print("Step 7: Updating doctor room assignments...")
        cursor.execute("UPDATE users SET room_number = '15' WHERE id = 6 AND (room_number IS NULL OR room_number = '')")
        
        # Commit changes
        conn.commit()
        print("✓ Migration completed successfully!")
        
        # Verification
        print("\n--- VERIFICATION ---")
        print("\nDEPARTMENTS:")
        cursor.execute("SELECT id, name FROM departments ORDER BY name")
        for row in cursor.fetchall():
            print(f"  {row[0]}: {row[1]}")
        
        print("\nPROCEDURE ROOMS (Radiology & Laboratory):")
        cursor.execute("""SELECT r.id, r.name, d.name FROM rooms r 
                         LEFT JOIN departments d ON r.department_id = d.id 
                         WHERE d.name = 'Radiology & Laboratory' ORDER BY r.name""")
        for row in cursor.fetchall():
            print(f"  Room {row[1]} - {row[2]}")
        
        print("\nDOCTORS:")
        cursor.execute("""SELECT u.id, u.username, d.name, u.room_number FROM users u
                         LEFT JOIN departments d ON u.department_id = d.id
                         WHERE u.role_id = 2 ORDER BY u.username""")
        for row in cursor.fetchall():
            print(f"  {row[1]}: {row[2] or 'No Dept'}, Room {row[3] or 'Unassigned'}")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"✗ Migration failed: {e}")
        conn.rollback()
        conn.close()
        return False

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)
