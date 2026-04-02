import json
import logging
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from database import SessionLocal
from passlib.context import CryptContext
from models import User, Department, Role, DoctorRoster

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DOCTORS_DATA = {
    "Internal Medicine": [
        {"name": "Nshuti Shema David", "schedule": "Monday,Tuesday,Wednesday,Friday : 8:00 AM - 5:00 PM"},
        {"name": "Kabakambira Jean Damascene", "schedule": "Monday - Friday : 8:00 AM - 4:00 PM"},
        {"name": "Anthony Bazatsinda", "schedule": "Wednesday: 8:00 AM - 9:00 PM, Saturday: 8:00 AM - 9:00 PM"},
        {"name": "Oswald Habyarimana", "schedule": "Tuesday: 8:00 AM - 9:00 PM, Sunday: 8:00 AM - 5:00 PM"},
        {"name": "Sebatunzi Osee", "schedule": "Thursday: 8:00 AM - 9:00 PM, Saturday: 8:00 AM - 5:00 PM"},
        {"name": "Maguy Mbabazi", "schedule": "Friday: 8:00 AM - 9:00 PM, Sunday: 8:00 AM - 5:00 PM"},
        {"name": "David Turatsinze", "schedule": "Not Available"},
        {"name": "Rutaganda Eric", "schedule": "Thursday: 9:00 AM - 5:00 PM, Sunday: 9:00 AM - 5:00 PM"},
        {"name": "Masaisa Florence", "schedule": "Monday: 9:00 AM - 9:00 PM"},
    ],
    "Gynecology": [
        {"name": "Gakindi Leonard", "schedule": "Monday - Friday: 9:00 AM - 5:00 PM"},
        {"name": "Nkubito Valens", "schedule": "Saturday: 8:00 AM - 5:00 PM"},
        {"name": "Mohamed", "schedule": "Not Available"},
        {"name": "Ntirushwa David", "schedule": "Friday: 9:00 AM - 5:00 PM, Sunday: 9:00 AM - 5:00 PM"},
        {"name": "Sitini Bertin", "schedule": "Monday: 8:00 AM - 5:00 PM, Sunday: 8:00 AM - 5:00 PM"},
        {"name": "Butoyi Alphonse", "schedule": "Tuesday: 9:00 AM - 9:00 PM, Wednesday: 8:00 AM - 5:00 PM, Thursday: 9:00 AM - 9:00 PM, Friday: 9:00 AM - 5:00 PM, Saturday: 9:00 AM - 5:00 PM"},
        {"name": "Heba", "schedule": "Not Available"}
    ],
    "Pediatrics": [
        {"name": "Kabayiza Jean Claude", "schedule": "(According to weekly roster)"},
        {"name": "Umuhoza Christian", "schedule": "(According to weekly roster)"},
        {"name": "Aimable Kanyamuhunga", "schedule": "(According to weekly roster)"},
        {"name": "Karangwa Valens", "schedule": "(According to weekly roster)"},
        {"name": "Mukaruziga Agnes", "schedule": "Thursday: 8:00 AM - 5:00 PM"}
    ],
    "Neuro-Surgeon": [
        {"name": "Karekezi Claire", "schedule": "Wednesday:9:00 AM - 2:00 PM, Saturday: 9:00 AM - 2:00 PM"}
    ],
    "General Surgeon": [
        {"name": "Desire Rubanguka", "schedule": "Tuesday : 9:00 AM - 4:00 PM"}
    ],
    "Chiropractic": [
        {"name": "Noella Kanyabutembo", "schedule": "Thursday and Friday: 9:00 AM - 3:00 PM"}
    ],
    "Neurology": [
        {"name": "Ndayisenga Arlene", "schedule": "Not Available"},
        {"name": "Mutungirehe Sylvestre", "schedule": "Monday: 5:00 PM - 9:00 PM, Thursday: 5:00 PM - 9:00 PM, Saturday: 03:00 PM - 9:00 PM, Sunday: 09:00 AM - 9:00 PM"}
    ],
    "ENT": [
        {"name": "Dushimiyimana JMV", "schedule": "Thursday & Sunday: 9:00 AM - 4:00 PM"},
        {"name": "Charles Nkurunziza", "schedule": "Not Available"},
        {"name": "Hakizimana Aristote", "schedule": "Monday & Tuesday: 5:00 PM - 9:00 PM, Wednesday:9:00 AM - 4:00 PM, Saturday: 8:00 AM - 5:00 PM"}
    ],
    "Clinical Psychology": [
        {"name": "Innocent Nsengiyumva", "salutation": "Mr.", "schedule": "Monday, Wednesday, Thursday, Friday: 5:00 PM - 9:00 PM"}
    ],
    "Family Medicine": [
        {"name": "Nkera Gihana Jacques", "schedule": "Monday, Tuesday, Wednesday, Friday: 8:00 AM - 5:00 PM"}
    ],
    "Orthopedics": [
        {"name": "Kwesiga Stephen", "schedule": "Monday: 4:00 PM - 9:00 PM, Wednesday: 3:00 PM - 9:00 PM, Thursday: 9:00 AM - 9:00 PM, Saturday: 3:00 PM - 4:00 PM"},
        {"name": "Ingabire Allen", "schedule": "Monday: 9:00 AM - 2:00 PM, Wednesday: 5:00 PM - 7:00 PM, Friday: 1:00 PM - 6:00 PM"}
    ],
    "Urology": [
        {"name": "Africa Gasana", "schedule": "Wednesday: 5:00 PM - 9:00 PM, Saturday: 8:00 AM - 5:00 PM"},
        {"name": "Nyirimodoka Alexandre", "schedule": "Tuesday: 2:00 PM - 7:00 PM, Sunday: 9:00 AM - 3:00 PM"}
    ],
    "Cardiology": [
        {"name": "Gapira Ganza JMV", "schedule": "Monday, Tuesday, Thursday, Friday, Saturday: 8:00 AM - 4:00 PM"},
        {"name": "Dufatanye Darius", "schedule": "Wednesday: 9:00 AM - 5:00 PM, Sunday: 9:00 AM - 2:00 PM"}
    ],
    "General Practitioners": [
        {"name": "Yves Laurent", "schedule": "(According to Weekly Roster)"},
        {"name": "Fabrice Ntare Ngabo", "schedule": "(According to Weekly Roster)"}
    ],
    "Dermatology": [
        {"name": "Kanimba Emmanuel", "schedule": "Monday: 8:00 AM - 3:00 PM, Thursday: 8:00 AM - 3:00 PM, Friday: 8:00 AM - 3:00 PM, Saturday: 8:00 AM - 3:00 PM"}
    ],
    "Dental": [
        {"name": "Moses Isyagi", "schedule": "According to the monthly roster"},
        {"name": "Roger Anamali", "schedule": "Monday: 3:00 PM - 9:00 PM, Tuesday: 8:00 AM - 2:00 PM, Wednesday: 10:00 AM - 8:00 PM, Friday: 8:00 AM - 5:00 PM, Saturday: 8:00 AM - 2:00 PM, Sunday: 10:00 AM - 8:00 PM"},
        {"name": "Nyiraneza Esperance", "schedule": "Monday - Friday: 9:00 AM - 3:00 PM"},
        {"name": "Ishimwe Gilbert", "salutation": "Mr.", "schedule": "Tuesday: 3:00 PM - 9:00 PM, Saturday: 08:00 AM - 9:00 PM"},
        {"name": "Eric Rutaganda", "salutation": "Mr.", "schedule": "Monday and Wednesday: 8:00 AM - 3:00 PM, Tuesday and Thursday: 3:00 PM - 9:00 PM"},
        {"name": "Gilbert Ndayisenga", "salutation": "Mr.", "schedule": "Tuesday, Thursday and Saturday: 8:00 AM - 3:00 PM, Monday, Wednesday and Friday: 3:00 PM - 9:00 PM"},
        {"name": "Mugesera Ernest", "schedule": "Monday and Sunday: 08:00 AM - 3:00 PM, Tuesday: 03:00 PM - 9:00 PM, Thursday and Saturday: 08:00 - 9:00 PM"},
        {"name": "Sandeep Goyal", "schedule": "Tuesday: 2:00 PM - 5:00 PM, Friday: 09:00 AM - 5:00 PM"},
        {"name": "Bede Bana", "schedule": "Monday - Friday: 08:00 AM - 3:00 PM, Sunday: 3:00 PM - 9:00 PM"},
        {"name": "Jayakar G. Sargunar", "schedule": "According to the monthly roster"}
    ]
}

