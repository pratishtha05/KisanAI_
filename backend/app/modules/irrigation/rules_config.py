"""
KisanAI Irrigation Rules

Rules are based primarily on:
- Punjab Agricultural University (PAU) Package of Practices - Rabi
- Punjab Agricultural University (PAU) Package of Practices - Kharif
- ICAR Kharif Agro-Advisories 2025

Important:
This file contains agricultural rules/configuration only.
Decision logic is implemented in rule_engine.py.
"""

# ---------------------------------------------------------------------
# Crop aliases
# ---------------------------------------------------------------------

CROP_ALIASES = {
    "maize": "maize",
    "corn": "maize",
    "rice": "rice",
    "paddy": "rice",
    "wheat": "wheat",
    "potato": "potato",
    "sugarcane": "sugarcane",
    "tomato": "tomato",
    "cassava": "cassava",
    "tapioca": "cassava",
    "apple": "apple",
    "tea": "tea",
}


# ---------------------------------------------------------------------
# Wheat
# PAU Package of Practices - Rabi
#
# First irrigation:
#   October-sown       -> about 3 weeks
#   Later-sown         -> about 4 weeks
#
# Subsequent:
#   Sowing <= Nov 21   -> 5-6, 5-6, 4 weeks
#   Nov 22-Dec 20      -> 5-6, 3-4, 2 weeks
#   Dec 21-Jan 15      -> 4, 3, 2 weeks
#
# Light soil:
#   advance first irrigation
#
# Heavy paddy soil:
#   delay first irrigation by 1 week
#
# Rain:
#   +5 days per cm until end of January
#   +2 days per cm afterwards
# ---------------------------------------------------------------------

WHEAT_RULES = {
    "crop": "wheat",

    "critical_stages": {
        "crown root initiation",
        "cri",
        "heading",
        "flowering",
        "heading/flowering",
        "grain filling",
        "grain fill",
    },

    "important_stages": {
        "tillering",
        "jointing",
        "booting",
        "jointing/booting",
    },

    "first_irrigation": {
        "october_sown_days": 21,
        "later_sown_days": 28,

        # PAU explicitly says heavy paddy soil -> delay by one week.
        "heavy_paddy_delay_days": 7,

        # PAU says light soil should be advanced and allows
        # the indicated interval to vary by 2-3 days.
        # We use 2 days as the implementation value.
        "light_soil_advance_days": 2,
    },

    "subsequent_intervals_days": {
        "up_to_nov_21": [
            (35, 42),   # second irrigation
            (35, 42),   # third irrigation
            (28, 28),   # fourth irrigation
        ],
        "nov_22_to_dec_20": [
            (35, 42),
            (21, 28),
            (14, 14),
        ],
        "dec_21_to_jan_15": [
            (28, 28),
            (21, 21),
            (14, 14),
        ],
    },

    "rain_adjustment": {
        "before_february_days_per_cm": 5,
        "after_january_days_per_cm": 2,
    },

    "wind_rule": {
        "avoid_irrigation_if_windy": True,
    },

    "irrigation_end": {
        "timely_sown_month": 3,
        "late_sown_cutoff": "04-10",
    },
}


# ---------------------------------------------------------------------
# Rice
#
# Two distinct systems:
#
# 1. Transplanted rice
#    - First 2 weeks: ponded water for establishment
#    - Afterwards: irrigate 2 days after ponded water infiltrates
#    - Avoid water stress at flowering
#    - Stop about 14 days before harvest/maturity
#
# 2. Direct seeded rice (DSR)
#    Tar-wattar:
#       first irrigation ~21 DAS
#       then 5-7 day interval
#
#    Dry field:
#       first irrigation immediately after sowing
#       second irrigation 4-5 DAS
#       then 5-7 day interval
#       stop 10 days before harvest
# ---------------------------------------------------------------------

RICE_RULES = {
    "crop": "rice",

    "critical_stages": {
        "flowering",
        "panicle initiation",
        "panicle initiation/flowering",
        "grain filling",
    },

    "important_stages": {
        "transplanting",
        "establishment",
        "tillering",
        "booting",
    },

    "transplanted": {
        "ponded_days_after_transplanting": 14,
        "post_ponding_infiltration_days": 2,
        "stop_before_harvest_days": 14,
    },

    "dsr": {
        "tar_wattar": {
            "first_irrigation_days": 21,
            "interval_days": (5, 7),
        },
        "dry_field": {
            "first_irrigation_days": 0,
            "second_irrigation_days": 4,
            "interval_days": (5, 7),
        },
        "stop_before_harvest_days": 10,
    },
}


# ---------------------------------------------------------------------
# Maize
#
# PAU:
#   Generally 4-6 irrigations depending on rainfall.
#   Adequate water throughout crop season.
#   Especially important:
#       pre-tasselling
#       silking
#       grain filling
#
# Excess water/flooding is harmful, particularly at young stage.
#
# There is intentionally NO invented "every X days" rule here.
# ---------------------------------------------------------------------

