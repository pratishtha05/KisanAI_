from typing import Any, Dict

import httpx

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

HOURLY_FIELDS = [
    "temperature_2m",
    "relative_humidity_2m",
    "precipitation_probability",
    "precipitation",
    "weather_code",
    "cloud_cover",
    "wind_speed_10m",
    "wind_gusts_10m",
    "et0_fao_evapotranspiration",
    "vapour_pressure_deficit",
]

DAILY_FIELDS = [
    "weather_code",
    "temperature_2m_max",
    "temperature_2m_min",
    "precipitation_sum",
    "precipitation_probability_max",
    "wind_speed_10m_max",
    "wind_gusts_10m_max",
    "et0_fao_evapotranspiration",
]


async def fetch_weather_forecast(
    latitude: float,
    longitude: float,
    forecast_days: int = 7,
) -> Dict[str, Any]:
    """Fetch a 7-day agriculture-friendly forecast from Open-Meteo."""

    params = {
        "latitude": latitude,
        "longitude": longitude,
        "hourly": ",".join(HOURLY_FIELDS),
        "daily": ",".join(DAILY_FIELDS),
        "timezone": "auto",
        "forecast_days": max(1, min(forecast_days, 7)),
    }

    timeout = httpx.Timeout(12.0, connect=5.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.get(OPEN_METEO_URL, params=params)
        response.raise_for_status()
        return response.json()
