from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
import socketio
from typing import List, Optional
from datetime import datetime, timedelta
from . import models, schemas, database
import edge_tts
import uuid
import os
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi.middleware.cors import CORSMiddleware
import hashlib

# SQLAdmin Imports
from sqladmin import Admin, ModelView
from sqladmin.authentication import AuthenticationBackend
from starlette.requests import Request
from starlette.responses import RedirectResponse

# Database Setup
models.Base.metadata.create_all(bind=database.engine)

# Auth Configuration
SECRET_KEY = "supersecretkey_change_me_in_production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 600

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="login", auto_error=False)

# Socket.IO Setup
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

socket_app = socketio.ASGIApp(sio, app)

# --- Auth Helpers ---

def _prepare_password(password: str) -> str:
    """
    Pre-hash password with SHA-256 to avoid bcrypt's 72-byte limit.
    This allows passwords of any length to work correctly.
    """
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def verify_password(plain_password, hashed_password):
    # TEMPORARY: Bypass password verification
    return True

def get_password_hash(password):
    # TEMPORARY: Return dummy hash
    return "dummy_hash"

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# --- Dependencies ---

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = schemas.TokenData(username=username, role=payload.get("role"))
    except JWTError:
        raise credentials_exception
    user = db.query(models.User).options(joinedload(models.User.role)).filter(models.User.username == token_data.username).first()
    if user is None:
        raise credentials_exception
    return user

async def get_current_user_optional(token: str = Depends(oauth2_scheme_optional), db: Session = Depends(get_db)):
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            return None
        token_data = schemas.TokenData(username=username, role=payload.get("role"))
    except JWTError:
        return None
        
    user = db.query(models.User).options(joinedload(models.User.role)).filter(models.User.username == token_data.username).first()
    return user

async def get_current_active_user(current_user: models.User = Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

async def get_admin_user(current_user: models.User = Depends(get_current_active_user)):
    if current_user.role.name != "Admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return current_user

# --- Startup ---

@app.on_event("startup")
def startup_event():
    db = database.SessionLocal()
    
    # Seed Priority Levels
    priorities = [
        {"id": 1, "name": "Emergency", "weight": 0},
        {"id": 2, "name": "VIP", "weight": 1},
        {"id": 3, "name": "Standard", "weight": 2},
    ]
    for p in priorities:
        exists = db.query(models.PriorityLevel).filter_by(id=p["id"]).first()
        if not exists:
            db.add(models.PriorityLevel(**p))
    
    # Seed Roles
    roles = [
        {"id": 1, "name": "Admin"},
        {"id": 2, "name": "Doctor"},
        {"id": 3, "name": "Helpdesk"},
        {"id": 4, "name": "Technician"},
    ]
    for r in roles:
        exists = db.query(models.Role).filter_by(id=r["id"]).first()
        if not exists:
            db.add(models.Role(**r))
            
    db.commit()

    # Seed Default Admin
    admin_role = db.query(models.Role).filter_by(name="Admin").first()
    if admin_role:
        admin_user = db.query(models.User).filter_by(username="admin").first()
        if not admin_user:
            hashed_pw = get_password_hash("admin123")
            new_admin = models.User(username="admin", hashed_password=hashed_pw, role_id=admin_role.id)
            db.add(new_admin)
            db.commit()

    # Check Queue Expiration (Auto-Clear after 10 PM)
    check_and_expire_queue(db)

    db.close()

def check_and_expire_queue(db: Session):
    """
    Moves 'waiting' or 'calling' patients to 'expired' if current time > 22:00 (10 PM).
    Use this on startup or periodically.
    """
    now = datetime.now()
    # If it's past 10 PM
    # if now.hour >= 22: # Disabled for testing
    if False:
        # Find active patients
        expired_count = db.query(models.Queue).filter(
            models.Queue.status.in_(["waiting", "calling"])
        ).update(
            {models.Queue.status: "expired"}, 
            synchronize_session=False
        )
        if expired_count > 0:
            print(f"[MAINTENANCE] Expired {expired_count} patients due to time constraints (10 PM).")
            db.commit()

# --- Auth Routes ---

@app.post("/test-login")
async def test_login_endpoint(form_data: schemas.LoginRequest):
    print(f"[TEST] Received username: {form_data.username}")
    print(f"[TEST] Password length: {len(form_data.password)}")
    return {"message": "Test successful", "username": form_data.username, "password_length": len(form_data.password)}

@app.post("/login", response_model=schemas.Token)
async def login_for_access_token(form_data: schemas.LoginRequest, db: Session = Depends(get_db)):
    try:
        print(f"[LOGIN] Attempting login for user: {form_data.username}")
        
        user = db.query(models.User).options(joinedload(models.User.role)).filter(models.User.username == form_data.username).first()
        
        if not user:
            print(f"[LOGIN] User not found: {form_data.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if not verify_password(form_data.password, user.hashed_password):
            print(f"[LOGIN] Password verification failed for user: {form_data.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        role_name = user.role.name
        
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.username, "role": role_name}, expires_delta=access_token_expires
        )
        
        return {"access_token": access_token, "token_type": "bearer", "role": role_name, "username": user.username, "room_number": user.room_number, "id": user.id}
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"[LOGIN ERROR] Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

# --- Queue Routes ---

@app.get("/announce")
async def announce(token: str, room: str, background_tasks: BackgroundTasks):
    text = f"Patient {token}, please proceed to room {room}"
    voice = "en-US-JennyNeural" # High quality female voice - Natural
    output_file = f"temp_{uuid.uuid4()}.mp3"
    
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_file)
    
    background_tasks.add_task(os.remove, output_file)
    return FileResponse(output_file, media_type="audio/mpeg")


