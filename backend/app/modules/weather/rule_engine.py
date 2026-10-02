from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any, Dict, Iterable, List, Optional

from .rules_config import (
    COLD_WAVE_TEMP_C,
    CROP_RULES,
    FOG_CODES,
    FROST_SENSITIVE_CROPS,
    GENERIC_FUNGAL,
    HEAT_WAVE_TEMP_C,
    PROBABILITY_THRESHOLDS,
    RAIN_CODES,
    RAINFALL_THRESHOLDS,
    SEVERE_COLD_WAVE_TEMP_C,
    SEVERE_HEAT_WAVE_TEMP_C,
    SPRAY,
    SUPPORTED_CROPS,
    THUNDERSTORM_CODES,
)

SOURCE_IMD = "IMD Standard Operation Procedure - Weather Forecasting and Warning Services (2021)"
SOURCE_ICAR_KHARIF = "ICAR Kharif Agro-Advisories for Farmers 2025"
SOURCE_ICAR_RABI = "ICAR Rabi Agro-Advisory for Farmers 2021-22"
SOURCE_PAU_LATE_BLIGHT = "Punjab Agricultural University - Late Blight Decision Support / favourable conditions"
SOURCE_TNAU_TOMATO = "TNAU Agritech Portal - Tomato disease favourable conditions"
SOURCE_SPRAY = "University extension pesticide-drift guidance (UF/VT/MSU); prototype operationalization"
SOURCE_ICAR_APPLE = "ICAR Kharif Agro-Advisories for Farmers 2025 - Apple"
SOURCE_ICAR_SUGARCANE = "ICAR Kharif Agro-Advisories for Farmers 2025 - Sugarcane"
SOURCE_TEA_BOARD = "Tea Board India - Plant Protection Code / weather-based crop advisory context"
SOURCE_ICAR_CASHEW = "ICAR - Cashew soil, water and moisture conservation guidance"


CROP_ALIASES = {
    "corn": "maize",
    "corn/maize": "maize",
    "maize": "maize",
    "cucurbit": "cucurbits",
    "cucumber": "cucurbits",
    "bottle gourd": "cucurbits",
    "bitter gourd": "cucurbits",
    "watermelon": "cucurbits",
    "muskmelon": "cucurbits",
}


def normalize_crop_name(crop: Optional[str]) -> str:
    value = (crop or "").strip().lower()
    return CROP_ALIASES.get(value, value)


def is_crop_specific_supported(crop: Optional[str]) -> bool:
    return normalize_crop_name(crop) in SUPPORTED_CROPS


def probability_label(probability: float) -> str:
    p = max(0.0, min(float(probability or 0), 100.0))
    for label, (low, high) in PROBABILITY_THRESHOLDS.items():
        if low <= p <= high:
            return label.replace("_", " ")
    return "most likely"


def rainfall_intensity(mm: float) -> str:
    value = max(0.0, float(mm or 0))
    if value < 0.1:
        return "no rain"
    for label, (low, high) in RAINFALL_THRESHOLDS.items():
        if low <= value <= high:
            return label.replace("_", " ")
    return "extremely heavy"


def _adv(
    *,
    date: str,
    type_: str,
    severity: str,
    title: str,
    message: str,
    action: str,
    source: str,
    evidence: str,
    crop: Optional[str] = None,
) -> Dict[str, Any]:
    return {
        "date": date,
        "type": type_,
        "severity": severity,
        "title": title,
        "message": message,
        "recommended_action": action,
        "crop": crop,
        "source": source,
        "evidence_level": evidence,
    }


