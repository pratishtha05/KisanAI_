from pydantic import BaseModel
from typing import Optional
from datetime import date

class FarmCreate(BaseModel):
    crop: str
    stage: Optional[str] = None
    cycle_time: Optional[str] = None
    land_size: float
    soil_type: str
    sowing_date: Optional[date] = None

class FarmResponse(FarmCreate):
    id: int
    user_id: int
    class Config:
        from_attributes = True