@app.get("/patients/search", response_model=List[schemas.PatientResponse])
def search_patients(q: str, limit: int = 5, db: Session = Depends(get_db)):
    """Search patients by name or MRN"""
    query = db.query(models.Patient).filter(
        (models.Patient.first_name.ilike(f"%{q}%")) |
        (models.Patient.last_name.ilike(f"%{q}%")) |
        (models.Patient.mrn.ilike(f"%{q}%"))
    )
    return query.limit(limit).all()

@app.post("/register", response_model=schemas.QueueResponse)
async def register_patient(patient: schemas.QueueCreate, db: Session = Depends(get_db)):
    # Check if within operating hours (7 AM - 10 PM)
    now = datetime.now()
    if now.hour < 7 or now.hour >= 22:
         # Log warning but allow for now as per user instruction to "clear" not "ban"
         pass

    priority = db.query(models.PriorityLevel).filter(models.PriorityLevel.id == patient.priority_id).first()
    if not priority:
        raise HTTPException(status_code=400, detail="Invalid Priority ID")
    
    prefix = priority.name[0].upper()
    count = db.query(models.Queue).filter(models.Queue.priority_id == patient.priority_id).count() + 1
    token = f"{prefix}-{count:03d}"

    new_patient = models.Queue(
        token_number=token,
        patient_name=patient.patient_name,
        patient_id=patient.patient_id,
        priority_id=patient.priority_id,
        target_dept=patient.target_dept,
        target_room=patient.target_room,
        doctor_id=patient.doctor_id,
        status="waiting"
    )
    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)
    
    await sio.emit('queue_update', {'message': 'New patient registered'})
    return new_patient

@app.post("/call-next", response_model=schemas.QueueResponse)
async def call_next_patient(request: schemas.CallNextRequest, db: Session = Depends(get_db)):
    return new_patient

