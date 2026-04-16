import asyncio
from backend.services.sukraa_soap import SukraaSOAPClient
from backend.database import SessionLocal
from backend import models
import json
from datetime import datetime

def sync_all_patients_soap():
    client = SukraaSOAPClient()
    db = SessionLocal()
    
    prefixes = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    total_added = 0
    total_updated = 0
    
    print("Starting Comprehensive SOAP Patient Sync...")
    
    for char in prefixes:
        print(f"Searching for prefix: {char}...")
        try:
            results = client.get_patients(char, count=500)
            if not results:
                continue
                
            for p in results:
                mrn = p["mrn"]
                name = p["name"]
                gender = p["gender"]
                dob_str = p["dob"]
                phone = p["phone"]
                
                # Split name
                name_parts = name.split()
                first_name = name_parts[0] if name_parts else "Unknown"
                last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""
                
                dob = None
                if dob_str and "/" in dob_str:
                    try:
                        dob = datetime.strptime(dob_str, "%d/%m/%Y").date()
                    except:
                        pass
                
                # Upsert
                patient = db.query(models.Patient).filter(models.Patient.mrn == mrn).first()
                if patient:
                    patient.first_name = first_name
                    patient.last_name = last_name
                    patient.gender = gender
                    patient.date_of_birth = dob
                    patient.phone_number = phone
                    total_updated += 1
                else:
                    new_p = models.Patient(
                        mrn=mrn,
                        first_name=first_name,
                        last_name=last_name,
                        gender=gender,
                        date_of_birth=dob,
                        phone_number=phone
                    )
                    db.add(new_p)
                    total_added += 1
            
            db.commit()
            print(f"Processed prefix {char}. Added: {total_added}, Updated: {total_updated}")
            
        except Exception as e:
            print(f"Error processing prefix {char}: {e}")
            db.rollback()
            
    db.close()
    print(f"SOAP Sync Complete. Total Added: {total_added}, Total Updated: {total_updated}")

if __name__ == "__main__":
    sync_all_patients_soap()
