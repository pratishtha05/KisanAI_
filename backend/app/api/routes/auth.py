from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.auth import SendOTPRequest, VerifyOTPRequest, TokenResponse
from app.schemas.user import UserResponse
from app.models.user import User
from app.services.otp_service import otp_service
from app.core.security import create_access_token
from app.api.deps import get_current_user
from datetime import timedelta
from app.core.config import settings

router = APIRouter()

@router.post("/send-otp")
def send_otp(request: SendOTPRequest):
    # Here you would validate mobile number
    otp_service.send_otp(request.mobile)
    return {"message": "OTP sent successfully"}

@router.post("/verify-otp", response_model=TokenResponse)
def verify_otp(request: VerifyOTPRequest, db: Session = Depends(get_db)):
    if not otp_service.verify_otp(request.mobile, request.otp):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
        
    user = db.query(User).filter(User.mobile == request.mobile).first()
    is_new_user = False
    
    if not user:
        # New user
        user = User(mobile=request.mobile)
        db.add(user)
        db.commit()
        db.refresh(user)
        is_new_user = True
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer", "is_new_user": is_new_user}

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user