@app.post("/queue/next")
async def call_next_patient(request: schemas.CallNextRequest, db: Session = Depends(get_db)):
    # Logic: Status=waiting, ORDER BY priority.weight ASC, created_at ASC
    query = db.query(models.Queue).join(models.PriorityLevel)\
        .filter(models.Queue.status == "waiting")
        
    if request.room_number:
        # Check if room is already busy with a calling patient
        active_patient = db.query(models.Queue).filter(
            models.Queue.status == "calling",
            models.Queue.room_number == request.room_number
        ).first()
        if active_patient:
            raise HTTPException(status_code=400, detail="You have an active patient. Complete them first.")

        query = query.filter(models.Queue.target_room == request.room_number)

    # --- Dynamic Queue Logic (3:1 Ratio if Load >= 15) ---
    total_waiting = query.count()
    next_patient = None

    if total_waiting >= 15:
        # Fetch last 3 called/completed patients for this room today
        # Note: We use called_at as the timestamp of interaction
        history = db.query(models.Queue).filter(
            models.Queue.target_room == request.room_number,
            models.Queue.status.in_(['completed', 'calling']),
            models.Queue.called_at >= datetime.utcnow().date()
        ).order_by(models.Queue.called_at.desc()).limit(3).all()

        last_3_types = [p.visit_type for p in history]
        
        # Calculate Non-Review Streak
        non_review_streak = 0
        for vt in last_3_types:
            if vt != 'Review':
                non_review_streak += 1
            else:
                break # Streak broken by a Review

        should_call_review = (non_review_streak >= 3)
        
        if should_call_review:
            # Prioritize Review Patient
            next_patient = query.filter(models.Queue.visit_type == 'Review')\
                .order_by(models.PriorityLevel.weight.asc(), models.Queue.created_at.asc()).first()
        else:
            # Prioritize Non-Review (Consultation)
            next_patient = query.filter(models.Queue.visit_type != 'Review')\
                 .order_by(models.PriorityLevel.weight.asc(), models.Queue.created_at.asc()).first()

    # Fallback / Normal Logic (if < 15 OR preferred type not found)
    if not next_patient:
        next_patient = query.order_by(models.PriorityLevel.weight.asc(), models.Queue.created_at.asc())\
            .first()

    if not next_patient:
        raise HTTPException(status_code=404, detail="No patients in waiting queue.")

    next_patient.status = "calling"
    next_patient.doctor_id = request.doctor_id
    next_patient.room_number = request.room_number
    next_patient.called_at = datetime.utcnow()

    db.commit()
    db.refresh(next_patient)

    is_vip = next_patient.priority.name == "VIP"

    await sio.emit('call_patient', {
        'token': next_patient.token_number,
        'room': request.room_number,
        'department': next_patient.target_dept, # Added for filtering
        'name': next_patient.patient_name,
        'is_vip': is_vip
    })
    
    return next_patient

@app.post("/call-specific/{patient_id}")
async def call_specific_patient(patient_id: int, request: schemas.CallNextRequest, db: Session = Depends(get_db)):
    """Call a specific patient from the waiting list, bypassing priority order."""
    patient = db.query(models.Queue).filter(models.Queue.id == patient_id, models.Queue.status == "waiting").first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found or not waiting.")

    if request.room_number:
         # Check if room is already busy
        active_patient = db.query(models.Queue).filter(
            models.Queue.status == "calling",
            models.Queue.room_number == request.room_number
        ).first()
        if active_patient:
             raise HTTPException(status_code=400, detail="You have an active patient. Complete them first.")

        # Enforce Room Matching
        if patient.target_room and patient.target_room != request.room_number:
             raise HTTPException(status_code=400, detail=f"Patient is waiting for Room {patient.target_room}, you are in Room {request.room_number}")
             
        # Enforce Ordering (Next in Line OR Review)
        # Check if patient is 'Review' type
        is_review = patient.visit_type and patient.visit_type.lower() == "review"
        
        # Check if patient is effectively next in line (ignoring VIPs if standard, etc - broadly just first match)
        # Ideally we check index 0 of the waiting list for this room
        next_in_line = db.query(models.Queue).filter(
            models.Queue.status == "waiting",
            models.Queue.target_room == request.room_number
        ).order_by(models.PriorityLevel.weight.asc(), models.Queue.created_at.asc()).first()
        
        is_next = next_in_line and next_in_line.id == patient_id
        
        if not (is_review or is_next):
             raise HTTPException(status_code=400, detail="You can only call the NEXT patient or a REVIEW patient.")

    patient.status = "calling"
    patient.doctor_id = request.doctor_id
    patient.room_number = request.room_number
    patient.called_at = datetime.utcnow()
    
    db.commit()
    db.refresh(patient)
    
    is_vip = patient.priority.name == "VIP"
    
    await sio.emit('call_patient', {
        'token': patient.token_number,
        'room': request.room_number,
        'department': patient.target_dept, # Added for filtering
        'name': patient.patient_name,
        'is_vip': is_vip
    })
    
    return patient

