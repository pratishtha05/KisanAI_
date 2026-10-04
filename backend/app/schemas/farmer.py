from pydantic import BaseModel
from typing import Optional

class FarmerProfileCreate(BaseModel):
    name: str
    language: Optional[str] = "English"
    state: Optional[str] = None
    district: Optional[str] = None
    village: Optional[str] = None

class FarmerProfileResponse(FarmerProfileCreate):
    id: int
    user_id: int
    class Config:
        from_attributes = True
