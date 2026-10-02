from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.farmer_profile import FarmerProfile
from app.schemas.farmer import FarmerProfileCreate, FarmerProfileResponse
from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter()

@router.post("/profile", response_model=FarmerProfileResponse)
def create_profile(profile: FarmerProfileCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_profile = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
    if db_profile:
        # Update
        for key, value in profile.dict().items():
            setattr(db_profile, key, value)
    else:
        db_profile = FarmerProfile(**profile.dict(), user_id=current_user.id)
        db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    return db_profile

@router.get("/profile", response_model=FarmerProfileResponse)
def get_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_profile = db.query(FarmerProfile).filter(FarmerProfile.user_id == current_user.id).first()
    if not db_profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return db_profile

@router.delete("/me")
def delete_user_me(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.delete(current_user)
    db.commit()
    return {"message": "User deleted successfully"}