@app.get("/queue", response_model=List[schemas.QueueResponse])
def get_queue(room: Optional[str] = None, current_user: Optional[models.User] = Depends(get_current_user_optional), db: Session = Depends(get_db)):
    query = db.query(models.Queue).filter(models.Queue.status == "waiting")
    
    # If explicitly filtered by room (e.g. from frontend param)
    if room:
        query = query.filter(models.Queue.target_room == room)
        
    # Security: If user is a Doctor/Nurse, restrict to their assigned room/dept
    # Admin/Helpdesk/Kiosk (often have no specific room in user model or role allows all)
    # Displays (current_user is None) see all (filtered client-side)
    if current_user and current_user.role.name in ["Doctor", "Nurse", "Staff"]:
         if current_user.room_number:
             query = query.filter(models.Queue.target_room == current_user.room_number)
         elif current_user.department_id:
             # Fallback to department if no room assigned
             dept = db.query(models.Department).filter(models.Department.id == current_user.department_id).first()
             if dept:
                 query = query.filter(models.Queue.target_dept == dept.name)
    return query.join(models.PriorityLevel).options(joinedload(models.Queue.doctor)).order_by(models.PriorityLevel.weight.asc(), models.Queue.created_at.asc()).all()

@app.post("/complete/{patient_id}")
async def complete_patient(patient_id: int, db: Session = Depends(get_db)):
    patient = db.query(models.Queue).filter(models.Queue.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    patient.status = "completed"
    patient.completed_at = datetime.utcnow()
    db.commit()
    
    await sio.emit('queue_update', {'message': 'Patient completed'})
    return {"message": "Patient marked as completed"}

@app.post("/no-show/{patient_id}")
async def mark_no_show(patient_id: int, db: Session = Depends(get_db)):
    patient = db.query(models.Queue).filter(models.Queue.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    patient.status = "no-show"
    db.commit()
    
    await sio.emit('queue_update', {'message': 'Patient marked as no-show'})
    return {"message": "Patient marked as no-show"}

@app.post("/recall/{patient_id}")
async def recall_patient(patient_id: int, db: Session = Depends(get_db)):
    patient = db.query(models.Queue).filter(models.Queue.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    patient.status = "calling"
    patient.called_at = datetime.utcnow()
    db.commit()
    db.refresh(patient)
    
    await sio.emit('call_patient', {
        'token': patient.token_number,
        'room': patient.room_number,
        'department': patient.target_dept,
        'name': patient.patient_name,
        'is_vip': patient.priority.name == "VIP"
    })
    
    return {"message": "Patient recalled"}

@app.get("/stats")
def get_statistics(db: Session = Depends(get_db)):
    total_waiting = db.query(models.Queue).filter(models.Queue.status == "waiting").count()
    total_calling = db.query(models.Queue).filter(models.Queue.status == "calling").count()
    total_completed = db.query(models.Queue).filter(models.Queue.status == "completed").count()
    total_no_show = db.query(models.Queue).filter(models.Queue.status == "no-show").count()
    
    emergency_waiting = db.query(models.Queue).filter(
        models.Queue.status == "waiting",
        models.Queue.priority_id == 1
    ).count()
    vip_waiting = db.query(models.Queue).filter(
        models.Queue.status == "waiting",
        models.Queue.priority_id == 2
    ).count()
    standard_waiting = db.query(models.Queue).filter(
        models.Queue.status == "waiting",
        models.Queue.priority_id == 3
    ).count()
    
    return {
        "total_waiting": total_waiting,
        "total_calling": total_calling,
        "total_completed": total_completed,
        "total_no_show": total_no_show,
        "priority_breakdown": {
            "emergency": emergency_waiting,
            "vip": vip_waiting,
            "standard": standard_waiting
        }
    }

@app.get("/queue/by-department")
def get_queue_by_department(db: Session = Depends(get_db)):
    from sqlalchemy import func
    results = db.query(
        models.Queue.target_dept,
        func.count(models.Queue.id).label('count')
    ).filter(
        models.Queue.status == "waiting"
    ).group_by(models.Queue.target_dept).all()
    
    return [{"department": dept, "count": count} for dept, count in results]

@app.get("/queue/by-room")
def get_queue_by_room(db: Session = Depends(get_db)):
    from sqlalchemy import func
    results = db.query(
        models.Queue.target_room,
        func.count(models.Queue.id).label('count')
    ).filter(
        models.Queue.status == "waiting"
    ).group_by(models.Queue.target_room).all()
    
    return [{"room": room, "count": count} for room, count in results]

@app.get("/history", response_model=List[schemas.QueueResponse])
def get_history(status: Optional[str] = None, limit: int = 50, db: Session = Depends(get_db)):
    query = db.query(models.Queue)
    if status:
        query = query.filter(models.Queue.status == status)
    return query.options(joinedload(models.Queue.doctor)).order_by(models.Queue.created_at.desc()).limit(limit).all()

# --- Admin Management Routes ---

@app.post("/users", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_admin_user)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        username=user.username, 
        hashed_password=hashed_password, 
        role_id=user.role_id, 
        is_active=user.is_active,
        department_id=user.department_id,
        room_number=user.room_number
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.get("/users", response_model=List[schemas.User])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    users = db.query(models.User).offset(skip).limit(limit).all()
    return users

@app.put("/users/{user_id}", response_model=schemas.User)
def update_user(user_id: int, user_update: schemas.UserUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_admin_user)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_update.role_id is not None:
        db_user.role_id = user_update.role_id
    if user_update.department_id is not None:
        db_user.department_id = user_update.department_id
    if user_update.room_number is not None:
        db_user.room_number = user_update.room_number
    if user_update.is_active is not None:
        db_user.is_active = user_update.is_active
    if user_update.password:
        db_user.hashed_password = get_password_hash(user_update.password)
        
    db.commit()
    db.refresh(db_user)
    return db_user

@app.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_admin_user)):
    # Prevent self-deletion
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(db_user)
    db.commit()
    return {"message": "User deleted successfully"}

@app.post("/departments", response_model=schemas.Department)
def create_department(dept: schemas.DepartmentCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_admin_user)):
    db_dept = models.Department(name=dept.name)
    db.add(db_dept)
    db.commit()
    db.refresh(db_dept)
    return db_dept

