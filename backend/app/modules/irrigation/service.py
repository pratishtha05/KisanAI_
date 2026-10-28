from datetime import date
from typing import Optional

from app.models.farm import Farm
from app.modules.weather.service import get_weather_intelligence
from app.modules.irrigation.rule_engine import IrrigationRuleEngine


async def get_irrigation_recommendation(
    farm: Farm,
    soil_feedback: Optional[str] = None,
) -> dict:

    # Required farm information
    if farm.latitude is None or farm.longitude is None:
        raise ValueError(
            "Farm location is missing. Please update your farm latitude and longitude."
        )

    if not farm.crop:
        raise ValueError(
            "Crop information is missing. Please update your farm crop."
        )

    if not farm.soil_type:
        raise ValueError(
            "Soil type is missing. Please update your farm soil type."
        )

    # Get weather information from the existing Weather Intelligence module
    try:
        weather = await get_weather_intelligence(
            latitude=farm.latitude,
            longitude=farm.longitude,
            crop=farm.crop,
            crop_stage=farm.stage,
        )
    except Exception as exc:
        raise ValueError(
            f"Unable to retrieve weather information for irrigation planning: {str(exc)}"
        )

    daily_forecast = weather.get("daily_forecast", [])

    # Use forecast date as the current date so irrigation and weather
    # calculations remain synchronized.
    if daily_forecast:
        try:
            today = date.fromisoformat(daily_forecast[0]["date"])
        except (KeyError, ValueError):
            today = date.today()
    else:
        today = date.today()

    # Create crop-specific irrigation rule engine
    engine = IrrigationRuleEngine(farm.crop)

    recommendation = engine.evaluate(
        today=today,
        sowing_date=farm.sowing_date,
        last_irrigation_date=farm.last_irrigation_date,
        soil_type=farm.soil_type,
        selected_stage=farm.stage,
        soil_feedback=soil_feedback,
        forecast=daily_forecast,
    )

    return {
        "farm_id": farm.id,
        "crop": farm.crop,
        "soil_type": farm.soil_type,
        "sowing_date": (
            farm.sowing_date.isoformat()
            if farm.sowing_date
            else None
        ),
        "last_irrigation_date": (
            farm.last_irrigation_date.isoformat()
            if farm.last_irrigation_date
            else None
        ),

        "recommendation": recommendation,

        "weather_adjustment": {
            "rain_expected_soon": recommendation.get(
                "rain_expected_soon",
                False,
            ),
            "rain_adjustment_days": recommendation.get(
                "rain_adjustment_days",
                0,
            ),
        },

        "disclaimer": (
            "Prototype irrigation decision support. "
            "Recommendations combine crop-specific rules, soil information "
            "and weather forecasts. Follow local agricultural advisories "
            "and actual field conditions."
        ),
    }