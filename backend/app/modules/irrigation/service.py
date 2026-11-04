import asyncio
import logging
import time
from datetime import date, datetime
from typing import Any, Dict, Optional, Tuple

from app.models.farm import Farm
from app.modules.weather.service import get_weather_intelligence
from app.modules.irrigation.rule_engine import IrrigationRuleEngine

logger = logging.getLogger(__name__)

WEATHER_TIMEOUT_SECONDS = 12
WEATHER_ATTEMPTS = 2
WEATHER_CACHE_TTL_SECONDS = 30 * 60

# (lat, lon, crop, stage) -> (timestamp, weather dict)
# Per-process cache. Fine for a prototype; use Redis if you run several workers.
_WEATHER_CACHE: Dict[Tuple, Tuple[float, Dict[str, Any]]] = {}


def _as_date(value: Any) -> Optional[date]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    return value


async def _get_weather(farm: Farm) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """
    Returns (weather, note). Never raises: irrigation advice must still work
    when the weather service is slow or down. Falls back to the last cached
    forecast, then to None.
    """
    if farm.latitude is None or farm.longitude is None:
        return None, "Farm location is missing, so weather was not used."

    key = (round(farm.latitude, 2), round(farm.longitude, 2), farm.crop, farm.stage)
    cached = _WEATHER_CACHE.get(key)
    now = time.time()

    if cached and now - cached[0] < WEATHER_CACHE_TTL_SECONDS:
        return cached[1], None

    last_error: Optional[BaseException] = None
    for attempt in range(1, WEATHER_ATTEMPTS + 1):
        try:
            weather = await asyncio.wait_for(
                get_weather_intelligence(
                    latitude=farm.latitude,
                    longitude=farm.longitude,
                    crop=farm.crop,
                    crop_stage=farm.stage,
                ),
                timeout=WEATHER_TIMEOUT_SECONDS,
            )
            _WEATHER_CACHE[key] = (time.time(), weather)
            return weather, None
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            # %r shows the exception type even when str(exc) is empty (timeouts)
            logger.warning("Weather fetch attempt %d failed: %r", attempt, exc)
            if attempt < WEATHER_ATTEMPTS:
                await asyncio.sleep(0.7)

    if cached:
        return cached[1], "Live weather was unavailable, so the last saved forecast was used."

    logger.error("Weather unavailable for farm %s: %r", farm.id, last_error)
    return None, "Weather information is currently unavailable. Advice is based on crop stage and schedule only."


async def get_irrigation_recommendation(
    farm: Farm,
    soil_feedback: Optional[str] = None,
) -> dict:

    # Crop is the only hard requirement. Soil type and location are optional:
    # without soil the engine assumes medium soil, without location it skips weather.
    if not farm.crop:
        raise ValueError(
            "Crop information is missing. Please update your farm crop."
        )

    weather, weather_note = await _get_weather(farm)
    daily_forecast = (weather or {}).get("daily_forecast") or []

    # Use the forecast's first date as "today" so irrigation and weather stay in sync.
    today = date.today()
    if daily_forecast:
        try:
            today = date.fromisoformat(str(daily_forecast[0]["date"])[:10])
        except (KeyError, ValueError, TypeError):
            today = date.today()

    engine = IrrigationRuleEngine(farm.crop)  # raises ValueError for unsupported crops

    try:
        recommendation = engine.evaluate(
            today=today,
            sowing_date=_as_date(farm.sowing_date),
            last_irrigation_date=_as_date(farm.last_irrigation_date),
            soil_type=farm.soil_type,
            selected_stage=farm.stage,
            soil_feedback=soil_feedback,
            forecast=daily_forecast,
        )
    except Exception:
        # Full traceback in the server log; the route still returns a generic 500.
        logger.exception(
            "Irrigation engine failed: farm=%s crop=%r stage=%r sowing=%r last_irrigation=%r",
            farm.id, farm.crop, farm.stage, farm.sowing_date, farm.last_irrigation_date,
        )
        raise

    if weather_note:
        existing = recommendation.get("weather_note")
        recommendation["weather_note"] = f"{existing} {weather_note}".strip() if existing else weather_note

    return {
        "farm_id": farm.id,
        "crop": farm.crop,
        "soil_type": farm.soil_type,
        "sowing_date": (
            _as_date(farm.sowing_date).isoformat()
            if farm.sowing_date
            else None
        ),
        "last_irrigation_date": (
            _as_date(farm.last_irrigation_date).isoformat()
            if farm.last_irrigation_date
            else None
        ),

        "recommendation": recommendation,

        "weather_available": weather is not None,

        "weather_adjustment": {
            "rain_expected_soon": recommendation.get("rain_expected_soon", False),
            "rain_adjustment_days": recommendation.get("rain_adjustment_days", 0),
        },

        "disclaimer": (
            "Prototype irrigation decision support. "
            "Recommendations combine crop-specific rules, soil information "
            "and weather forecasts. Follow local agricultural advisories "
            "and actual field conditions."
        ),
    }