@app.get("/departments", response_model=List[schemas.Department])
def read_departments(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.Department).offset(skip).limit(limit).all()

@app.post("/rooms", response_model=schemas.Room)
def create_room(room: schemas.RoomCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_admin_user)):
    db_room = models.Room(name=room.name, department_id=room.department_id)
    db.add(db_room)
    db.commit()
    db.refresh(db_room)
    return db_room

@app.get("/rooms", response_model=List[schemas.Room])
def read_rooms(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.Room).offset(skip).limit(limit).all()

@app.get("/roles", response_model=List[schemas.Role])
def read_roles(db: Session = Depends(get_db)):
    return db.query(models.Role).all()

@app.get("/panel-links")
def get_panel_links(request: Request, current_user: models.User = Depends(get_current_active_user)):
    # Dynamically determine base_url from request (assuming frontend is on same host, port 5173)
    host = request.url.hostname
    base_url = f"http://{host}:5173"
    
    return [
        {"name": "Admin Dashboard", "url": f"{base_url}/admin", "role_required": "Admin"},
        {"name": "Doctor Dashboard", "url": f"{base_url}/doctor", "role_required": "Doctor"},
        {"name": "Kiosk Registration", "url": f"{base_url}/kiosk", "role_required": "Helpdesk"},
        {"name": "Public Display", "url": f"{base_url}/display", "role_required": "None"},
    ]

@app.post("/reset-queue")
def reset_queue(db: Session = Depends(get_db), current_user: models.User = Depends(get_admin_user)):
    """Clear all waiting patients"""
    db.query(models.Queue).filter(models.Queue.status == "waiting").delete()
    db.commit()
    return {"message": "Queue cleared"}

@app.post("/reset-calling")
async def reset_calling(db: Session = Depends(get_db), current_user: models.User = Depends(get_admin_user)):
    """Clear all calling patients (mark as expired to remove from display)"""
    num_updated = db.query(models.Queue).filter(models.Queue.status == "calling").update(
        {models.Queue.status: "expired"}, 
        synchronize_session=False
    )
    db.commit()
    print(f"[ADMIN] Cleared {num_updated} active calls via reset-calling")
    await sio.emit('queue_update', {'message': 'Active calls cleared'})
    return {"message": f"Active calls cleared: {num_updated}"}

