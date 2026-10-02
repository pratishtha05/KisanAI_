from pydantic import BaseModel
from typing import List

class DailyForecast(BaseModel):
    day: str
    temp_max: int
    temp_min: int
    rain_probability: int
    condition: str
    icon: str

class WeatherAdvisory(BaseModel):
    title: str
    recommendation: str

class WeatherResponse(BaseModel):
    current_temp: int
    current_condition: str
    humidity: int
    wind_speed: int
    rain_probability: int
    advisories: List[WeatherAdvisory]
    forecast: List[DailyForecast]
