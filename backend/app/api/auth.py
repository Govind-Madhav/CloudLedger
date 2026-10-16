from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from backend.app.database import get_db
from backend.app.models import Admin
from backend.app.schemas import LoginRequest, TokenResponse, AdminProfile
from backend.app.auth import verify_password, create_access_token, get_current_admin

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    admin = db.query(Admin).filter(Admin.email == payload.email).first()
    if not admin or not verify_password(payload.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not admin.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    admin.last_login_at = datetime.now(timezone.utc)
    db.commit()

    token = create_access_token(data={"sub": admin.id, "email": admin.email, "role": admin.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "admin": {
            "id": admin.id,
            "email": admin.email,
            "full_name": admin.full_name,
            "role": admin.role
        }
    }

@router.get("/me", response_model=AdminProfile)
def get_me(current_admin: Admin = Depends(get_current_admin)):
    return {
        "id": current_admin.id,
        "email": current_admin.email,
        "full_name": current_admin.full_name,
        "role": current_admin.role
    }