@app.delete("/history")
def delete_history(
    start_date: Optional[datetime] = None, 
    end_date: Optional[datetime] = None, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_admin_user)
):
    """
    Delete history records (completed, no-show, expired) within a date range.
    Does NOT delete active waiting/calling patients.
    """
    query = db.query(models.Queue).filter(models.Queue.status.in_(["completed", "no-show", "expired"]))
    
    if start_date:
        query = query.filter(models.Queue.created_at >= start_date)
    if end_date:
        query = query.filter(models.Queue.created_at <= end_date)
        
    deleted_count = query.delete(synchronize_session=False)
    db.commit()
    
    return {"message": f"Deleted {deleted_count} history records."}

@sio.event
async def connect(sid, environ):
    print("connect ", sid)


# --- Admin Panel Configuration (GUI) ---

class AdminAuth(AuthenticationBackend):
    async def login(self, request: Request) -> bool:
        form = await request.form()
        username, password = form.get("username"), form.get("password")
        
        # Use a fresh session for auth check
        with database.SessionLocal() as db:
            user = db.query(models.User).filter(models.User.username == username).first()
            if not user:
                return False
            # Verify password using the helper from main.py
            if not verify_password(password, user.hashed_password):
                return False
            # Ensure only Admin can access GUI
            if user.role.name != "Admin":
                return False
        
        # Determine strict session token
        request.session.update({"token": username})
        return True

    async def logout(self, request: Request) -> bool:
        request.session.clear()
        return True

    async def authenticate(self, request: Request) -> bool:
        token = request.session.get("token")
        if not token:
            return False
        return True

# Admin Views

class UserAdmin(ModelView, model=models.User):
    column_list = [models.User.id, models.User.username, models.User.role, models.User.department, models.User.room_number, models.User.is_active]
    column_searchable_list = [models.User.username]
    icon = "fa-solid fa-user"

class RoleAdmin(ModelView, model=models.Role):
    column_list = [models.Role.id, models.Role.name]
    can_delete = False # Protect roles
    icon = "fa-solid fa-user-shield"

class DepartmentAdmin(ModelView, model=models.Department):
    column_list = [models.Department.id, models.Department.name]
    icon = "fa-solid fa-building"

class RoomAdmin(ModelView, model=models.Room):
    column_list = [models.Room.id, models.Room.name, models.Room.department]
    icon = "fa-solid fa-door-open"

class PatientAdmin(ModelView, model=models.Patient):
    column_list = [models.Patient.mrn, models.Patient.first_name, models.Patient.last_name, models.Patient.date_of_birth, models.Patient.is_active]
    column_searchable_list = [models.Patient.mrn, models.Patient.last_name]
    icon = "fa-solid fa-hospital-user"

class QueueAdmin(ModelView, model=models.Queue):
    column_list = [models.Queue.token_number, models.Queue.patient_name, models.Queue.priority, models.Queue.status, models.Queue.target_dept, models.Queue.doctor, models.Queue.room_number, "duration"]
    column_sortable_list = [models.Queue.created_at]
    icon = "fa-solid fa-list-ol"

    def duration(self, model):
        if model.called_at and model.completed_at:
            diff = model.completed_at - model.called_at
            # Format as MM:SS or HH:MM:SS
            total_seconds = int(diff.total_seconds())
            minutes = total_seconds // 60
            seconds = total_seconds % 60
            return f"{minutes}m {seconds}s"
        return "-"

class VisitHistoryAdmin(ModelView, model=models.VisitHistory):
    column_list = [models.VisitHistory.visit_date, models.VisitHistory.patient, models.VisitHistory.doctor, models.VisitHistory.status]
    column_sortable_list = [models.VisitHistory.visit_date]
    icon = "fa-solid fa-file-medical"

class PriorityLevelAdmin(ModelView, model=models.PriorityLevel):
    column_list = [models.PriorityLevel.name, models.PriorityLevel.weight]
    can_delete = False
    icon = "fa-solid fa-layer-group"

# Initialize Admin
authentication_backend = AdminAuth(secret_key=SECRET_KEY)
admin = Admin(app, database.engine, authentication_backend=authentication_backend)

admin.add_view(UserAdmin)
admin.add_view(RoleAdmin)
admin.add_view(DepartmentAdmin)
admin.add_view(RoomAdmin)
admin.add_view(PatientAdmin)
admin.add_view(QueueAdmin)
admin.add_view(VisitHistoryAdmin)
admin.add_view(PriorityLevelAdmin)
