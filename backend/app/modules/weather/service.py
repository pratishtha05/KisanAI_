from typing import Any, Dict, List, Optional

from app.integrations.weather.open_meteo import fetch_weather_forecast
from .rule_engine import (
    deduplicate_advisories,
    evaluate_crop_operation_rules,
    evaluate_disease_weather_rules,
    evaluate_generic_fallback_rules,
    find_spray_windows,
    is_crop_specific_supported,
    normalize_crop_name,
    probability_label,
    rainfall_intensity,
)


def _safe_get(values: List[Any], index: int, default=None):
    try:
        return values[index]
    except (IndexError, TypeError):
        return default


def normalize_hourly(raw: Dict[str, Any]) -> List[Dict[str, Any]]:
    hourly = raw.get("hourly", {})
    times = hourly.get("time", [])
    rows: List[Dict[str, Any]] = []

    fields = [
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

    for i, time in enumerate(times):
        row = {"time": time}
        for field in fields:
            row[field] = _safe_get(hourly.get(field, []), i)
        rows.append(row)
    return rows


def normalize_daily(raw: Dict[str, Any]) -> List[Dict[str, Any]]:
    daily = raw.get("daily", {})
    times = daily.get("time", [])
    rows: List[Dict[str, Any]] = []

    for i, date in enumerate(times):
        rain = _safe_get(daily.get("precipitation_sum", []), i, 0) or 0
        rain_prob = _safe_get(daily.get("precipitation_probability_max", []), i, 0) or 0
        row = {
            "date": date,
            "weather_code": _safe_get(daily.get("weather_code", []), i),
            "temperature_max_c": _safe_get(daily.get("temperature_2m_max", []), i),
            "temperature_min_c": _safe_get(daily.get("temperature_2m_min", []), i),
            "precipitation_mm": rain,
            "precipitation_probability_max_pct": rain_prob,
            "wind_speed_max_kmh": _safe_get(daily.get("wind_speed_10m_max", []), i),
            "wind_gust_max_kmh": _safe_get(daily.get("wind_gusts_10m_max", []), i),
            "et0_mm": _safe_get(daily.get("et0_fao_evapotranspiration", []), i),
            "rain_probability_label": probability_label(rain_prob),
            "rainfall_intensity": rainfall_intensity(rain),
        }
        rows.append(row)
    return rows


async def get_weather_intelligence(
    latitude: float,
    longitude: float,
    crop: Optional[str] = None,
    crop_stage: Optional[str] = None,
) -> Dict[str, Any]:
    raw = await fetch_weather_forecast(latitude, longitude)
    hourly = normalize_hourly(raw)
    daily = normalize_daily(raw)

    crop_key = normalize_crop_name(crop) if crop else None

    # Tiered crop logic:
    # 1. Supported crop -> use only its dedicated crop-specific rules.
    # 2. Unsupported crop (or no crop selected) -> use the generic fallback layer.
    if crop_key and is_crop_specific_supported(crop_key):
        advisories = []
        advisories.extend(evaluate_crop_operation_rules(daily, crop_key, crop_stage))
        advisories.extend(evaluate_disease_weather_rules(
            hourly, crop_key, crop_stage, include_generic=False
        ))
        rule_mode = "crop_specific"
    else:
        advisories = evaluate_generic_fallback_rules(daily, hourly, crop_key)
        rule_mode = "generic_fallback"

    return {
        "latitude": raw.get("latitude", latitude),
        "longitude": raw.get("longitude", longitude),
        "timezone": raw.get("timezone", "auto"),
        "crop": crop_key,
        "crop_stage": crop_stage,
        "rule_mode": rule_mode,
        "daily_forecast": daily,
        "advisories": deduplicate_advisories(advisories),
        "spray_windows": find_spray_windows(hourly),
        "disclaimer": (
            "Prototype decision support only. Advisory rules combine IMD/ICAR/PAU/TNAU guidance "
            "with explicitly marked engineering thresholds. Always follow pesticide labels and local official advisories."
        ),
    }
