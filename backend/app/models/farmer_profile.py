from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base

class FarmerProfile(Base):
    __tablename__ = "farmer_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    language = Column(String, default="English")
    state = Column(String, nullable=True)
    district = Column(String, nullable=True)
    village = Column(String, nullable=True)
    
    user = relationship("User", back_populates="profile")
