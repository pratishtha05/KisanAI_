from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class UserBase(BaseModel):
    mobile: str

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True