MAIZE_RULES = {
    "crop": "maize",

    "total_irrigations": {
        "minimum": 4,
        "maximum": 6,
    },

    "critical_stages": {
        "pre-tasselling",
        "pre tasselling",
        "silking",
        "grain filling",
        "grain fill",
    },

    "important_stages": {
        "vegetative",
        "knee high",
        "tasselling",
        "tasseling",
    },

    "drainage": {
        "waterlogging_is_harmful": True,
        "young_stage_is_sensitive": True,
    },
}


# ---------------------------------------------------------------------
# Potato
#
# Source-backed implementation:
#   - regular irrigation approximately every 7-10 days
#   - critical:
#       stolon formation
#       tuber initiation
#       tuber development/bulking
#   - stop approximately 10-15 days before harvest
# ---------------------------------------------------------------------

POTATO_RULES = {
    "crop": "potato",

    "interval_days": (7, 10),

    "critical_stages": {
        "stolon formation",
        "stolonization",
        "tuber initiation",
        "tuber development",
        "tuber bulking",
        "bulking",
    },

    "important_stages": {
        "establishment",
        "vegetative",
        "earthing up",
    },

    "stop_before_harvest_days": (10, 15),

    "waterlogging_is_harmful": True,
}


# ---------------------------------------------------------------------
# Sugarcane
#
# PAU:
#   April-June:
#       7-12 days
#
#   Rainy season:
#       adjust according to rainfall
#
#   November-January:
#       approximately monthly
#
#   Waterlogging:
#       drain excess water
# ---------------------------------------------------------------------

SUGARCANE_RULES = {
    "crop": "sugarcane",

    "critical_stages": {
        "tillering",
        "grand growth",
        "grand growth period",
        "active growth",
    },

    "seasonal_intervals": {
        "april_june": (7, 12),
        "november_january": (30, 30),
    },

    "rainy_season": {
        "rainfall_dependent": True,
    },

    "waterlogging_is_harmful": True,

    "frost_protection": {
        "mid_december": True,
        "early_january": True,
    },
}


# ---------------------------------------------------------------------
# Tomato
#
# ICAR:
#   irrigation approximately every 5-7 days based on moisture/weather.
#
# Critical practical stages:
#   transplanting/establishment
#   flowering
#   fruit development
#
# Moisture should remain reasonably uniform.
# ---------------------------------------------------------------------

TOMATO_RULES = {
    "crop": "tomato",

    "interval_days": (5, 7),

    "critical_stages": {
        "flowering",
        "fruit set",
        "fruit setting",
        "fruit development",
        "fruiting",
    },

    "important_stages": {
        "transplanting",
        "establishment",
        "vegetative",
    },

    "harvest_rule": {
        "reduce_irrigation_during_harvesting": True,
    },
}


# ---------------------------------------------------------------------
# Cassava
#
# Source:
#   first irrigation at planting
#   life irrigation on day 3
#   7-10 days until 3 months
#   20-30 days until 8 months
#   avoid excessive irrigation
# ---------------------------------------------------------------------

CASSAVA_RULES = {
    "crop": "cassava",

    "establishment": {
        "planting_day": 0,
        "life_irrigation_day": 3,
    },

    "intervals": {
        "0_to_3_months": (7, 10),
        "3_to_8_months": (20, 30),
    },

    "rainfed_dry_spell_interval": (15, 20),

    "critical_stages": {
        "establishment",
        "root development",
        "root bulking",
        "tuber development",
        "bulking",
    },

    "avoid_excessive_irrigation": True,
}


# ---------------------------------------------------------------------
# Apple
#
# Perennial orchard.
#
# ICAR:
#   apple does not tolerate waterlogging.
#   under prolonged dry weather:
#       2-3 irrigations
#       at fortnightly intervals
#
# Therefore we do NOT pretend apple has a normal fixed
# annual-crop irrigation interval.
# ---------------------------------------------------------------------

APPLE_RULES = {
    "crop": "apple",

    "dry_weather_interval_days": 14,

    "critical_stages": {
        "flowering",
        "fruit set",
        "fruit development",
    },

    "waterlogging_is_harmful": True,

    "prolonged_dry_weather": {
        "irrigations": 3,
        "interval_days": 14,
    },
}


# ---------------------------------------------------------------------
# Tea
#
# Tea is perennial.
#
# Young tea:
#   supplemental/sub-soil irrigation during summer/dry conditions.
#
# Mature tea:
#   no universal fixed interval is imposed by this engine.
#
# This prevents us from inventing a false "tea every X days" rule.
# ---------------------------------------------------------------------

TEA_RULES = {
    "crop": "tea",

    "young_tea_years": 2,

    "young_tea": {
        "summer_irrigation": True,
        "dry_weather_priority": "high",
    },

    "critical_stages": {
        "establishment",
        "young tea",
        "active flush",
        "flush",
    },

    "waterlogging_is_harmful": True,

    "mature_fixed_interval": None,
}


# ---------------------------------------------------------------------
# Master rule registry
# ---------------------------------------------------------------------

IRRIGATION_RULES = {
    "wheat": WHEAT_RULES,
    "rice": RICE_RULES,
    "maize": MAIZE_RULES,
    "potato": POTATO_RULES,
    "sugarcane": SUGARCANE_RULES,
    "tomato": TOMATO_RULES,
    "cassava": CASSAVA_RULES,
    "apple": APPLE_RULES,
    "tea": TEA_RULES,
}