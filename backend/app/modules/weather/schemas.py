from typing import List, Optional

from pydantic import BaseModel, Field


class DailyWeather(BaseModel):
    date: str
    weather_code: Optional[int] = None
    temperature_max_c: Optional[float] = None
    temperature_min_c: Optional[float] = None
    precipitation_mm: float = 0.0
    precipitation_probability_max_pct: float = 0.0
    wind_speed_max_kmh: Optional[float] = None
    wind_gust_max_kmh: Optional[float] = None
    et0_mm: Optional[float] = None
    rain_probability_label: Optional[str] = None
    rainfall_intensity: Optional[str] = None


class Advisory(BaseModel):
    date: str
    type: str
    severity: str = Field(pattern="^(watch|alert|warning)$")
    title: str
    message: str
    recommended_action: str
    crop: Optional[str] = None
    source: str
    evidence_level: str = Field(pattern="^(direct|derived|prototype)$")


class SprayWindow(BaseModel):
    start: str
    end: str
    score: str = Field(pattern="^(good|acceptable)$")
    reason: str


class WeatherIntelligenceResponse(BaseModel):
    latitude: float
    longitude: float
    timezone: str
    crop: Optional[str] = None
    crop_stage: Optional[str] = None
    daily_forecast: List[DailyWeather]
    advisories: List[Advisory]
    spray_windows: List[SprayWindow]
    disclaimer: str
