"""Rule constants used by the prototype Weather Intelligence engine.

Evidence levels:
- direct: threshold/action is directly supported by the cited source.
- derived: source gives a qualitative relationship; KisanAI turns it into an operational rule.
- prototype: reasonable engineering threshold for a prototype; not an official agronomic limit.
"""

# IMD rainfall terminology (24-hour accumulated rainfall, mm)
RAINFALL_THRESHOLDS = {
    "very_light": (0.0, 2.4),
    "light": (2.5, 15.5),
    "moderate": (15.6, 64.4),
    "heavy": (64.5, 115.5),
    "very_heavy": (115.6, 204.4),
    "extremely_heavy": (204.5, float("inf")),
}

# IMD probability terminology
PROBABILITY_THRESHOLDS = {
    "unlikely": (0, 24.999),
    "likely": (25, 50),
    "very_likely": (50.001, 75),
    "most_likely": (75.001, 100),
}

# IMD actual-temperature criteria usable without climatological departure data.
HEAT_WAVE_TEMP_C = 45.0
SEVERE_HEAT_WAVE_TEMP_C = 47.0
COLD_WAVE_TEMP_C = 4.0
SEVERE_COLD_WAVE_TEMP_C = 2.0

# Spray suitability prototype thresholds.
# Extension guidance: ideal wind roughly 3-9 mph, avoid >10 mph; high temp (>82F)
# and RH <50% increase drift/evaporation risk.
SPRAY = {
    "ideal_wind_min_kmh": 4.8,
    "ideal_wind_max_kmh": 14.5,
    "absolute_wind_max_kmh": 16.1,
    "max_gust_kmh": 20.0,
    "max_temp_c": 28.0,
    "min_rh_pct": 50.0,
    "max_precip_probability_pct": 30.0,
    "rain_free_hours": 6,
    "day_start_hour": 6,
    "day_end_hour": 18,
}

# General fungal-risk heuristic for prototype use.
GENERIC_FUNGAL = {
    "min_rh_pct": 85.0,
    "temp_min_c": 15.0,
    "temp_max_c": 30.0,
    "min_risky_hours": 6,
    "cloud_cover_pct": 70.0,
}

# Crop-specific weather thresholds.
CROP_RULES = {
    "potato": {
        "day_temp_max_c": 30.0,
        "night_temp_max_c": 20.0,
        "best_day_temp_c": 20.0,
        "best_night_temp_c": 14.0,
        "late_blight": {
            "temp_min_c": 10.0,
            "temp_max_c": 20.0,
            "min_rh_pct": 90.0,
            "min_risky_hours": 6,
        },
    },
    "tomato": {
        "early_blight": {
            "temp_min_c": 24.0,
            "temp_max_c": 29.0,
            "min_rh_pct": 80.0,
            "min_risky_hours": 6,
        },
        "damping_off": {
            "temp_max_c": 24.0,
            "min_rh_pct": 85.0,
            "min_risky_hours": 6,
        },
    },
    "cucurbits": {
        "downy_mildew": {
            "temp_min_c": 25.0,
            "temp_max_c": 30.0,
            "min_rh_pct": 85.0,
            "min_risky_hours": 4,
        }
    },
    "onion": {
        "vegetative_temp_min_c": 13.0,
        "vegetative_temp_max_c": 24.0,
        "bulb_temp_min_c": 16.0,
        "bulb_temp_max_c": 25.0,
        "preferred_rh_pct": 70.0,
    },
    # Added crop-specific prototype rules.
    # These deliberately remain conservative and are labelled derived/prototype in the engine.
    "apple": {
        "waterlogging_rain_mm": 64.5,
        "dry_spell_days": 3,
        "dry_spell_rain_mm": 2.0,
        "dry_spell_et0_mm": 4.0,
        "wind_gust_risk_kmh": 40.0,
    },
    "sugarcane": {
        "waterlogging_rain_mm": 64.5,
        "dry_spell_days": 3,
        "dry_spell_rain_mm": 2.0,
        "dry_spell_et0_mm": 4.0,
    },
    "tea": {
        "humidity_min_pct": 85.0,
        "temp_min_c": 18.0,
        "temp_max_c": 30.0,
        "risky_hours": 6,
        "heat_stress_temp_c": 35.0,
    },
    "cashew": {
        "waterlogging_rain_mm": 64.5,
        "wind_gust_risk_kmh": 40.0,
    },
}

# Crop names for which KisanAI has dedicated crop-specific rules.
SUPPORTED_CROPS = {
    "potato", "tomato", "cucurbits", "onion", "maize", "brinjal", "chilli",
    "vegetables", "ginger", "turmeric", "banana", "apple", "sugarcane", "tea", "cashew",
}


FROST_SENSITIVE_CROPS = {
    "potato",
    "tomato",
    "chilli",
    "pepper",
    "mustard",
    "coriander",
    "fennel",
    "vegetables",
}

# WMO/Open-Meteo codes relevant to field operations.
FOG_CODES = {45, 48}
THUNDERSTORM_CODES = {95, 96, 99}
RAIN_CODES = {51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82}
