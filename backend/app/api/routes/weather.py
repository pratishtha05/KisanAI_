from fastapi import APIRouter, Depends
from app.schemas.weather import WeatherResponse
from app.services.weather_service import weather_service
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/current", response_model=WeatherResponse)
def get_weather(location: str = "Default", current_user: User = Depends(get_current_user)):
    return weather_service.get_weather(location)
