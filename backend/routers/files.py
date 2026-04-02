from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List
import os
import uuid
import mimetypes
from datetime import datetime
from fastapi.responses import FileResponse, StreamingResponse

from ..dependencies import get_db, get_admin_user, get_current_active_user
from ..models import User, Role, FileCategory, Document, DocumentRoleAccess, FileAuditLog
from .. import schemas

router = APIRouter(tags=["files"])

STORAGE_DIR = "/home/noble/Documents/LC_APPS/LC_Queuing-Sys/secure_storage"

# Ensure storage directory exists
os.makedirs(STORAGE_DIR, exist_ok=True)

# --- Categories ---

@router.get("/categories", response_model=List[schemas.FileCategoryResponse])
def get_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    return db.query(FileCategory).all()

@router.post("/categories", response_model=schemas.FileCategoryResponse)
def create_category(
    request: schemas.FileCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    category = FileCategory(**request.dict())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category

@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    category = db.query(FileCategory).filter(FileCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Check if category has documents
    docs = db.query(Document).filter(Document.category_id == category_id).count()
    if docs > 0:
        raise HTTPException(status_code=400, detail="Cannot delete category containing documents. Reassign or delete the documents first.")

    db.delete(category)
    db.commit()
    return None

# --- Documents ---

@router.post("/upload", response_model=schemas.DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    category_id: int = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    # Security: Generate safe UUID filename
    ext = os.path.splitext(file.filename)[1]
    safe_filename = f"{uuid.uuid4().hex}{ext}"
    stored_path = os.path.join(STORAGE_DIR, safe_filename)

    # Save to disk
    contents = await file.read()
    with open(stored_path, "wb") as f:
        f.write(contents)
    
    file_size = os.path.getsize(stored_path)
    mime_type, _ = mimetypes.guess_type(stored_path)

    # Save to DB
    doc = Document(
        filename=safe_filename,
        original_name=file.filename,
        stored_path=stored_path,
        category_id=category_id,
        uploaded_by_id=current_user.id,
        file_size=file_size,
        mime_type=mime_type or file.content_type
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc

@router.get("/", response_model=List[schemas.DocumentResponse])
def list_documents(
    category_id: int = None,
    search: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(Document).filter(Document.is_active == True)

    if category_id:
        query = query.filter(Document.category_id == category_id)
        
    if search:
        query = query.filter(Document.original_name.ilike(f"%{search}%"))

    # RBAC: Admins see everything. Others see only documents assigned to their role.
    if current_user.role.category != "Admin":
        query = query.join(DocumentRoleAccess).filter(DocumentRoleAccess.role_id == current_user.role_id)
        
    return query.all()

@router.get("/{document_id}/download")
def download_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    doc = db.query(Document).filter(Document.id == document_id, Document.is_active == True).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # RBAC Check
    permission = "view_download" # Assume highest for admin
    if current_user.role.category != "Admin":
        access = db.query(DocumentRoleAccess).filter(
            DocumentRoleAccess.document_id == document_id,
            DocumentRoleAccess.role_id == current_user.role_id
        ).first()

        if not access:
            # Check if assigned to 'All Staff' role maybe? For now, strict RBAC
            raise HTTPException(status_code=403, detail="Not authorized to access this document")
        permission = access.permission_type

    # Audit Log
    action = "download" if permission == "view_download" else "view"
    audit = FileAuditLog(
        user_id=current_user.id,
        document_id=doc.id,
        action=action,
        ip_address="127.0.0.1" # In real app, extract from Request
    )
    db.add(audit)
    db.commit()

    if not os.path.exists(doc.stored_path):
        raise HTTPException(status_code=404, detail="File missing on disk")

    return FileResponse(
        path=doc.stored_path, 
        filename=doc.original_name, 
        media_type=doc.mime_type,
        content_disposition_type="inline" if permission == "view_only" else "attachment"
    )

# --- Access Management ---

@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Delete file from disk if it exists
    if os.path.exists(doc.stored_path):
        try:
            os.remove(doc.stored_path)
        except OSError:
            pass # Ignore if we can't delete it physically
            
    # Remove from DB (will cascade or we just delete it)
    # The DocumentRoleAccess and FileAuditLog should cascade or be handled
    # Let's delete manually to be safe if no cascade is set
    db.query(DocumentRoleAccess).filter(DocumentRoleAccess.document_id == document_id).delete()
    db.query(FileAuditLog).filter(FileAuditLog.document_id == document_id).delete()
    
    db.delete(doc)
    db.commit()
    return None

@router.post("/{document_id}/access", response_model=List[schemas.DocumentRoleAccessResponse])
def manage_document_access(
    document_id: int,
    access_list: List[schemas.DocumentRoleAccessCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Clear existing access
    db.query(DocumentRoleAccess).filter(DocumentRoleAccess.document_id == document_id).delete()

    new_access = []
    for access in access_list:
        new_acc = DocumentRoleAccess(
            document_id=document_id,
            role_id=access.role_id,
            permission_type=access.permission_type
        )
        db.add(new_acc)
        new_access.append(new_acc)
    
    db.commit()
    
    # Reload to return properly nested roles
    return db.query(DocumentRoleAccess).filter(DocumentRoleAccess.document_id == document_id).all()
