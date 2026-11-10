
import asyncio
import logging
from datetime import date, datetime
from typing import Any, Optional

from app.models.farm import Farm
from app.modules.weather.service import get_weather_intelligence

from app.modules.fertilizer.rule_engine import (
    FarmData,
    SoilData,
    FertilizerRuleEngine,
)
from app.modules.fertilizer.schemas import FertilizerRequest

logger = logging.getLogger(__name__)

WEATHER_TIMEOUT_SECONDS = 12


def _as_date(value: Any) -> Optional[date]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    return value


async def _get_farm_weather(farm: Farm) -> tuple[dict, Optional[str]]:
    """
    Fetch weather for the farm when coordinates are available.
    Fertilizer advice continues if weather is unavailable.
    """
    if farm.latitude is None or farm.longitude is None:
        return {}, "Farm coordinates are unavailable; weather was not considered."

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

        if not isinstance(weather, dict):
            return {}, "Weather service returned an unexpected response."

        # Include the nearest forecast day because application timing
        # rules may need its rainfall and wind information.
        combined = dict(weather)
        daily = weather.get("daily_forecast") or []

        if daily and isinstance(daily[0], dict):
            combined.update(daily[0])

        return combined, None

    except asyncio.TimeoutError:
        logger.warning("Weather request timed out for farm %s", farm.id)
        return {}, "Weather information timed out; weather adjustments were skipped."

    except Exception:
        logger.exception("Weather request failed for farm %s", farm.id)
        return {}, "Weather information is currently unavailable."


def _build_farm_data(
    farm: Farm,
    request: FertilizerRequest,
    weather: dict,
) -> FarmData:
    """
    Combine database farm details with optional farmer-provided inputs.
    Missing values remain None; they are not treated as zero or deficiency.
    """

    soil_input = request.soil

    soil = SoilData(
        ph=soil_input.ph,
        ec=soil_input.ec,
        organic_carbon_percent=soil_input.organic_carbon_percent,
        nitrogen_status=soil_input.nitrogen_status,
        phosphorus_status=soil_input.phosphorus_status,
        potassium_status=soil_input.potassium_status,
        sulphur_status=soil_input.sulphur_status,
        zinc_status=soil_input.zinc_status,
        iron_status=soil_input.iron_status,
        boron_status=soil_input.boron_status,
        laboratory_values=soil_input.laboratory_values,
        laboratory_units=soil_input.laboratory_units,
        texture=soil_input.texture,
        soil_type=soil_input.soil_type or farm.soil_type,
    )

    # Do not assume the unit of Farm.land_size.
    # Only use an area when the request explicitly supplies both values.
    land_size = None
    land_unit = "acre"

    if request.land_size is not None and request.land_unit:
        land_size = request.land_size
        land_unit = request.land_unit.strip().lower()

    return FarmData(
        crop=farm.crop,
        location=request.location,
        state=request.state,
        district=request.district,

        variety=request.variety,
        season=request.season,
        stage=request.stage or farm.stage,
        sowing_date=_as_date(farm.sowing_date),

        land_size=land_size,
        land_unit=land_unit,

        soil=soil,

        previous_crop=request.previous_crop,
        previous_crop_phosphorus_applied=(
            request.previous_crop_phosphorus_applied
        ),

        fertilizer_history=request.fertilizer_history,
        manure_history=request.manure_history,

        irrigation_type=request.irrigation_type,
        irrigation_water_quality=request.irrigation_water_quality,

        symptoms=request.symptoms,
        pest_observations=request.pest_observations,
        disease_observations=request.disease_observations,

        disease_prediction=request.disease_prediction,
        pest_prediction=request.pest_prediction,

        weather=weather,
    )


async def get_fertilizer_recommendation(
    farm: Farm,
    request: FertilizerRequest,
) -> dict:
    if not farm.crop:
        raise ValueError("Crop information is missing from this farm.")

    weather, weather_note = await _get_farm_weather(farm)

    farm_data = _build_farm_data(
        farm=farm,
        request=request,
        weather=weather,
    )

    engine = FertilizerRuleEngine(farm_data)
    result = engine.evaluate()

    if weather_note:
        result.setdefault("warnings", []).append(weather_note)

    result["farm_id"] = farm.id
    result["farm_soil_type"] = farm.soil_type
    result["weather_available"] = bool(weather)

    result["input_completeness"] = {
        "soil_test_provided": bool(
            request.soil.laboratory_values
            or request.soil.ph is not None
            or request.soil.nitrogen_status
            or request.soil.phosphorus_status
            or request.soil.potassium_status
        ),
        "variety_provided": bool(request.variety),
        "previous_crop_provided": bool(request.previous_crop),
        "fertilizer_history_provided": bool(request.fertilizer_history),
        "weather_available": bool(weather),
    }

    # Remove duplicate warnings while preserving their original order.
    result["warnings"] = list(dict.fromkeys(result["warnings"]))

    return result