def evaluate_general_daily_rules(daily: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    advisories: List[Dict[str, Any]] = []

    for day in daily:
        date = day["date"]
        rain = float(day.get("precipitation_mm") or 0)
        rain_prob = float(day.get("precipitation_probability_max_pct") or 0)
        tmax = day.get("temperature_max_c")
        tmin = day.get("temperature_min_c")
        gust = float(day.get("wind_gust_max_kmh") or 0)
        code = day.get("weather_code")

        intensity = rainfall_intensity(rain)

        if intensity == "moderate" and rain_prob >= 50:
            advisories.append(_adv(
                date=date,
                type_="moderate_rain",
                severity="watch",
                title="Moderate rainfall possible",
                message=f"Forecast rainfall is {rain:.1f} mm with {rain_prob:.0f}% maximum probability.",
                action="Review irrigation and fertilizer plans and keep drainage paths clear.",
                source=SOURCE_IMD,
                evidence="direct",
            ))
        elif intensity == "heavy":
            advisories.append(_adv(
                date=date,
                type_="heavy_rain",
                severity="alert",
                title="Heavy rainfall warning",
                message=f"Forecast 24-hour rainfall is {rain:.1f} mm, within IMD's heavy-rain range.",
                action="Postpone avoidable field operations, review irrigation, and ensure drainage.",
                source=SOURCE_IMD,
                evidence="direct",
            ))
        elif intensity == "very heavy":
            advisories.append(_adv(
                date=date,
                type_="very_heavy_rain",
                severity="warning",
                title="Very heavy rainfall risk",
                message=f"Forecast 24-hour rainfall is {rain:.1f} mm, within IMD's very-heavy-rain range.",
                action="Avoid non-essential field operations and prepare for waterlogging or crop lodging.",
                source=SOURCE_IMD,
                evidence="direct",
            ))
        elif intensity == "extremely heavy":
            advisories.append(_adv(
                date=date,
                type_="extremely_heavy_rain",
                severity="warning",
                title="Extremely heavy rainfall risk",
                message=f"Forecast 24-hour rainfall is {rain:.1f} mm, meeting IMD's extremely-heavy-rain threshold.",
                action="Take protective field measures immediately and avoid field work during the event.",
                source=SOURCE_IMD,
                evidence="direct",
            ))

        if tmax is not None and float(tmax) >= SEVERE_HEAT_WAVE_TEMP_C:
            advisories.append(_adv(
                date=date,
                type_="severe_heat",
                severity="warning",
                title="Severe extreme-heat condition",
                message=f"Maximum temperature is forecast near {float(tmax):.1f}°C.",
                action="Avoid strenuous midday field work; protect workers, livestock and heat-sensitive crops.",
                source=SOURCE_IMD,
                evidence="direct",
            ))
        elif tmax is not None and float(tmax) >= HEAT_WAVE_TEMP_C:
            advisories.append(_adv(
                date=date,
                type_="extreme_heat",
                severity="alert",
                title="Extreme heat condition",
                message=f"Maximum temperature is forecast near {float(tmax):.1f}°C.",
                action="Shift field operations to cooler hours and monitor crop water stress.",
                source=SOURCE_IMD,
                evidence="direct",
            ))

        if tmin is not None and float(tmin) <= SEVERE_COLD_WAVE_TEMP_C:
            advisories.append(_adv(
                date=date,
                type_="severe_cold",
                severity="warning",
                title="Severe cold condition",
                message=f"Minimum temperature is forecast near {float(tmin):.1f}°C.",
                action="Protect cold-sensitive crops and review frost-protection measures.",
                source=SOURCE_IMD,
                evidence="direct",
            ))
        elif tmin is not None and float(tmin) <= COLD_WAVE_TEMP_C:
            advisories.append(_adv(
                date=date,
                type_="cold_wave",
                severity="alert",
                title="Cold-wave temperature threshold reached",
                message=f"Minimum temperature is forecast near {float(tmin):.1f}°C.",
                action="Monitor frost-sensitive crops and use suitable protective measures.",
                source=SOURCE_IMD,
                evidence="direct",
            ))

        # Prototype field-operation gust threshold; IMD identifies gusts/strong winds as hazards,
        # while this cut-off is deliberately conservative for agricultural operations.
        if gust >= 40:
            advisories.append(_adv(
                date=date,
                type_="strong_gusts",
                severity="alert" if gust < 60 else "warning",
                title="Strong wind gusts",
                message=f"Maximum gusts may reach about {gust:.0f} km/h.",
                action="Avoid spraying; secure lightweight material and support lodging-prone crops.",
                source=SOURCE_IMD,
                evidence="prototype",
            ))

        if code in THUNDERSTORM_CODES:
            advisories.append(_adv(
                date=date,
                type_="thunderstorm",
                severity="warning",
                title="Thunderstorm risk",
                message="The forecast weather code indicates thunderstorm conditions.",
                action="Avoid exposed field work and spraying during thunderstorm conditions.",
                source="Open-Meteo WMO weather code + IMD thunderstorm hazard guidance",
                evidence="derived",
            ))

    return advisories


def _wet_hour(row: Dict[str, Any]) -> bool:
    code = row.get("weather_code")
    return (
        float(row.get("precipitation") or 0) > 0
        or float(row.get("cloud_cover") or 0) >= GENERIC_FUNGAL["cloud_cover_pct"]
        or code in FOG_CODES
        or code in RAIN_CODES
    )


def _count_consecutive_risky_hours(
    rows: List[Dict[str, Any]],
    predicate,
) -> int:
    best = current = 0
    for row in rows:
        if predicate(row):
            current += 1
            best = max(best, current)
        else:
            current = 0
    return best


def _hourly_by_date(hourly: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    grouped: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for row in hourly:
        grouped[row["time"][:10]].append(row)
    return grouped


def evaluate_disease_weather_rules(
    hourly: List[Dict[str, Any]],
    crop: Optional[str],
    crop_stage: Optional[str] = None,
    include_generic: bool = True,
) -> List[Dict[str, Any]]:
    advisories: List[Dict[str, Any]] = []
    grouped = _hourly_by_date(hourly)
    crop_key = (crop or "").strip().lower()

    for date, rows in grouped.items():
        # Generic fungal-risk heuristic: useful when no disease-specific rule exists.
        generic_hours = _count_consecutive_risky_hours(
            rows,
            lambda r: (
                GENERIC_FUNGAL["temp_min_c"]
                <= float(r.get("temperature_2m") or -99)
                <= GENERIC_FUNGAL["temp_max_c"]
                and float(r.get("relative_humidity_2m") or 0) >= GENERIC_FUNGAL["min_rh_pct"]
                and _wet_hour(r)
            ),
        )

        if include_generic and generic_hours >= GENERIC_FUNGAL["min_risky_hours"]:
            advisories.append(_adv(
                date=date,
                type_="fungal_disease_weather",
                severity="watch",
                title="Weather favourable for fungal disease",
                message=f"Humid/wet conditions persist for about {generic_hours} consecutive forecast hours.",
                action="Increase scouting for leaf spots, blights, mildews and wilts; avoid unnecessary leaf wetness.",
                source="ICAR Rabi/Kharif qualitative disease-weather guidance + extension disease references",
                evidence="prototype",
                crop=crop_key or None,
            ))

        if crop_key == "potato":
            rule = CROP_RULES["potato"]["late_blight"]
            hours = _count_consecutive_risky_hours(
                rows,
                lambda r: (
                    rule["temp_min_c"] <= float(r.get("temperature_2m") or -99) <= rule["temp_max_c"]
                    and float(r.get("relative_humidity_2m") or 0) > rule["min_rh_pct"]
                    and _wet_hour(r)
                ),
            )
            if hours >= rule["min_risky_hours"]:
                advisories.append(_adv(
                    date=date,
                    type_="potato_late_blight_risk",
                    severity="warning",
                    title="High potato late-blight weather risk",
                    message=f"Temperature 10–20°C, RH above 90% and wet/cloudy conditions persist for ~{hours} hours.",
                    action="Inspect the crop closely and follow the current PAU-recommended late-blight protection schedule if needed.",
                    source=SOURCE_PAU_LATE_BLIGHT,
                    evidence="direct",
                    crop="potato",
                ))

        elif crop_key == "tomato":
            early = CROP_RULES["tomato"]["early_blight"]
            hours = _count_consecutive_risky_hours(
                rows,
                lambda r: (
                    early["temp_min_c"] <= float(r.get("temperature_2m") or -99) <= early["temp_max_c"]
                    and float(r.get("relative_humidity_2m") or 0) >= early["min_rh_pct"]
                    and _wet_hour(r)
                ),
            )
            if hours >= early["min_risky_hours"]:
                advisories.append(_adv(
                    date=date,
                    type_="tomato_early_blight_risk",
                    severity="alert",
                    title="Tomato early-blight weather risk",
                    message=f"Warm, humid and wet conditions favourable to early blight persist for ~{hours} hours.",
                    action="Scout lower leaves for early-blight symptoms and minimize prolonged leaf wetness.",
                    source=SOURCE_TNAU_TOMATO,
                    evidence="derived",
                    crop="tomato",
                ))

            if crop_stage and crop_stage.lower() in {"nursery", "seedling", "seedlings"}:
                damping = CROP_RULES["tomato"]["damping_off"]
                damp_hours = _count_consecutive_risky_hours(
                    rows,
                    lambda r: (
                        float(r.get("temperature_2m") or 99) < damping["temp_max_c"]
                        and float(r.get("relative_humidity_2m") or 0) >= damping["min_rh_pct"]
                        and _wet_hour(r)
                    ),
                )
                if damp_hours >= damping["min_risky_hours"]:
                    advisories.append(_adv(
                        date=date,
                        type_="tomato_damping_off_risk",
                        severity="alert",
                        title="Damping-off weather risk in tomato nursery",
                        message="Cool, humid and wet conditions may favour damping-off in seedlings.",
                        action="Avoid water stagnation, maintain drainage and do not overcrowd seedlings.",
                        source=SOURCE_TNAU_TOMATO,
                        evidence="derived",
                        crop="tomato",
                    ))

        elif crop_key in {"cucumber", "cucurbit", "cucurbits", "bottle gourd", "bitter gourd", "watermelon", "muskmelon"}:
            rule = CROP_RULES["cucurbits"]["downy_mildew"]
            hours = _count_consecutive_risky_hours(
                rows,
                lambda r: (
                    rule["temp_min_c"] <= float(r.get("temperature_2m") or -99) <= rule["temp_max_c"]
                    and float(r.get("relative_humidity_2m") or 0) >= rule["min_rh_pct"]
                    and _wet_hour(r)
                ),
            )
            if hours >= rule["min_risky_hours"]:
                advisories.append(_adv(
                    date=date,
                    type_="cucurbit_downy_mildew_risk",
                    severity="alert",
                    title="Cucurbit downy-mildew weather risk",
                    message="Moderate temperature, high humidity and wet/rainy conditions are forecast.",
                    action="Scout foliage, avoid overhead irrigation and improve canopy aeration where possible.",
                    source="Punjab Agricultural University cucurbit downy-mildew advisory (2026)",
                    evidence="derived",
                    crop=crop_key,
                ))

        elif crop_key == "tea":
            rule = CROP_RULES["tea"]
            hours = _count_consecutive_risky_hours(
                rows,
                lambda r: (
                    rule["temp_min_c"] <= float(r.get("temperature_2m") or -99) <= rule["temp_max_c"]
                    and float(r.get("relative_humidity_2m") or 0) >= rule["humidity_min_pct"]
                    and _wet_hour(r)
                ),
            )
            if hours >= rule["risky_hours"]:
                advisories.append(_adv(
                    date=date,
                    type_="tea_humid_wet_weather_risk",
                    severity="watch",
                    title="Tea: persistent humid and wet weather",
                    message=f"Warm, humid and wet conditions persist for about {hours} consecutive forecast hours.",
                    action="Increase field scouting and maintain canopy/drainage management; follow local tea plant-protection advisories if symptoms appear.",
                    source=SOURCE_TEA_BOARD,
                    evidence="prototype",
                    crop="tea",
                ))

    return advisories


def evaluate_crop_operation_rules(
    daily: List[Dict[str, Any]],
    crop: Optional[str],
    crop_stage: Optional[str] = None,
) -> List[Dict[str, Any]]:
    crop_key = (crop or "").strip().lower()
    if not crop_key:
        return []

    advisories: List[Dict[str, Any]] = []

    for day in daily:
        date = day["date"]
        rain = float(day.get("precipitation_mm") or 0)
        rain_prob = float(day.get("precipitation_probability_max_pct") or 0)
        tmax = day.get("temperature_max_c")
        tmin = day.get("temperature_min_c")
        gust = float(day.get("wind_gust_max_kmh") or 0)

        if crop_key == "potato" and tmax is not None and tmin is not None:
            if float(tmax) >= CROP_RULES["potato"]["day_temp_max_c"] or float(tmin) > CROP_RULES["potato"]["night_temp_max_c"]:
                advisories.append(_adv(
                    date=date,
                    type_="potato_temperature_stress",
                    severity="watch",
                    title="Potato temperature outside preferred range",
                    message=f"Forecast max/min temperature is {float(tmax):.1f}/{float(tmin):.1f}°C.",
                    action="Monitor crop stress and irrigation needs; tuberization is favoured by cooler day/night temperatures.",
                    source=SOURCE_ICAR_RABI,
                    evidence="direct",
                    crop="potato",
                ))

        if crop_key == "onion" and tmax is not None:
            if float(tmax) > CROP_RULES["onion"]["bulb_temp_max_c"]:
                advisories.append(_adv(
                    date=date,
                    type_="onion_heat_stress",
                    severity="watch",
                    title="Warm conditions for onion",
                    message=f"Maximum temperature of {float(tmax):.1f}°C is above the preferred bulb-development range cited by ICAR.",
                    action="Monitor crop moisture and heat stress, especially during bulb development.",
                    source=SOURCE_ICAR_RABI,
                    evidence="direct",
                    crop="onion",
                ))

        if crop_key in FROST_SENSITIVE_CROPS and tmin is not None and float(tmin) <= 4:
            advisories.append(_adv(
                date=date,
                type_="frost_protection",
                severity="alert",
                title="Frost-protection conditions",
                message=f"Minimum temperature may fall to {float(tmin):.1f}°C.",
                action="For frost-sensitive crops, consider light protective irrigation where agronomically appropriate.",
                source=SOURCE_ICAR_RABI,
                evidence="derived",
                crop=crop_key,
            ))

        if crop_key in {"maize", "tomato", "brinjal", "chilli", "vegetables", "ginger", "turmeric"} and rain >= 64.5:
            advisories.append(_adv(
                date=date,
                type_="waterlogging_risk",
                severity="alert",
                title="Waterlogging and drainage risk",
                message="Heavy rainfall can increase water stagnation and root-zone disease risk.",
                action="Keep drainage channels open; use/maintain raised beds or ridge-furrow drainage where applicable.",
                source=SOURCE_ICAR_KHARIF,
                evidence="derived",
                crop=crop_key,
            ))

        if crop_key == "banana" and gust >= 40:
            advisories.append(_adv(
                date=date,
                type_="banana_lodging_risk",
                severity="alert",
                title="Banana lodging risk from wind",
                message=f"Strong gusts near {gust:.0f} km/h may increase lodging risk.",
                action="Check propping/support of banana plants and drainage before the event.",
                source=SOURCE_ICAR_KHARIF,
                evidence="derived",
                crop="banana",
            ))

        if crop_key == "apple":
            rule = CROP_RULES["apple"]
            if rain >= rule["waterlogging_rain_mm"]:
                advisories.append(_adv(
                    date=date,
                    type_="apple_waterlogging_risk",
                    severity="alert",
                    title="Apple orchard waterlogging risk",
                    message=f"Forecast rainfall is {rain:.1f} mm; apple does not tolerate prolonged wet field conditions.",
                    action="Ensure orchard drainage is clear and monitor low-lying areas for water stagnation.",
                    source=SOURCE_ICAR_APPLE,
                    evidence="direct",
                    crop="apple",
                ))
            if gust >= rule["wind_gust_risk_kmh"]:
                advisories.append(_adv(
                    date=date,
                    type_="apple_wind_risk",
                    severity="watch",
                    title="Apple orchard wind risk",
                    message=f"Forecast gusts may reach about {gust:.0f} km/h.",
                    action="Inspect orchard supports and exposed branches; avoid unnecessary field operations during strong winds.",
                    source=SOURCE_ICAR_APPLE,
                    evidence="prototype",
                    crop="apple",
                ))

        if crop_key == "sugarcane":
            rule = CROP_RULES["sugarcane"]
            if rain >= rule["waterlogging_rain_mm"]:
                advisories.append(_adv(
                    date=date,
                    type_="sugarcane_waterlogging_risk",
                    severity="alert",
                    title="Sugarcane waterlogging risk",
                    message=f"Heavy rainfall of about {rain:.1f} mm is forecast.",
                    action="Maintain field drainage and monitor for water stagnation, especially in poorly drained fields.",
                    source=SOURCE_ICAR_SUGARCANE,
                    evidence="direct",
                    crop="sugarcane",
                ))

        if crop_key == "cashew":
            rule = CROP_RULES["cashew"]
            if rain >= rule["waterlogging_rain_mm"]:
                advisories.append(_adv(
                    date=date,
                    type_="cashew_waterlogging_risk",
                    severity="alert",
                    title="Cashew water-stagnation risk",
                    message=f"Heavy rainfall of about {rain:.1f} mm is forecast; cashew is sensitive to water stagnation.",
                    action="Maintain drainage around cashew trees and prevent prolonged water stagnation.",
                    source=SOURCE_ICAR_CASHEW,
                    evidence="direct",
                    crop="cashew",
                ))
            if gust >= rule["wind_gust_risk_kmh"]:
                advisories.append(_adv(
                    date=date,
                    type_="cashew_wind_risk",
                    severity="watch",
                    title="Cashew wind risk",
                    message=f"Forecast gusts may reach about {gust:.0f} km/h.",
                    action="Inspect young plants and supports and avoid unnecessary field work during strong winds.",
                    source=SOURCE_ICAR_CASHEW,
                    evidence="derived",
                    crop="cashew",
                ))

    # Multi-day dry-spell rules are evaluated after the daily loop.
    if crop_key in {"apple", "sugarcane"}:
        rule = CROP_RULES[crop_key]
        streak = []
        for day in daily:
            rain = float(day.get("precipitation_mm") or 0)
            et0 = float(day.get("et0_mm") or 0)
            if rain <= rule["dry_spell_rain_mm"] and et0 >= rule["dry_spell_et0_mm"]:
                streak.append(day)
            else:
                streak = []
            if len(streak) >= rule["dry_spell_days"]:
                start = streak[0]["date"]
                end = streak[-1]["date"]
                advisories.append(_adv(
                    date=end,
                    type_=f"{crop_key}_dry_spell",
                    severity="watch",
                    title=f"{crop_key.title()} dry-spell and irrigation review",
                    message=f"Low rainfall with elevated reference evapotranspiration persists from {start} to {end}.",
                    action="Review soil moisture and irrigation need; do not irrigate solely from the calendar.",
                    source=SOURCE_ICAR_APPLE if crop_key == "apple" else SOURCE_ICAR_SUGARCANE,
                    evidence="derived",
                    crop=crop_key,
                ))
                streak = []

    return advisories


def evaluate_generic_crop_operation_rules(
    daily: List[Dict[str, Any]],
    crop: Optional[str],
) -> List[Dict[str, Any]]:
    """Generic crop-operation rules used only for unsupported crops."""
    crop_key = normalize_crop_name(crop)
    advisories = []

    for day in daily:
        date = day["date"]
        rain = float(day.get("precipitation_mm") or 0)
        rain_prob = float(day.get("precipitation_probability_max_pct") or 0)
        if rain_prob > 75 or rain >= 15.6:
            advisories.append(_adv(
                date=date,
                type_="irrigation_review",
                severity="watch",
                title="Review planned irrigation",
                message=f"Rainfall is {probability_label(rain_prob)} ({rain_prob:.0f}% max probability) with {rain:.1f} mm forecast.",
                action="Check field moisture and rainfall timing before irrigating; avoid unnecessary irrigation.",
                source=SOURCE_ICAR_RABI,
                evidence="derived",
                crop=crop_key or None,
            ))

    return advisories


def evaluate_generic_fallback_rules(
    daily: List[Dict[str, Any]],
    hourly: List[Dict[str, Any]],
    crop: Optional[str],
) -> List[Dict[str, Any]]:
    """Fallback layer for crops without dedicated crop-specific rules."""
    crop_key = normalize_crop_name(crop)
    advisories = []
    advisories.extend(evaluate_general_daily_rules(daily))
    advisories.extend(evaluate_generic_crop_operation_rules(daily, crop_key))
    advisories.extend(evaluate_disease_weather_rules(hourly, crop_key, include_generic=True))
    return advisories


def _spray_hour_ok(row: Dict[str, Any], future_rows: List[Dict[str, Any]]) -> tuple[bool, str]:
    temp = float(row.get("temperature_2m") or 99)
    rh = float(row.get("relative_humidity_2m") or 0)
    wind = float(row.get("wind_speed_10m") or 99)
    gust = float(row.get("wind_gusts_10m") or 99)
    prob = float(row.get("precipitation_probability") or 0)
    precipitation = float(row.get("precipitation") or 0)
    code = row.get("weather_code")

    no_future_rain = all(
        float(x.get("precipitation") or 0) <= 0.05
        and float(x.get("precipitation_probability") or 0) < 40
        for x in future_rows
    )

    good = (
        SPRAY["ideal_wind_min_kmh"] <= wind <= SPRAY["ideal_wind_max_kmh"]
        and gust <= SPRAY["max_gust_kmh"]
        and temp <= SPRAY["max_temp_c"]
        and rh >= SPRAY["min_rh_pct"]
        and prob <= SPRAY["max_precip_probability_pct"]
        and precipitation <= 0.05
        and code not in THUNDERSTORM_CODES
        and no_future_rain
    )

    if good:
        return True, "good"

    acceptable = (
        2.0 < wind <= SPRAY["absolute_wind_max_kmh"]
        and gust <= 25
        and temp <= 30
        and rh >= 45
        and prob < 40
        and precipitation <= 0.05
        and code not in THUNDERSTORM_CODES
        and no_future_rain
    )
    return acceptable, "acceptable" if acceptable else "poor"


def find_spray_windows(hourly: List[Dict[str, Any]], max_hours: int = 48) -> List[Dict[str, Any]]:
    """Find practical spray windows. This is prototype decision support, not a pesticide label."""

    rows = hourly[:max_hours]
    marked: List[tuple[Dict[str, Any], str]] = []

    for i, row in enumerate(rows):
        dt = datetime.fromisoformat(row["time"])
        if not (SPRAY["day_start_hour"] <= dt.hour <= SPRAY["day_end_hour"]):
            continue
        future = rows[i : i + SPRAY["rain_free_hours"]]
        if len(future) < min(3, SPRAY["rain_free_hours"]):
            continue
        ok, score = _spray_hour_ok(row, future)
        if ok:
            marked.append((row, score))

    windows: List[Dict[str, Any]] = []
    if not marked:
        return windows

    start_row, current_score = marked[0]
    last_row = start_row

    def flush(start: Dict[str, Any], end: Dict[str, Any], score: str) -> None:
        start_dt = datetime.fromisoformat(start["time"])
        end_dt = datetime.fromisoformat(end["time"]) + timedelta(hours=1)
        # Require at least two contiguous hours.
        if (end_dt - start_dt).total_seconds() < 2 * 3600:
            return
        windows.append({
            "start": start_dt.isoformat(timespec="minutes"),
            "end": end_dt.isoformat(timespec="minutes"),
            "score": score,
            "reason": "Low rain risk, manageable wind/gusts, and acceptable temperature/humidity for reduced spray drift.",
        })

    for row, score in marked[1:]:
        last_dt = datetime.fromisoformat(last_row["time"])
        this_dt = datetime.fromisoformat(row["time"])
        contiguous = this_dt - last_dt == timedelta(hours=1)
        if contiguous and score == current_score:
            last_row = row
        else:
            flush(start_row, last_row, current_score)
            start_row, last_row, current_score = row, row, score

    flush(start_row, last_row, current_score)
    return windows[:6]


def deduplicate_advisories(advisories: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    seen = set()
    result = []
    severity_rank = {"warning": 0, "alert": 1, "watch": 2}
    for item in sorted(advisories, key=lambda x: (x["date"], severity_rank.get(x["severity"], 9), x["type"])):
        key = (item["date"], item["type"], item.get("crop"))
        if key not in seen:
            seen.add(key)
            result.append(item)
    return result
