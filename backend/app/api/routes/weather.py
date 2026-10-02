from fastapi import APIRouter, Depends
from typing import Optional

from app.schemas.weather import WeatherResponse
from app.modules.weather.schemas import WeatherIntelligenceResponse
from app.modules.weather.service import get_weather_intelligence

from app.services.weather_service import weather_service
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()


@router.get("/current", response_model=WeatherResponse)
def get_weather(
    location: str = "Default",
    current_user: User = Depends(get_current_user),
):
    return weather_service.get_weather(location)


@router.get("/intelligence", response_model=WeatherIntelligenceResponse)
async def get_weather_intelligence_route(
    latitude: float,
    longitude: float,
    crop: Optional[str] = None,
    crop_stage: Optional[str] = None,
    current_user: User = Depends(get_current_user),
):
    return await get_weather_intelligence(
        latitude=latitude,
        longitude=longitude,
        crop=crop,
        crop_stage=crop_stage,
    )