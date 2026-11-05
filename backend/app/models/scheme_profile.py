from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Text

from app.db.database import Base


class SchemeProfile(Base):
    """A farmer's optional answers to the scheme-eligibility questions (caste category,
    family income-tax status, ...). The whole answer set is ONE AES-256-GCM encrypted
    blob (see app/core/crypto.py), so nothing sensitive is readable in the database."""
    __tablename__ = "scheme_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    data_enc = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
