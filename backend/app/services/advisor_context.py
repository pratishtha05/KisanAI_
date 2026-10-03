from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Optional
import logging
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.farm import Farm
from app.models.farmer_profile import FarmerProfile
from app.models.user import User
from app.schemas.farm_advisor import FarmAdvisorQueryRequest
from app.services.weather_service import weather_service

log = logging.getLogger("kisanai.advisor")
class AdvisorUnavailable(Exception):
    """The LLM cannot answer right now (still loading, failed to load, ...)."""


LANGUAGES = {
    "en": "English", "hi": "Hindi", "pa": "Punjabi", "mr": "Marathi", "gu": "Gujarati",
    "bn": "Bengali", "te": "Telugu", "ta": "Tamil", "kn": "Kannada", "ml": "Malayalam",
    "as": "Assamese", "or": "Odia", "ur": "Urdu", "ks": "Kashmiri", "sd": "Sindhi",
    "kok": "Konkani", "mai": "Maithili",
}

STAGES = {
    "sown": "just sown", "veg": "vegetative growth", "flower": "flowering", "harvest": "harvesting",
}
CYCLES = {"short": "short (~3 months)", "med": "medium (~4 months)", "long": "long (5+ months)"}


@dataclass
class AdvisorContext:
    farm_id: Optional[int] = None
    crop: Optional[str] = None
    stage: Optional[str] = None
    cycle: Optional[str] = None
    soil_type: Optional[str] = None
    land_acres: Optional[float] = None
    sowing_date: Optional[date] = None
    location: Optional[str] = None
    language_name: str = "English"
    weather: Optional[dict] = field(default=None)


def _language_name(value: Optional[str]) -> str:
    if not value:
        return "English"
    v = value.strip()
    return LANGUAGES.get(v.lower(), v.title()) 


def build_context(db: Session, user: User, request: FarmAdvisorQueryRequest) -> AdvisorContext:
    try:
        farms = db.query(Farm).filter(Farm.user_id == user.id).all()
        profile = db.query(FarmerProfile).filter(FarmerProfile.user_id == user.id).first()
    except SQLAlchemyError:
        log.exception("Could not read farm/profile for the advisor; answering without them")
        db.rollback()
        farms, profile = [], None
    # farms = db.query(Farm).filter(Farm.user_id == user.id).all()
    
    farm = None
    if request.farm_id is not None:
        farm = next((f for f in farms if f.id == request.farm_id), None)  # only the user's own farms
    elif request.crop:
        farm = next((f for f in farms if request.crop.lower() in (f.crop or "").lower()), None)
    if farm is None and farms:
        farm = farms[0]

    # profile = db.query(FarmerProfile).filter(FarmerProfile.user_id == user.id).first()
    district = (profile.district if profile else None)
    state = (profile.state if profile else None)
    location = request.location or ", ".join(p for p in (district, state) if p) or None

    ctx = AdvisorContext(
        farm_id=farm.id if farm else None,
        crop=request.crop or (farm.crop if farm else None),
        stage=request.crop_stage or (STAGES.get(farm.stage, farm.stage) if farm and farm.stage else None),
        cycle=CYCLES.get(farm.cycle_time, farm.cycle_time) if farm and farm.cycle_time else None,
        soil_type=request.soil_type or (farm.soil_type if farm else None),
        land_acres=farm.land_size if farm else None,
        sowing_date=farm.sowing_date if farm else None,
        location=location,
        language_name=_language_name(request.language or (profile.language if profile else None)),
    )

    try:
        w = weather_service.get_weather(location or "Default")
        ctx.weather = {
            "current_temp": w.current_temp, "current_condition": w.current_condition, "humidity": w.humidity,
            "wind_speed": w.wind_speed, "rain_probability": w.rain_probability,
            "forecast": [
                {"day": d.day, "temp_max": d.temp_max, "temp_min": d.temp_min,
                 "condition": d.condition, "rain_probability": d.rain_probability}
                for d in w.forecast
            ],
        }
    except Exception:  
        ctx.weather = None
    return ctx
