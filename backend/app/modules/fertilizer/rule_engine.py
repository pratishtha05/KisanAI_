"""
KisanAI consolidated fertilizer rule engine
===========================================

This module combines:
1. PAU rule data supplied in fertilizer_rules.py (soil-test classes, Table 1,
   Table 2, nutrient conversions, micronutrients, LCC, variety groups,
   organic credits, general doses and rice disease/N cautions).
2. The working KisanAI FarmData/SoilData interface and response contract.
3. Additional stage-based guidance for apple, cassava, potato, tea and tomato.

Public interface:
    result = FertilizerRuleEngine(farm_data).evaluate()

Frontend option helpers:
    get_crop_options()
    get_variety_options(crop)
    get_stage_options(crop)

Rates:
- PAU rates are per acre unless explicitly stated otherwise.
- ICAR-CTCRI, KAU and TNAU rates are per hectare.
- Nutrient quantities and fertilizer-product quantities are returned
  separately. Never interpret urea/DAP/SSP/MOP product kg as nutrient kg.
- Recommendations are conditional on the cited crop system and source region.
- Missing optional soil values, history or dates do not block a baseline.
- Exact date-driven split decisions are not fabricated when sowing_date is
  absent. Stage-based advice is still returned.

The module intentionally does not add unsupported crops from the PAU tables
(e.g. barley, cotton, toria) to KisanAI's nine-crop dropdown.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any, Optional
import re


# ===========================================================================
# SOURCE METADATA
# ===========================================================================

PAU_SOURCE = {
    "institution": "Punjab Agricultural University, Ludhiana",
    "publication": "Package of Practices for Kharif Crops of Punjab and Package of Practices for Rabi Crops of Punjab",
    "region": "Punjab, India",
    "note": "Page references below are PDF page numbers from the supplied publications.",
}
ICAR_CASSAVA_SOURCE = {
    "institution": "ICAR-Central Tuber Crops Research Institute",
    "publication": "Cassava production recommendations",
    "region": "India; verify local/state applicability",
}
ICAR_APPLE_SOURCE = {
    "institution": "Indian Council of Agricultural Research",
    "publication": "Rabi agro-advisory for apple",
    "region": "India; mature-tree example, verify local applicability",
}
KAU_TEA_SOURCE = {
    "institution": "Kerala Agricultural University",
    "publication": "Package of Practices recommendations for tea",
    "region": "Kerala; pH- and age-specific, not a Punjab prescription",
}
TNAU_TOMATO_SOURCE = {
    "institution": "Tamil Nadu Agricultural University",
    "publication": "Tomato crop production recommendations",
    "region": "Tamil Nadu; verify local/state applicability",
}


# ===========================================================================
# CROP / VARIETY / STAGE OPTIONS
# ===========================================================================

CROP_OPTIONS = [
    {"value": "apple", "label": "Apple"},
    {"value": "cassava", "label": "Cassava"},
    {"value": "maize", "label": "Maize"},
    {"value": "potato", "label": "Potato"},
    {"value": "rice", "label": "Rice"},
    {"value": "sugarcane", "label": "Sugarcane"},
    {"value": "tea", "label": "Tea"},
    {"value": "tomato", "label": "Tomato"},
    {"value": "wheat", "label": "Wheat"},
]

CROP_ALIASES = {
    "wheat": "wheat", "rice": "rice", "paddy": "rice",
    "maize": "maize", "corn": "maize", "corn/maize": "maize",
    "sugarcane": "sugarcane", "apple": "apple", "cassava": "cassava",
    "potato": "potato", "tea": "tea", "tomato": "tomato",
}

# Variety groups copied from the supplied PAU rule data.
VARIETIES = {
    "rice": {
        "pr132": ["pr 132", "pr132"],
        "pr126": ["pr 126", "pr126"],
        "csr30": ["csr 30", "csr30"],
        "basmati_36": [
            "punjab basmati 7", "punjab basmati 5", "pusa basmati 1121",
            "pusa basmati 1718", "pb 7", "pb 5", "pb7", "pb5",
            "pusa 1121", "pusa 1718", "pb 1121",
        ],
        "basmati_54": [
            "pusa basmati 1847", "pusa basmati 1509", "pusa 1847", "pusa 1509",
        ],
    },
    "maize": {
        "group_a": [
            "pmh 1", "pmh 11", "pmh 13", "pmh 14", "pmh 17",
            "nk 7328", "dkc 9144", "bioseed 9788", "adv 9293",
            "jc 12", "punjab sweet corn 1",
        ],
        "group_b": ["pmh 2", "jc 4", "pearl popcorn"],
    },
    "apple": {"general": ["general / not specified"]},
    "cassava": {
        "high_yielding": ["high-yielding type"],
        "local_m4": ["local / M-4 type"],
        "general": ["general / not specified"],
    },
    "potato": {"general": ["general / not specified"]},
    "sugarcane": {"general": ["general / not specified"]},
    "tea": {"general": ["general / not specified"]},
    "tomato": {
        "general": ["general / not specified"],
        "hybrid": ["hybrid"],
    },
    "wheat": {"general": ["general / not specified"]},
}

STAGE_OPTIONS = {
    "apple": ["Dormant / winter", "Before flowering", "Fruit set", "Fruit development", "After harvest"],
    "cassava": ["Land preparation", "Planting", "Establishment", "45-60 days after planting", "Root bulking", "Maturity"],
    "maize": ["Land preparation", "Sowing", "Early growth", "Knee-high", "Tasseling / flowering", "Grain filling", "Maturity"],
    "potato": ["Land preparation", "Planting", "Emergence", "Earthing-up", "Tuber development", "Maturity"],
    "rice": ["Nursery", "Transplanting", "Direct seeding", "Early tillering", "Active tillering", "Panicle initiation", "Flowering", "Grain filling", "Maturity"],
    "sugarcane": ["Land preparation", "Planting", "Germination", "Early tillering", "Grand growth", "Maturity", "Ratoon establishment"],
    "tea": ["Young plant - year 1", "Young plant - year 2", "Young plant - year 3", "Young plant - year 4+", "Mature / pruned bush"],
    "tomato": ["Nursery", "Transplanting", "Establishment", "30 days after planting", "Flowering", "Fruit set", "Harvesting"],
    "wheat": ["Land preparation", "Sowing", "Crown root initiation", "Tillering", "Jointing", "Booting", "Flowering", "Grain filling", "Maturity"],
}


def _norm(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip().lower())


def get_crop_options():
    return [dict(x) for x in CROP_OPTIONS]


def get_variety_options(crop: str):
    c = CROP_ALIASES.get(_norm(crop), _norm(crop))
    result = []
    for group, names in VARIETIES.get(c, {}).items():
        if c in {"rice", "maize"}:
            label = {
                "pr132": "PR 132", "pr126": "PR 126", "csr30": "CSR 30",
                "basmati_36": "Basmati - 36 kg N group",
                "basmati_54": "Basmati - 54 kg N group",
                "group_a": "PAU maize Group A", "group_b": "PAU maize Group B",
            }.get(group, group.replace("_", " ").title())
        else:
            label = {
                "high_yielding": "High-yielding type",
                "local_m4": "Local / M-4 type",
                "general": "General / not specified",
                "hybrid": "Hybrid",
            }.get(group, group.title())
        result.append({"value": group, "label": label})
    return result


def get_stage_options(crop: str):
    c = CROP_ALIASES.get(_norm(crop), _norm(crop))
    return list(STAGE_OPTIONS.get(c, []))


# ===========================================================================
# INPUT DATA CLASSES - preserves the working module's interface
# ===========================================================================

@dataclass
class SoilData:
    ph: Optional[float] = None
    ec: Optional[float] = None
    organic_carbon_percent: Optional[float] = None
    nitrogen_status: Optional[str] = None
    phosphorus_status: Optional[str] = None
    potassium_status: Optional[str] = None
    sulphur_status: Optional[str] = None
    zinc_status: Optional[str] = None
    iron_status: Optional[str] = None
    boron_status: Optional[str] = None
    laboratory_values: dict = field(default_factory=dict)
    laboratory_units: dict = field(default_factory=dict)
    texture: Optional[str] = None
    soil_type: Optional[str] = None


@dataclass
class FarmData:
    crop: str
    location: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    variety: Optional[str] = None
    season: Optional[str] = None
    stage: Optional[str] = None
    sowing_date: Optional[date] = None
    land_size: Optional[float] = None
    land_unit: str = "acre"
    soil: SoilData = field(default_factory=SoilData)
    previous_crop: Optional[str] = None
    previous_crop_phosphorus_applied: Optional[bool] = None
    fertilizer_history: list = field(default_factory=list)
    manure_history: list = field(default_factory=list)
    irrigation_type: Optional[str] = None
    irrigation_water_quality: Optional[str] = None
    symptoms: list = field(default_factory=list)
    pest_observations: list = field(default_factory=list)
    disease_observations: list = field(default_factory=list)
    disease_prediction: Optional[dict] = None
    pest_prediction: Optional[dict] = None
    weather: dict = field(default_factory=dict)


# ===========================================================================
# PAU DATA - retained from supplied fertilizer_rules.py
# ===========================================================================

UREA_N = 0.46
DAP_N, DAP_P2O5 = 0.18, 0.46
SSP_P2O5 = 0.16
MOP_K2O = 0.60
ZNSO4_HEPTA_ZN, ZNSO4_MONO_ZN = 0.21, 0.33
FYM_NOTE = "Well-rotted FYM: each tonne replaces approximately 4 kg urea, 10 kg SSP and 6 kg MOP at the stated PAU conditions (K p.197)."

SOIL_TEST = {
    "oc_low_below": 0.40, "oc_high_above": 0.75,
    "n_low_adjust": 1.25, "n_high_adjust": 0.75,
    "p_low_below": 5, "p_medium_to": 9, "p_high_to": 20,
    "k_deficient_below": 55, "zn_deficient_below": 0.6,
    "mn_deficient_below": 3.5, "alkali_ph_above": 9.3,
    "saline_ec_above": 0.8, "salt_n_adjust": 1.25,
}

P_TABLE2 = {
    "lt04": {"low": 1.25, "medium": 1.00, "high": 0.75, "very_high": 0.0},
    "04_06": {"low": 1.25, "medium": 0.75, "high": 0.50, "very_high": 0.0},
    "gt06": {"low": 1.25, "medium": 0.50, "high": 0.0, "very_high": 0.0},
}

ZINC = {
    "rice": {"hepta": 25, "mono": 16, "when": "At puddling; if deficiency appears later, apply the same quantity at once."},
    "maize": {"hepta": 10, "mono": 6.5, "when": "At sowing; late-season spray: 1.2 kg zinc sulphate (21%) + 0.6 kg lime in 200 L water per acre."},
}
MANGANESE_WHEAT = (
    "Wheat after rice on sandy soils with soil Mn below 3.5 kg/acre: "
    "spray 0.5% manganese sulphate 2-4 days before first irrigation, "
    "then three more sprays at weekly intervals (R p.116)."
)
IRON_NOTE = (
    "Iron deficiency is noted for rice on coarse soils and sugarcane on alkaline soils. "
    "The PAU reference gives a 1% ferrous sulphate spray, repeated 2-3 times weekly (K p.161); "
    "confirm deficiency and local spray advice before use."
)

RICE_ORGANIC_UREA_SAVING = {
    "fym": 35, "pressmud": 55, "poultry_manure": 55,
    "gobar_gas_slurry": 35, "prali_char": 35,
    "green_manure": 55, "summer_moong_residue": 35,
}

LCC = {
    "rice_transplanted": {"basal_urea": 25, "start_das": 14, "every_days": 7, "shade": 4.0, "dose_urea": 25, "page": "K p.18-19"},
    "basmati": {"basal_urea": 0, "start_das": 21, "every_days": 7, "shade": 4.0, "shade_csr30": 3.5, "dose_urea": 9, "page": "K p.30"},
    "rice_dsr": {"basal_urea": 0, "first_urea_das": 28, "first_urea": 25, "start_das": 42, "every_days": 7, "shade": 4.0, "dose_urea": 30, "page": "K p.35"},
    "maize": {"basal_urea": 25, "start_das": 21, "every_days": 10, "shade": 5.0, "dose_urea": 25, "page": "K p.41"},
    "wheat": {"first_irrigation_urea_timely": 40, "first_irrigation_urea_late": 25, "second_irrigation_table": [(5.0, 15), (4.5, 30), (4.0, 40), (0.0, 55)], "page": "R p.18"},
}

LATE_WHEAT_FROM = (12, 15)

_CROP_ALIASES_PAU = {
    "wheat": "wheat", "rice": "rice", "paddy": "rice",
    "maize": "maize", "corn": "maize", "sugarcane": "sugarcane",
    "barley": "barley", "cotton": "cotton", "toria": "toria",
    "raya": "raya_gobhi_sarson", "gobhi sarson": "raya_gobhi_sarson",
    "mustard": "raya_gobhi_sarson",
}

VARIETY_GROUPS = {
    "rice": {
        "pr132": ["punjab basmati? no", "pr 132", "pr132"],
        "pr126": ["pr 126", "pr126"],
        "csr30": ["csr 30", "csr30"],
        "basmati_36": ["punjab basmati 7", "punjab basmati 5", "pusa basmati 1121", "pusa basmati 1718", "pb 7", "pb 5", "pb7", "pb5", "pusa 1121", "pusa 1718", "pb 1121"],
        "basmati_54": ["pusa basmati 1847", "pusa basmati 1509", "pusa 1847", "pusa 1509"],
    },
    "maize": {
        "group_a": ["pmh 1", "pmh 11", "pmh 13", "pmh 14", "pmh 17", "nk 7328", "dkc 9144", "bioseed 9788", "adv 9293", "jc 12", "punjab sweet corn 1"],
        "group_b": ["pmh 2", "jc 4", "pearl popcorn"],
    },
}

_P_WHEAT = {
    "low": {"ssp": 190, "dap": 65},
    "medium": {"ssp": 155, "dap": 55},
    "high": {"ssp": 125, "dap": 45},
    "very_high": None,
}
_P_LOW_ONLY = {"low": {"ssp": 75, "dap": 27}, "medium": None, "high": None, "very_high": None}

TABLE1 = {
    "wheat": {"urea": {"low": 130, "medium": 110, "high": 90}, "p": _P_WHEAT, "page": "R p.115"},
    "rice": {"urea": {"low": 110, "medium": 90, "high": 70}, "p": _P_LOW_ONLY, "page": "K p.160"},
    "maize": {"urea": {"low": 130, "medium": 110, "high": 90}, "p": _P_WHEAT, "page": "K p.160 / R p.115"},
    "sugarcane": {"urea": {"low": 165, "medium": 130, "high": 100}, "p": _P_LOW_ONLY, "page": "K p.160 (plant crop)"},
}
TABLE1_SUGARCANE_RATOON = {"low": 250, "medium": 195, "high": 150}
DAP_UREA_CREDIT = {"wheat": 0.40, "barley": 0.40, "default": 10 / 27}

GENERAL = {
    "wheat": {"urea": 110, "dap": 55, "ssp": 155, "mop": 0, "mop_if_k_low": 20, "mop_if_k_low_districts": 40, "page": "R p.17"},
    "rice": {"urea": {"pr132": 67.5, "default": 90}, "dap": 27, "ssp": 75, "mop_if_k_low": 20, "page": "K p.18"},
    "basmati": {"urea": {"csr30": 18, "basmati_36": 36, "basmati_54": 54}, "page": "K p.30"},
    "dsr": {"urea": 130, "urea_after_green_manure_or_fym": 90, "urea_after_moong": 110, "page": "K p.34"},
    "dsbr": {"urea": 54, "urea_after_green_manure": 18, "urea_after_moong": 36, "page": "K p.36"},
    "maize": {
        "group_a": {"urea": 110, "dap": 55, "ssp": 150, "mop_if_k_low": 20},
        "group_b": {"urea": 75, "dap": 27, "ssp": 75, "mop_if_k_low": 15},
        "rainfed_moist": {"urea": 70, "dap": 35, "ssp": 100, "mop_if_k_low": 15},
        "rainfed_dry": {"urea": 35, "dap": 18, "ssp": 50, "mop_if_k_low": 8},
        "page": "K p.41, p.45",
    },
    "sugarcane": {
        "plant": {"urea": 130, "ssp_if_p_low": 75, "mop_if_k_low": 50},
        "ratoon": {"urea": 195, "ssp_if_p_low": 75, "mop_if_k_low": 50},
        "after_potato_urea": 100, "page": "K p.90",
    },
}

RICE_DISEASE_N_RULES = {
    "blast": "PAU: blast is worse under heavy nitrogen, especially on basmati. Do not exceed the recommended nitrogen dose (K p.25).",
    "false smut": "PAU: high nitrogen and organic manure increase false smut. Avoid extra nitrogen (K p.25).",
    "bacterial": "PAU: for bacterial blight avoid excess nitrogen and apply no nitrogen beyond six weeks after transplanting unless guided by LCC (K p.26).",
    "sheath rot": "PAU: avoid heavy nitrogen doses with sheath rot (K p.26).",
    "stem rot": "PAU: use only recommended nitrogen and avoid excess irrigation with stem rot (K p.26).",
    "bunt": "PAU: avoid heavy nitrogen doses with kernel smut (K p.26).",
    "smut": "PAU: avoid heavy nitrogen doses with kernel/false smut (K p.25-26).",
}
GENERIC_N_DISEASE_NOTE = (
    "PAU: excessive nitrogen encourages insect pests and diseases. "
    "Take LCC readings only from leaves free of pest or disease damage (K p.9, p.30, p.41)."
)


# ===========================================================================
# ADDITIONAL CROP RULES (external sources; clearly labelled)
# ===========================================================================

# Cassava: ICAR-CTCRI kg nutrient/ha. Long-duration/high-yielding and local
# schedules are alternatives, not cumulative recommendations.
CASSAVA_RATES = {
    "high_yielding": {"N": 100, "P2O5": 50, "K2O": 100},
    "local_m4": {"N": 50, "P2O5": 25, "K2O": 50},
    "general": {"N": 50, "P2O5": 25, "K2O": 50},
}

# Potato: PAU product options converted to nutrient quantities per acre.
# The urea+SSP option is selected as default; alternative is included.
POTATO_PRODUCT_OPTIONS = {
    "urea_ssp": {"urea_kg": 165, "ssp_kg": 155, "mop_kg": 0},
    "urea_dap_mop": {"urea_kg": 142, "dap_kg": 55, "mop_kg": 40},
}

# Tomato: TNAU standard field schedule and separate hybrid schedule.
TOMATO_RATES = {
    "general": {"N": 150, "P2O5": 100, "K2O": 50},
    "hybrid": {"N": 200, "P2O5": 250, "K2O": 250},
}

# Tea: KAU schedule for young tea on soils with pH < 4.5, kg nutrient/ha.
TEA_YOUNG_ACIDIC = {
    "year_1": {"N": 180, "P2O5": 90, "K2O": 270, "MgO": 30},
    "year_2": {"N": 240, "P2O5": 90, "K2O": 360, "MgO": 40},
    "year_3": {"N": 300, "P2O5": 90, "K2O": 450, "MgO": 50},
    "year_4_plus": {"N": 300, "P2O5": 90, "K2O": 300, "MgO": 50},
}

# Mature apple (>10 years) example from ICAR advisory. Product kg/tree,
# not a per-acre or nutrient-rate prescription.
APPLE_MATURE_PRODUCTS = {
    "FYM_kg_per_tree": 100,
    "urea_kg_per_tree": 1.5,
    "SSP_kg_per_tree": 2.0,
    "MOP_kg_per_tree": 1.7,
}


# ===========================================================================
# ENGINE
# ===========================================================================
class FertilizerRuleEngine:
    def __init__(self, farm: FarmData):
        self.farm = farm
        crop_text = _norm(farm.crop)
        self.crop = CROP_ALIASES.get(crop_text)
        if not self.crop:
            raise ValueError(f"Unsupported crop: {farm.crop}. Supported: {', '.join(x['value'] for x in CROP_OPTIONS)}")
        self.warnings = []
        self.advisories = []
        self.missing_information = []
        self.matched_rules = []
        self.soil_classes = {}

    @staticmethod
    def _valid_status(value):
        if value is None:
            return None
        value = _norm(value).replace("_", " ")
        aliases = {"very low": "low", "very high": "very high", "adequate": "medium", "sufficient": "medium", "deficient": "low", "excess": "very high"}
        value = aliases.get(value, value)
        return value if value in {"low", "medium", "high", "very high", "unknown"} else None

    def _soil(self):
        soil = self.farm.soil or SoilData()
        if not isinstance(soil, SoilData):
            soil = SoilData(**soil)
        return soil

    def _check_input_quality(self):
        f, soil = self.farm, self._soil()
        if not f.stage:
            self.missing_information.append("Crop growth stage (recommended for timing advice)")
        if not f.variety and self.crop in {"rice", "maize", "cassava", "tomato"}:
            self.missing_information.append("Crop variety/type (optional; improves rule matching)")
        if not f.state:
            self.missing_information.append("Farm state (optional; helps select locally applicable guidance)")
        if not f.district:
            self.missing_information.append("Farm district (optional; helps select locally applicable guidance)")
        if not f.land_size or f.land_size <= 0:
            self.warnings.append("Land size is missing or invalid; per-farm totals cannot be calculated.")
        if soil.ph is not None and not 0 <= soil.ph <= 14:
            self.warnings.append("Invalid soil pH value; pH-based rules were not applied.")
        if soil.ec is not None and soil.ec < 0:
            self.warnings.append("Invalid soil EC value; salinity rules were not applied.")
        if soil.organic_carbon_percent is not None and not 0 <= soil.organic_carbon_percent <= 100:
            self.warnings.append("Invalid organic carbon value; organic-carbon adjustment was not applied.")

    def _soil_health_rules(self):
        soil = self._soil()
        if soil.organic_carbon_percent is not None and 0 <= soil.organic_carbon_percent <= 100:
            oc = soil.organic_carbon_percent
            if oc < SOIL_TEST["oc_low_below"]:
                self.soil_classes["organic_carbon"] = "low"
                self.advisories.append("Organic carbon is low. Consider suitable organic matter and account for its nutrient contribution.")
            elif oc > SOIL_TEST["oc_high_above"]:
                self.soil_classes["organic_carbon"] = "high"
            else:
                self.soil_classes["organic_carbon"] = "medium"
        if soil.ph is not None and 0 <= soil.ph <= 14:
            if soil.ph > SOIL_TEST["alkali_ph_above"]:
                self.soil_classes["pH"] = "strongly_alkaline"
                self.advisories.append("Soil pH is above 9.3. PAU indicates a 25% nitrogen adjustment in the cited context; confirm local suitability and salinity/sodicity before applying.")
            elif soil.ph < 5.5:
                self.soil_classes["pH"] = "acidic"
                self.advisories.append("Soil is acidic. Check crop suitability and obtain a soil-test-based amendment recommendation.")
            elif soil.ph > 8.5:
                self.soil_classes["pH"] = "alkaline"
                self.advisories.append("Soil is alkaline. Check nutrient availability and possible sodicity.")
        if soil.ec is not None and soil.ec > SOIL_TEST["saline_ec_above"]:
            self.soil_classes["salinity"] = "elevated"
            self.advisories.append("Soil EC is above the PAU threshold of 0.8 in the supplied rule table. Confirm EC units/method and local interpretation before applying the 25% nitrogen adjustment.")
        for field_name in ("nitrogen_status", "phosphorus_status", "potassium_status", "sulphur_status", "zinc_status", "iron_status", "boron_status"):
            status = self._valid_status(getattr(soil, field_name))
            if status:
                self.soil_classes[field_name.replace("_status", "")] = status
                if status == "low":
                    self.advisories.append(f"Soil report indicates low {field_name.replace('_status', '')}. Apply a crop-specific soil-test recommendation where available.")
                elif status == "very high":
                    self.advisories.append(f"Soil report indicates very high {field_name.replace('_status', '')}. Avoid routine additional application without expert assessment.")

    def _history_rules(self):
        f = self.farm
        if self.crop == "rice" and _norm(f.previous_crop) == "wheat" and f.previous_crop_phosphorus_applied is True:
            self.advisories.append("PAU: omit phosphorus to rice following wheat that received its recommended phosphorus dose.")
            self.matched_rules.append("PAU_RICE_AFTER_WHEAT_P")
        if f.manure_history:
            self.advisories.append("Account for nutrients supplied by FYM, compost, pressmud, green manure and other organic amendments before finalizing mineral fertilizer quantities.")
        if f.fertilizer_history:
            self.advisories.append("Deduct nutrients already applied during this crop cycle before deciding any additional application.")

    def _weather_rules(self):
        w = self.farm.weather or {}
        rain = w.get("precipitation_probability")
        if w.get("heavy_rain_expected") is True or (isinstance(rain, (int, float)) and rain >= 70):
            self.advisories.append("Rain is expected. Review fertilizer timing to reduce runoff, leaching and nutrient loss.")
        wind = w.get("wind_speed")
        if isinstance(wind, (int, float)) and wind > 15:
            self.advisories.append("Wind may increase spray drift. Avoid pesticide spraying until conditions are suitable.")
        if w.get("extreme_heat") is True:
            self.advisories.append("Extreme heat is reported. Avoid unnecessary foliar applications and follow crop-specific guidance.")
        if w.get("water_stress") is True:
            self.advisories.append("Water stress is reported. Confirm crop water status before applying fertilizers or foliar nutrients.")

    def _variety_group(self):
        v = _norm(self.farm.variety)
        compact = re.sub(r"[^a-z0-9]+", "", v)
        for group, aliases in VARIETY_GROUPS.get(self.crop, {}).items():
            if v == group or compact == re.sub(r"[^a-z0-9]+", "", group):
                return group
            for alias in aliases:
                if compact == re.sub(r"[^a-z0-9]+", "", alias):
                    return group
        # Direct dropdown values for non-PAU crops
        if self.crop == "cassava" and v in {"high_yielding", "local_m4", "general"}:
            return v
        if self.crop == "tomato" and v in {"hybrid", "general"}:
            return v
        return None

    def _n_class(self, soil):
        oc = soil.organic_carbon_percent
        if oc is None or not 0 <= oc <= 100:
            return None
        if oc < SOIL_TEST["oc_low_below"]:
            return "low"
        if oc > SOIL_TEST["oc_high_above"]:
            return "high"
        return "medium"

    def _p_class_from_lab(self, soil):
        # PAU Olsen P is kg P/acre. Use only if an explicit unit is present.
        value = soil.laboratory_values.get("olsen_p", soil.laboratory_values.get("phosphorus"))
        unit = _norm(soil.laboratory_units.get("olsen_p", soil.laboratory_units.get("phosphorus")))
        if not isinstance(value, (int, float)) or "acre" not in unit:
            return None
        if value < SOIL_TEST["p_low_below"]:
            return "low"
        if value <= SOIL_TEST["p_medium_to"]:
            return "medium"
        if value <= SOIL_TEST["p_high_to"]:
            return "high"
        return "very_high"

    def _p_adjustment(self, soil, p_class):
        if not p_class:
            return None
        oc = soil.organic_carbon_percent
        if oc is None:
            return None
        band = "lt04" if oc < 0.4 else "04_06" if oc <= 0.6 else "gt06"
        return P_TABLE2[band][p_class]

    def _table1_products(self, crop):
        soil = self._soil()
        table = TABLE1.get(crop)
        if not table:
            return None
        n_class = self._n_class(soil)
        p_class = self._p_class_from_lab(soil) or self._valid_status(soil.phosphorus_status)
        p_class = {"very high": "very_high"}.get(p_class, p_class)
        if p_class not in {"low", "medium", "high", "very_high"}:
            p_class = None
        products = {}
        if n_class:
            products["urea_kg_per_acre"] = table["urea"].get(n_class)
        if p_class:
            p_entry = table["p"].get(p_class)
            if p_entry:
                products["ssp_kg_per_acre"] = p_entry["ssp"]
                products["dap_alternative_kg_per_acre"] = p_entry["dap"]
            else:
                products["ssp_kg_per_acre"] = 0
                products["dap_alternative_kg_per_acre"] = 0
        if not products:
            return None
        return products, table["page"], n_class, p_class

    @staticmethod
    def _products_to_nutrients(products):
        n = products.get("urea_kg_per_acre", 0) * UREA_N
        p = products.get("ssp_kg_per_acre", 0) * SSP_P2O5
        # DAP is an alternative P source; do not add it to SSP.
        return {"N": round(n, 2), "P2O5": round(p, 2)}

    def _crop_specific_rules(self):
        f, soil = self.farm, self._soil()
        stage = _norm(f.stage)
        group = self._variety_group()
        warnings, advisories = [], []
        result = {
            "basis": "stage_based_guidance",
            "unit_basis": None,
            "nutrients_kg_per_acre": None,
            "fertilizer_products_per_acre": None,
            "farm_total_nutrients_kg": None,
            "farm_total_products": None,
            "application_timing": [],
            "message": "",
            "source": None,
            "source_section": None,
            "limitations": [],
        }

        # -------------------- WHEAT (PAU Rabi) --------------------
        if self.crop == "wheat":
            tab = self._table1_products("wheat")
            if tab:
                products, page, nclass, pclass = tab
                # The supplied Table 1 is a soil-test table. Preserve product rates.
                result["basis"] = "PAU_soil_test_table"
                result["unit_basis"] = "kg fertilizer product/acre"
                result["fertilizer_products_per_acre"] = products
                result["nutrients_kg_per_acre"] = self._products_to_nutrients(products)
                result["source"] = PAU_SOURCE
                result["source_section"] = f"Wheat soil-test Table 1 ({page})"
                result["message"] = "PAU soil-test-based wheat product quantities selected from the available organic-carbon and Olsen-phosphorus classes."
            else:
                g = GENERAL["wheat"]
                products = {"urea_kg_per_acre": g["urea"], "dap_alternative_kg_per_acre": g["dap"], "ssp_alternative_kg_per_acre": g["ssp"]}
                if _norm(f.district) in {"gurdaspur", "hoshiarpur", "rupnagar", "sbs nagar", "shaheed bhagat singh nagar"}:
                    products["mop_if_low_k_kg_per_acre"] = g["mop_if_k_low_districts"]
                else:
                    products["mop_if_low_k_kg_per_acre"] = g["mop_if_k_low"]
                result.update({"basis": "PAU_general_medium_fertility", "unit_basis": "kg fertilizer product/acre", "fertilizer_products_per_acre": products, "nutrients_kg_per_acre": self._products_to_nutrients({"urea_kg_per_acre": g["urea"], "ssp_kg_per_acre": g["ssp"]}), "source": PAU_SOURCE, "source_section": "Wheat general dose (R p.17)", "message": "PAU general dose for medium-fertility soil. Prefer the soil-test table when suitable laboratory results are available."})
            result["application_timing"] = [
                "Apply the basal phosphorus source at sowing.",
                "Use the PAU wheat nitrogen schedule, with the first irrigation around crown-root initiation; adjust timing for sowing date and field conditions.",
                "Use the PAU LCC guidance at the second irrigation where applicable; LCC thresholds and doses are included in LCC['wheat'].",
            ]
            if f.sowing_date:
                result["date_dependent_note"] = "Sowing date is available; classify timely versus late-sown wheat before applying the first-irrigation LCC urea amount."
            else:
                result["date_dependent_note"] = "Sowing date is not available. Stage-based advice is provided; timely/late-sown LCC dose cannot be selected."
            result["limitations"] = ["PAU Punjab recommendation.", "DAP and SSP are alternative phosphorus sources, not cumulative.", "Deduct DAP nitrogen credit from urea when DAP is used."]
            result["source_section"] += "; LCC R p.18"
            self.matched_rules.append("PAU_WHEAT_TABLE1_GENERAL_LCC")
            return result

        # -------------------- RICE (PAU Kharif) --------------------
        if self.crop == "rice":
            system = "basmati" if group in {"basmati_36", "basmati_54", "csr30"} else "rice_transplanted"
            if "direct" in stage or "dsr" in stage:
                system = "rice_dsr"
            if "drum" in stage or "dsbr" in stage:
                system = "dsbr"
            if system == "basmati":
                g = GENERAL["basmati"]["urea"]
                urea = g.get(group, g.get("basmati_36", 36))
                products = {"urea_kg_per_acre": urea}
                page = GENERAL["basmati"]["page"]
            elif system == "rice_dsr":
                urea = GENERAL["dsr"]["urea"]
                products = {"urea_kg_per_acre": urea}
                page = GENERAL["dsr"]["page"]
            elif system == "dsbr":
                urea = GENERAL["dsbr"]["urea"]
                products = {"urea_kg_per_acre": urea}
                page = GENERAL["dsbr"]["page"]
            else:
                urea = GENERAL["rice"]["urea"].get(group, GENERAL["rice"]["urea"]["default"])
                products = {"urea_kg_per_acre": urea, "dap_alternative_kg_per_acre": GENERAL["rice"]["dap"], "ssp_alternative_kg_per_acre": GENERAL["rice"]["ssp"]}
                page = GENERAL["rice"]["page"]
            # Rice after wheat with recommended P: omit P.
            if _norm(f.previous_crop) == "wheat" and f.previous_crop_phosphorus_applied is True:
                products.pop("dap_alternative_kg_per_acre", None)
                products.pop("ssp_alternative_kg_per_acre", None)
                advisories.append("Omit phosphorus to rice following wheat that received its recommended phosphorus dose.")
            # Soil-test Table 1 may replace general dose where OC and lab class exist.
            tab = self._table1_products("rice")


            if tab and system == "rice_transplanted":
                pproducts, _, _, _ = tab
                products.update(pproducts)
                result["basis"] = "PAU_soil_test_table"
            else:
                result["basis"] = "PAU_general_medium_fertility"
            result["unit_basis"] = "kg fertilizer product/acre"
            result["fertilizer_products_per_acre"] = products
            result["nutrients_kg_per_acre"] = self._products_to_nutrients({
                "urea_kg_per_acre": products.get("urea_kg_per_acre", 0),
                "ssp_kg_per_acre": products.get("ssp_kg_per_acre", products.get("ssp_alternative_kg_per_acre", 0)),
            })
            result["source"] = PAU_SOURCE
            result["source_section"] = f"Rice {system} ({page})"
            result["message"] = "PAU rice guidance selected by the recognized rice system and variety group. Apply nitrogen in splits and use LCC where specified."
            if system == "rice_transplanted":
                result["application_timing"] = ["Transplanted rice: basal urea 25 kg/acre; begin LCC observations at 14 days after transplanting and repeat every 7 days. Apply 25 kg urea/acre when the reading meets the PAU threshold."]
                result["lcc"] = LCC["rice_transplanted"]
            elif system == "basmati":
                result["application_timing"] = ["Basmati: no basal urea in the cited LCC schedule; begin LCC observations at 21 days and repeat every 7 days. Use the variety-specific shade threshold and 9 kg urea/acre dose."]
                result["lcc"] = LCC["basmati"]
            elif system == "rice_dsr":
                result["application_timing"] = ["DSR: apply the first 25 kg urea/acre at 28 days; begin LCC observations at 42 days and repeat every 7 days."]
                result["lcc"] = LCC["rice_dsr"]
            else:
                result["application_timing"] = ["Use the PAU DSBR schedule and adjust for green manure or preceding moong where relevant."]
            result["limitations"] = ["PAU Punjab recommendation.", "Confirm establishment system and variety.", "DAP and SSP are alternative phosphorus sources.", "LCC is meaningful only when leaves are free from pest/disease damage."]
            self.matched_rules.append("PAU_RICE_GENERAL_TABLE1_LCC")
            return result

        # -------------------- MAIZE (PAU Kharif) --------------------
        if self.crop == "maize":
            if group not in {"group_a", "group_b"}:
                warnings.append("The PAU numeric maize schedule requires a recognized Group A or Group B variety. Select the correct group/variety.")
                result["message"] = "General maize stage advice: split nitrogen across sowing, knee-high and pre-tasseling stages; do not apply before heavy rain."
                result["warnings"] = warnings
                result["source"] = PAU_SOURCE
                result["source_section"] = "Maize variety grouping and fertilizer schedule (K p.41)"
                result["application_timing"] = ["At sowing: basal fertilizer.", "At knee-high stage: first top-dressing.", "Before tasseling: remaining nitrogen according to PAU schedule."]
                return result
            g = GENERAL["maize"][group]
            products = {"urea_kg_per_acre": g["urea"], "dap_alternative_kg_per_acre": g["dap"], "ssp_alternative_kg_per_acre": g["ssp"]}
            if self._valid_status(soil.potassium_status) == "low":
                products["mop_kg_per_acre"] = g["mop_if_k_low"]
            if _norm(f.irrigation_type) in {"rainfed", "rain fed"}:
                moisture = _norm(f.weather.get("stored_soil_moisture", "adequate"))
                rain_key = "rainfed_dry" if moisture in {"low", "dry", "inadequate"} else "rainfed_moist"
                rg = GENERAL["maize"][rain_key]
                products = {"urea_kg_per_acre": rg["urea"], "dap_alternative_kg_per_acre": rg["dap"], "ssp_alternative_kg_per_acre": rg["ssp"]}
                if self._valid_status(soil.potassium_status) == "low":
                    products["mop_kg_per_acre"] = rg["mop_if_k_low"]
                result["source_section"] = f"Rainfed maize {rain_key} (K p.45)"
            else:
                result["source_section"] = f"Maize {group} (K p.41)"
            result.update({
                "basis": "PAU_general_medium_fertility",
                "unit_basis": "kg fertilizer product/acre",
                "fertilizer_products_per_acre": products,
                "nutrients_kg_per_acre": self._products_to_nutrients({
                    "urea_kg_per_acre": products["urea_kg_per_acre"],
                    "ssp_kg_per_acre": products.get("ssp_alternative_kg_per_acre", 0),
                }),
                "source": PAU_SOURCE,
                "message": "PAU maize rate selected for the recognized variety group. Potassium product is included only when the soil report indicates deficiency.",
                "application_timing": ["Apply basal fertilizer at sowing.", "Top-dress nitrogen at knee-high stage.", "Apply the remaining nitrogen before tasseling, following the applicable PAU schedule."],
                "lcc": LCC["maize"],
                "limitations": ["PAU Punjab recommendation.", "DAP and SSP are alternatives.", "Rainfed rate depends on stored soil moisture.", "Use soil-test results for potassium."],
            })
            self.matched_rules.append("PAU_MAIZE_GROUP_SPLIT_LCC")
            return result

        # -------------------- SUGARCANE (PAU) --------------------
        if self.crop == "sugarcane":
            ratoon = "ratoon" in stage or "ratoon" in _norm(f.season)
            cycle = "ratoon" if ratoon else "plant"
            table = TABLE1["sugarcane"]
            tab = self._table1_products("sugarcane")
            if tab and not ratoon:
                products, page, _, _ = tab
                basis = "PAU_soil_test_table"
            else:
                g = GENERAL["sugarcane"][cycle]
                products = {"urea_kg_per_acre": g["urea"], "ssp_if_low_p_kg_per_acre": g["ssp_if_p_low"], "mop_if_low_k_kg_per_acre": g["mop_if_k_low"]}
                page = GENERAL["sugarcane"]["page"]
                basis = "PAU_general_medium_fertility"
                if ratoon:
                    products["urea_kg_per_acre"] = TABLE1_SUGARCANE_RATOON.get(self._n_class(soil), g["urea"])
            if _norm(f.previous_crop) == "potato":
                products["urea_kg_per_acre"] = GENERAL["sugarcane"]["after_potato_urea"]
                advisories.append("PAU specifies a reduced urea quantity after potato as a sugarcane intercrop; verify the relevant crop sequence.")
            result.update({
                "basis": basis, "unit_basis": "kg fertilizer product/acre",
                "fertilizer_products_per_acre": products,
                "nutrients_kg_per_acre": self._products_to_nutrients({"urea_kg_per_acre": products.get("urea_kg_per_acre", 0), "ssp_kg_per_acre": products.get("ssp_if_low_p_kg_per_acre", 0)}),
                "source": PAU_SOURCE, "source_section": f"Sugarcane {cycle} ({page})",
                "message": "PAU sugarcane recommendation selected for plant or ratoon crop. Apply nutrients in stages and use soil-test information for phosphorus and potassium.",
                "application_timing": ["Plant crop: apply basal phosphorus and split nitrogen during early crop growth.", "Ratoon crop: begin fertilizer application after ratoon establishment and follow the PAU ratoon schedule."],
                "limitations": ["PAU Punjab recommendation.", "Plant and ratoon schedules are different.", "Conditional P and K products must not be applied without the relevant soil-test condition."],
            })
            self.matched_rules.append("PAU_SUGARCANE_PLANT_RATOON")
            return result

        # -------------------- POTATO (PAU source, product options) --------------------
        if self.crop == "potato":
            products = dict(POTATO_PRODUCT_OPTIONS["urea_ssp"])
            n = products["urea_kg"] * UREA_N
            p = products["ssp_kg"] * SSP_P2O5
            result.update({
                "basis": "PAU_Punjab_reference",
                "unit_basis": "kg fertilizer product/acre",
                "fertilizer_products_per_acre": products,
                "nutrients_kg_per_acre": {"N": round(n, 2), "P2O5": round(p, 2), "K2O": 0.0},
                "source": PAU_SOURCE,
                "source_section": "Potato fertilizer advisory",
                "message": "PAU Punjab reference option using urea and SSP. A separate DAP + urea + MOP option is available; do not combine both options.",
                "application_timing": ["Apply all phosphorus and potassium and half the nitrogen at planting.", "Apply the remaining nitrogen at earthing-up."],
                "alternative_product_option": POTATO_PRODUCT_OPTIONS["urea_dap_mop"],
                "limitations": ["Confirm current local PAU potato recommendation and soil-test status.", "Rates are per acre.", "The alternative product option is not cumulative with the selected option."],
            })
            self.matched_rules.append("PAU_POTATO_SPLIT")
            return result

        # -------------------- CASSAVA (ICAR-CTCRI) --------------------
        if self.crop == "cassava":
            variety = group or "general"
            rates = dict(CASSAVA_RATES[variety])
            result.update({
                "basis": "ICAR_CTC RI_region_dependent".replace(" ", ""),
                "unit_basis": "kg nutrient/ha",
                "nutrients_kg_per_hectare": rates,
                "source": ICAR_CASSAVA_SOURCE,
                "source_section": f"Cassava nutrient schedule ({variety})",
                "message": "ICAR-CTCRI reference schedule. Use either the high-yielding schedule or the local/M-4 schedule according to crop type; do not combine them.",
                "application_timing": ["At planting: apply the basal portion, including all phosphorus and about half the nitrogen and potassium.", "At 45-60 days after planting: apply the remaining nitrogen and potassium."],
                "limitations": ["Source is ICAR-CTCRI; regional suitability must be confirmed.", "Rates are per hectare.", "Organic manure should be accounted for separately."],
            })
            self.matched_rules.append("ICAR_CTC RI_CASSAVA".replace(" ", ""))
            return result

        # -------------------- TOMATO (TNAU) --------------------
        if self.crop == "tomato":
            variety = "hybrid" if group == "hybrid" else "general"
            rates = dict(TOMATO_RATES[variety])
            result.update({
                "basis": "region_dependent",
                "unit_basis": "kg nutrient/ha",
                "nutrients_kg_per_hectare": rates,
                "source": TNAU_TOMATO_SOURCE,
                "source_section": f"Tomato field schedule ({variety})",
                "message": "TNAU field recommendation shown as a regional reference, not a Punjab-verified prescription. The standard and hybrid schedules are alternatives.",
                "application_timing": ["Apply basal nutrients at transplanting.", "For the standard field schedule, apply the remaining nitrogen around 30 days after planting.", "For hybrid schedules, follow the source-specific split schedule; do not combine with the standard schedule."],
                "limitations": ["TNAU source; confirm local Punjab recommendation.", "Rates are per hectare.", "Do not mix standard and hybrid schedules."],
            })
            self.matched_rules.append("TNAU_TOMATO_FIELD_SCHEDULE")
            return result

        # -------------------- TEA (KAU) --------------------
        if self.crop == "tea":
            if soil.ph is None or soil.ph >= 4.5:
                result["message"] = "Tea fertilizer schedule depends on soil pH, plant age, yield and pruning cycle. The available KAU numeric table is specifically for young tea on soil pH below 4.5; no numeric rate is issued without that condition."
                result["source"] = KAU_TEA_SOURCE
                result["source_section"] = "Tea pH-specific nutrient schedule"
                result["limitations"] = ["No numeric rate issued because soil pH is missing or outside the extracted pH <4.5 schedule.", "Mature tea requires yield, pruning and soil-test information."]
                return result
            s = stage
            year = "year_1" if "year 1" in s else "year_2" if "year 2" in s else "year_3" if "year 3" in s else "year_4_plus"
            rates = dict(TEA_YOUNG_ACIDIC[year])
            result.update({
                "basis": "region_dependent",
                "unit_basis": "kg nutrient/ha",
                "nutrients_kg_per_hectare": rates,
                "source": KAU_TEA_SOURCE,
                "source_section": f"Young tea {year}, soil pH <4.5",
                "message": "KAU young-tea schedule for acidic soil (pH below 4.5). This is not a Punjab-validated recommendation.",
                "application_timing": ["The source schedule is split across multiple applications during the year.", "Apply phosphorus as specified by the source and confirm exact split timing from the local tea advisory."],
                "limitations": ["KAU Kerala schedule; not a Punjab-validated recommendation.", "Not applicable to mature tea without yield/pruning-based calculation."],
            })
            self.matched_rules.append("KAU_TEA_YOUNG_ACIDIC")
            return result

        # -------------------- APPLE (ICAR mature-tree example) --------------------
        if self.crop == "apple":
            result.update({
                "basis": "region_dependent_reference_example",
                "unit_basis": "kg fertilizer product/tree",
                "fertilizer_products_per_tree": dict(APPLE_MATURE_PRODUCTS),
                "source": ICAR_APPLE_SOURCE,
                "source_section": "Mature apple tree (>10 years) example",
                "message": "The available source gives an example for mature trees over 10 years. It is not suitable as a universal orchard rate or for young trees.",
                "application_timing": ["Apply FYM, phosphorus and potassium during the winter dormant period.", "Split nitrogen: one portion before flowering and the remaining portion after fruit set, following local horticulture guidance."],
                "limitations": ["Tree age, spacing, rootstock, yield and region are needed for an orchard-level dose.", "Quantities are per tree, not per acre.", "Do not use this mature-tree example for young orchards."],
            })
            self.matched_rules.append("ICAR_APPLE_MATURE_TREE_EXAMPLE")
            return result

        return result

    def _micronutrient_rules(self):
        soil, f = self._soil(), self.farm
        # Numeric laboratory values are used only with explicit PAU units.
        zn = soil.laboratory_values.get("zinc")
        zn_unit = _norm(soil.laboratory_units.get("zinc"))
        if self.crop in ZINC and isinstance(zn, (int, float)) and "acre" in zn_unit and zn < SOIL_TEST["zn_deficient_below"]:
            z = ZINC[self.crop]
            self.advisories.append(
                f"PAU soil-Zn threshold is below 0.6 kg/acre. Reference correction: "
                f"{z['hepta']} kg/acre zinc sulphate heptahydrate (21%) or "
                f"{z['mono']} kg/acre monohydrate (33%). {z['when']}"
            )
            self.matched_rules.append(f"PAU_{self.crop.upper()}_ZINC")
        elif self.crop in ZINC and self._valid_status(soil.zinc_status) == "low":
            self.advisories.append("Zinc is reported low, but a categorical status cannot confirm the PAU numeric soil threshold. Obtain the actual soil Zn result before selecting a rate.")
        mn = soil.laboratory_values.get("manganese")
        mn_unit = _norm(soil.laboratory_units.get("manganese"))
        if self.crop == "wheat" and _norm(f.previous_crop) == "rice" and _norm(soil.texture) in {"sandy", "sandy soil", "loamy sand"} and isinstance(mn, (int, float)) and "acre" in mn_unit and mn < SOIL_TEST["mn_deficient_below"]:
            self.advisories.append(MANGANESE_WHEAT)
            self.matched_rules.append("PAU_WHEAT_MANGANESE_AFTER_RICE")
        if self.crop in {"rice", "sugarcane"} and soil.ph is not None and soil.ph > 8.5:
            self.advisories.append(IRON_NOTE)

    def _disease_n_rules(self):
        if self.crop != "rice":
            return
        labels = []
        for item in (self.farm.disease_prediction or {},):
            labels.extend([str(item.get("disease", "")), str(item.get("label", ""))])
        labels.extend([str(x) for x in (self.farm.disease_observations or [])])
        text = " ".join(labels).lower()
        for key, note in RICE_DISEASE_N_RULES.items():
            if key in text:
                self.advisories.append(note)
        if text:
            self.advisories.append(GENERIC_N_DISEASE_NOTE)

    def _plant_protection_rules(self):
        prediction = self.farm.disease_prediction or {}
        pest_prediction = self.farm.pest_prediction or {}
        disease = prediction.get("disease") or prediction.get("label")
        confidence = prediction.get("confidence")
        pest = pest_prediction.get("pest") or pest_prediction.get("label")
        if disease:
            if not isinstance(confidence, (int, float)) or not 0 <= confidence <= 1:
                self.warnings.append("Disease model confidence is missing or invalid. Confirm the diagnosis in the field.")
            elif confidence < 0.80:
                self.warnings.append("Disease model confidence is below 80%. Obtain field confirmation before treatment.")
            else:
                self.advisories.append(f"Possible disease detected: {disease}. Confirm symptoms and diagnosis before treatment.")
        if pest:
            self.advisories.append(f"Possible pest detected: {pest}. Verify pest identity, population and economic threshold before treatment.")
        if self.farm.symptoms:
            self.advisories.append("Check farmer-reported symptoms against nutrient deficiency, water stress, disease, pests and herbicide injury before choosing an intervention.")

    def _calculate_totals(self, rec):
        size = self.farm.land_size
        if not isinstance(size, (int, float)) or size <= 0:
            return
        unit = _norm(self.farm.land_unit or "acre")
        if unit in {"acre", "acres"}:
            factor_acre = size
            factor_ha = size * 0.404685642
        elif unit in {"hectare", "hectares", "ha"}:
            factor_ha = size
            factor_acre = size * 2.47105381
        else:
            self.warnings.append(f"Unsupported land unit '{self.farm.land_unit}'. Farm totals were not calculated.")
            return
        if rec.get("nutrients_kg_per_acre"):
            rec["farm_total_nutrients_kg"] = {
                k: round(v * factor_acre, 2) if isinstance(v, (int, float)) else None
                for k, v in rec["nutrients_kg_per_acre"].items()
            }
        if rec.get("fertilizer_products_per_acre"):
            rec["farm_total_products"] = {
                k: round(v * factor_acre, 2) if isinstance(v, (int, float)) else None
                for k, v in rec["fertilizer_products_per_acre"].items()
            }
        if rec.get("nutrients_kg_per_hectare"):
            rec["farm_total_nutrients_kg"] = {
                k: round(v * factor_ha, 2) if isinstance(v, (int, float)) else None
                for k, v in rec["nutrients_kg_per_hectare"].items()
            }
        if rec.get("fertilizer_products_per_tree"):
            rec["farm_total_products"] = None
            rec["farm_total_note"] = "Per-tree quantities cannot be converted to a farm total without the number of trees."

    def evaluate(self):
        self._check_input_quality()
        self._soil_health_rules()
        self._history_rules()
        self._weather_rules()
        self._micronutrient_rules()
        self._disease_n_rules()
        self._plant_protection_rules()

        recommendation = self._crop_specific_rules()
        self._calculate_totals(recommendation)

        # Add the source's organic nutrient credit note only when manure history exists.
        if self.farm.manure_history:
            self.advisories.append(FYM_NOTE)

        # Product recommendation may be absent for a crop/stage requiring local details.
        if not recommendation.get("nutrients_kg_per_acre") and not recommendation.get("nutrients_kg_per_hectare") and not recommendation.get("fertilizer_products_per_acre") and not recommendation.get("fertilizer_products_per_tree"):
            status = "stage_guidance_available_rate_not_calculated"
        elif recommendation.get("basis", "").startswith("region_dependent"):
            status = "regional_reference_available"
        else:
            status = "conditional_recommendation_available"

        if recommendation.get("limitations"):
            self.warnings.extend(recommendation["limitations"])

        # A missing soil report is not a blocker. Clearly state that soil-test
        # adjustment is limited when actual laboratory values are absent.
        soil = self._soil()
        if not soil.laboratory_values and not any([
            soil.organic_carbon_percent is not None,
            soil.nitrogen_status, soil.phosphorus_status, soil.potassium_status
        ]):
            self.advisories.append("No soil-test information was supplied. The recommendation is a source-based baseline and has not been adjusted to this field's soil.")

        return {
            "crop": self.crop,
            "location": {
                "state": self.farm.state,
                "district": self.farm.district,
                "location": self.farm.location,
            },
            "crop_details": {
                "variety": self.farm.variety,
                "variety_group": self._variety_group(),
                "season": self.farm.season,
                "stage": self.farm.stage,
                "sowing_date": self.farm.sowing_date.isoformat() if self.farm.sowing_date else None,
                "land_size": self.farm.land_size,
                "land_unit": self.farm.land_unit,
            },
            "fertilizer_status": status,
            "fertilizer_recommendation": recommendation,
            "plant_protection": {
                "status": "diagnosis_and_ipm_advisory",
                "chemical_prescription": None,
                "message": "No pesticide product or dose is prescribed by the fertilizer engine. Confirm disease or pest diagnosis and use the separate plant-protection module and registered product label.",
            },
            "advisories": list(dict.fromkeys(self.advisories + recommendation.get("application_timing", []))),
            "warnings": list(dict.fromkeys(self.warnings)),
            "missing_information": list(dict.fromkeys(self.missing_information)),
            "soil_classes": self.soil_classes,
            "matched_rules": list(dict.fromkeys(self.matched_rules)),
            "requires_expert_confirmation": status == "regional_reference_available" or bool(self.warnings),
            "disclaimer": (
                "KisanAI decision-support guidance. PAU rates apply to the specified Punjab crop systems. "
                "ICAR/KAU/TNAU examples are region- and crop-system-specific and are not automatically "
                "Punjab recommendations. Confirm the final dose with a current soil test and local "
                "Krishi Vigyan Kendra/agricultural extension officer."
            ),
        }


# Backward-compatible alias for code that used the other class name.
FertilizerEngine = FertilizerRuleEngine


if __name__ == "__main__":
    demo = FarmData(
        crop="maize",
        variety="PMH 1",
        stage="Knee-high",
        land_size=1,
        land_unit="acre",
        soil=SoilData(ph=7.4, organic_carbon_percent=0.55, potassium_status="low"),
        state="Punjab",
        district="Ludhiana",
    )
    from pprint import pprint
    pprint(FertilizerRuleEngine(demo).evaluate())