def seed_data():
    db: Session = SessionLocal()
    try:
        # Ensure 'Doctor' role exists
        role = db.query(Role).filter_by(name="Doctor").first()
        if not role:
            role = Role(name="Doctor", description="Added via seeding script")
            db.add(role)
            db.commit()
            db.refresh(role)
            
        hashed_pw = pwd_context.hash("1234")

        for dept_name, doctors in DOCTORS_DATA.items():
            # Ensure Department exists
            dept = db.query(Department).filter_by(name=dept_name).first()
            if not dept:
                dept = Department(name=dept_name, floor="Unknown")
                db.add(dept)
                db.commit()
                db.refresh(dept)
                
            for doc_info in doctors:
                username = doc_info["name"].lower().replace(" ", "_")
                
                # Check if doctor exists
                user = db.query(User).filter_by(full_name=doc_info["name"]).first()
                if not user:
                    # Create Doctor User
                    user = User(
                        username=username,
                        hashed_password=hashed_pw,
                        role_id=role.id,
                        department_id=dept.id,
                        full_name=doc_info["name"],
                        salutation=doc_info.get("salutation", "Dr."),
                        is_active=True,
                        is_available=doc_info["schedule"] != "Not Available"
                    )
                    db.add(user)
                    db.commit()
                    db.refresh(user)
                    
                    # Create single Roster entry for the schedule
                    roster = DoctorRoster(
                        doctor_id=user.id,
                        day_of_week="Weekly",
                        status="available" if doc_info["schedule"] != "Not Available" else "not_available",
                        schedule_text=doc_info["schedule"]
                    )
                    db.add(roster)
                    db.commit()
                    logger.info(f"Seeded Doctor: {doc_info['name']} under {dept_name}")
                else:
                    logger.info(f"Doctor {doc_info['name']} already exists. Skipping.")
                
    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
