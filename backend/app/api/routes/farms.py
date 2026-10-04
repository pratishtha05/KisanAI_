from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.farm import Farm
from app.schemas.farm import FarmCreate, FarmResponse
from app.models.user import User
from app.api.deps import get_current_user
from typing import List

router = APIRouter()

@router.post("/", response_model=FarmResponse)
def create_farm(farm: FarmCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_farm = Farm(**farm.dict(), user_id=current_user.id)
    db.add(db_farm)
    db.commit()
    db.refresh(db_farm)
    return db_farm

@router.get("/", response_model=List[FarmResponse])
def get_farms(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Farm).filter(Farm.user_id == current_user.id).all()

@router.put("/{farm_id}", response_model=FarmResponse)
def update_farm(farm_id: int, farm_update: FarmCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_farm = db.query(Farm).filter(Farm.id == farm_id, Farm.user_id == current_user.id).first()
    if not db_farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    
    for key, value in farm_update.dict().items():
        setattr(db_farm, key, value)
    
    db.commit()
    db.refresh(db_farm)
    return db_farm
