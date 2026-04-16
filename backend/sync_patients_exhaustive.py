import asyncio
import time
from backend.services.sukraa_soap import SukraaSOAPClient
from backend.database import SessionLocal
from backend import models
from datetime import datetime
import sqlalchemy

class PatientExhaustiveSync:
    def __init__(self):
        self.client = SukraaSOAPClient()
        self.db = SessionLocal()
        self.chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        self.total_added = 0
        self.total_updated = 0
        self.start_time = time.time()
        self.processed_mrns = set()

    def sync_by_prefix(self, prefix="", depth=0):
        print(f"Searching prefix: '{prefix}' (depth {depth})...")
        results = self.client.get_patients(prefix, count=500)
        
        if not results:
            return

        print(f"  Found {len(results)} patients for '{prefix}'")
        
        self.process_results(results)

        # If we hit the limit, drill down
        if len(results) >= 500 and depth < 2:
            for char in self.chars:
                self.sync_by_prefix(prefix + char, depth + 1)

    def process_results(self, results):
        batch_added = 0
        batch_updated = 0
        
        for p in results:
            mrn = p["mrn"]
            if mrn in self.processed_mrns:
                continue
            self.processed_mrns.add(mrn)
            
            name = p["name"]
            gender = p["gender"]
            dob_str = p["dob"]
            phone = p["phone"]
            
            # Split name (simple heuristic)
            name_parts = name.split()
            first_name = name_parts[0] if name_parts else "Unknown"
            last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""
            
            dob = None
            if dob_str and "/" in dob_str:
                try:
                    dob = datetime.strptime(dob_str, "%d/%m/%Y").date()
                except:
                    pass
            
            try:
                # Upsert logic
                patient = self.db.query(models.Patient).filter(models.Patient.mrn == mrn).first()
                if patient:
                    # Update if data is different or missing
                    changed = False
                    if not patient.date_of_birth and dob:
                        patient.date_of_birth = dob
                        changed = True
                    if not patient.gender and gender:
                        patient.gender = gender
                        changed = True
                    if not patient.phone_number and phone:
                        patient.phone_number = phone
                        changed = True
                    
                    # Also update names if they were "Unknown" or empty
                    if (not patient.first_name or patient.first_name == "Unknown") and first_name != "Unknown":
                        patient.first_name = first_name
                        changed = True
                    
                    if changed:
                        patient.updated_at = datetime.utcnow()
                        batch_updated += 1
                        self.total_updated += 1
                else:
                    new_p = models.Patient(
                        mrn=mrn,
                        first_name=first_name,
                        last_name=last_name,
                        gender=gender,
                        date_of_birth=dob,
                        phone_number=phone,
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    self.db.add(new_p)
                    batch_added += 1
                    self.total_added += 1
            except Exception as e:
                print(f"    Error processing patient {mrn}: {e}")
                self.db.rollback()
        
        if batch_added > 0 or batch_updated > 0:
            try:
                self.db.commit()
                print(f"  Committed batch: +{batch_added} added, ~{batch_updated} updated. Total: {self.total_added}/{self.total_updated}")
            except Exception as e:
                print(f"    Error committing batch: {e}")
                self.db.rollback()

    def sync_missing_data_specifically(self):
        """Target patients that have missing vital info in our DB"""
        print("Scrubbing patients with missing data specifically...")
        # Get patients missing data, prioritized by most recently created/updated
        missing = self.db.query(models.Patient).filter(
            sqlalchemy.or_(
                models.Patient.date_of_birth == None,
                models.Patient.gender == None,
                models.Patient.phone_number == None
            )
        ).order_by(models.Patient.updated_at.desc()).limit(1000).all()
        
        print(f"Found {len(missing)} patients with missing data. Searching by Name/MRN...")
        
        for i, p in enumerate(missing):
            if i % 10 == 0:
                print(f"  Processing missing patient {i}/{len(missing)}: {p.first_name} {p.last_name} ({p.mrn})")
            
            # Strategy: Search by Last Name or First Name to find the patient
            search_query = p.last_name if len(p.last_name) > 2 else p.first_name
            if len(search_query) < 2:
                # If they have no usable names, try the MRN as a last resort (prefix search)
                search_query = p.mrn[:6] 

            results = self.client.get_patients(search_query, count=100)
            if results:
                # Filter results for the exact MRN
                matching = [r for r in results if r["mrn"] == p.mrn]
                if matching:
                    self.process_results(matching)
                else:
                    # If not found in first 100, try a more specific search
                    if len(p.first_name) > 2:
                        res2 = self.client.get_patients(p.first_name, count=100)
                        matching = [r for r in res2 if r["mrn"] == p.mrn]
                        if matching:
                            self.process_results(matching)
            
            # Save progress every 50
            if i % 50 == 0:
                self.db.commit()

    def run(self, forever=False):
        print("Starting Exhaustive Patient Sync...")
        
        while True:
            # Phase 1: Target missing data
            self.sync_missing_data_specifically()
            
            # Phase 2: Full sweep (Letter prefixes)
            for char in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
                self.sync_by_prefix(char, depth=0)
            
            # Phase 3: Numeric prefixes (Common starting years/batches)
            for num in ["16", "17", "18", "19", "20", "21", "22", "23", "24", "25"]:
                self.sync_by_prefix(num, depth=0)
            
            if not forever:
                break
                
            print("Cycle complete. Sleeping for 1 hour before next update...")
            time.sleep(3600)
            self.processed_mrns.clear() # Reset set for next run
            
        self.db.close()


if __name__ == "__main__":
    sync = PatientExhaustiveSync()
    sync.run()
