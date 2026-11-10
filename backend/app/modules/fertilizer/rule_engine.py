
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional
from datetime import date


# ============================================================
# CROP CONFIGURATION
# ============================================================

CROPS = {
    "apple", "cassava", "maize", "corn", "potato",
    "rice", "paddy", "sugarcane", "tea", "tomato", "wheat"
}

ALIASES = {
    "corn": "maize",
    "corn/maize": "maize",
    "paddy": "rice",
}

# These are source-backed rules, not universal crop recommendations.
PAU_SOURCE = {
    "institution": "Punjab Agricultural University, Ludhiana",
    "publication": "Package of Practices for Crops of Punjab",
    "edition": "Kharif 2026",
    "region": "Punjab, India",
}

ICAR_SOURCE = {
    "institution": "Indian Council of Agricultural Research",
    "publication": "Kharif Agro-Advisories for Farmers 2025",
    "region": "India; crop/state-specific applicability required",
}


# ============================================================
# INPUT DATA
# ============================================================

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

    # Optional actual laboratory values. Units must be supplied.
    laboratory_values: dict = field(default_factory=dict)
    laboratory_units: dict = field(default_factory=dict)

    # Soil classification: sandy, loamy, clayey, etc.
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

    # Farmer observations and diagnosis information
    symptoms: list = field(default_factory=list)
    pest_observations: list = field(default_factory=list)
    disease_observations: list = field(default_factory=list)

    disease_prediction: Optional[dict] = None
    pest_prediction: Optional[dict] = None

    weather: dict = field(default_factory=dict)


# ============================================================
# RULE ENGINE
# ============================================================

class FertilizerRuleEngine:

    def __init__(self, farm: FarmData):
        self.farm = farm
        self.crop = self._normalize_crop(farm.crop)

        if self.crop not in CROPS:
            raise ValueError(f"Unsupported crop: {farm.crop}")

        self.warnings = []
        self.advisories = []
        self.missing_information = []
        self.matched_rules = []

    @staticmethod
    def _normalize_crop(crop):
        if not crop or not isinstance(crop, str):
            raise ValueError("A valid crop name is required.")

        crop = crop.strip().lower()
        return ALIASES.get(crop, crop)

    @staticmethod
    def _valid_status(value):
        if value is None:
            return None

        value = str(value).strip().lower()

        allowed = {
            "low", "medium", "high", "deficient",
            "adequate", "sufficient", "excess",
            "very high", "unknown"
        }

        if value not in allowed:
            return None

        return value

    def _check_input_quality(self):

        if not self.farm.state:
            self.missing_information.append("Farm state")

        if not self.farm.district:
            self.missing_information.append("Farm district")

        if not self.farm.variety:
            self.missing_information.append("Crop variety")

        if not self.farm.stage:
            self.missing_information.append("Crop growth stage")

        if not self.farm.season:
            self.missing_information.append("Growing season")

        if not self.farm.land_size or self.farm.land_size <= 0:
            self.warnings.append(
                "Invalid or missing land size. Farm-level quantities "
                "cannot be calculated."
            )

        soil = self.farm.soil

        if soil.ph is not None and not 0 <= soil.ph <= 14:
            self.warnings.append("Invalid soil pH value.")

        if soil.ec is not None and soil.ec < 0:
            self.warnings.append("Invalid soil EC value.")

        if soil.organic_carbon_percent is not None:
            if not 0 <= soil.organic_carbon_percent <= 100:
                self.warnings.append("Invalid soil organic carbon value.")

        if not soil.laboratory_values:
            self.missing_information.append("Soil laboratory report")

        if not self.farm.fertilizer_history:
            self.missing_information.append(
                "Previous fertilizer application history"
            )

    # --------------------------------------------------------
    # SOIL HEALTH INTERPRETATION
    # --------------------------------------------------------

    def _soil_health_rules(self):

        soil = self.farm.soil

        if soil.ph is not None:
            if soil.ph < 5.5:
                self.advisories.append(
                    "Soil is strongly acidic. Check crop suitability and "
                    "obtain a soil-test-based amendment recommendation."
                )
            elif soil.ph > 8.5:
                self.advisories.append(
                    "Soil is strongly alkaline. Check for nutrient "
                    "availability problems and possible sodicity."
                )

        if soil.ec is not None and soil.ec >= 4:
            self.advisories.append(
                "Elevated soil salinity may affect nutrient uptake. "
                "Obtain expert interpretation of the EC measurement "
                "and its measurement method."
            )

        if soil.organic_carbon_percent is not None:
            if soil.organic_carbon_percent < 0.4:
                self.advisories.append(
                    "Low organic carbon: assess organic matter and "
                    "integrated nutrient management options."
                )
            elif soil.organic_carbon_percent > 0.75:
                self.advisories.append(
                    "High organic carbon: account for indigenous "
                    "nutrient supply before applying fertilizer."
                )

        for nutrient in (
            "nitrogen_status", "phosphorus_status",
            "potassium_status", "sulphur_status",
            "zinc_status", "iron_status", "boron_status"
        ):
            status = self._valid_status(getattr(soil, nutrient))

            if status in {"low", "deficient"}:
                self.advisories.append(
                    f"Soil report indicates possible {nutrient.replace('_status', '')} "
                    "deficiency. Use a crop-specific, laboratory-based prescription."
                )

            elif status in {"high", "very high", "excess"}:
                self.advisories.append(
                    f"Soil report indicates elevated {nutrient.replace('_status', '')}. "
                    "Avoid routine additional application without expert assessment."
                )

    # --------------------------------------------------------
    # PREVIOUS CROP AND NUTRIENT HISTORY
    # --------------------------------------------------------

    def _cropping_history_rules(self):

        if (
            self.crop == "rice"
            and (self.farm.previous_crop or "").lower() == "wheat"
            and self.farm.previous_crop_phosphorus_applied is True
        ):
            self.advisories.append(
                "PAU guidance: omit phosphorus application to rice "
                "following wheat that received its recommended "
                "phosphorus dose."
            )
            self.matched_rules.append("PAU_RICE_AFTER_WHEAT_P")

        if self.farm.previous_crop_phosphorus_applied is None:
            self.warnings.append(
                "Previous crop phosphorus application is unknown. "
                "Do not assume that phosphorus was or was not applied."
            )

        if self.farm.manure_history:
            self.advisories.append(
                "Account for nutrients supplied by FYM, compost, "
                "press mud, green manure and other organic amendments "
                "before calculating mineral fertilizer requirements."
            )

        if self.farm.fertilizer_history:
            self.advisories.append(
                "Deduct nutrients already applied during this crop cycle "
                "before calculating any additional fertilizer requirement."
            )

    # --------------------------------------------------------
    # WEATHER AND APPLICATION TIMING
    # --------------------------------------------------------

    def _weather_rules(self):

        weather = self.farm.weather

        rain = weather.get("precipitation_probability")
        wind = weather.get("wind_speed")
        heavy_rain = weather.get("heavy_rain_expected")

        if heavy_rain is True or (
            isinstance(rain, (int, float)) and rain >= 70
        ):
            self.advisories.append(
                "Rain is expected. Review fertilizer application timing "
                "to reduce runoff, leaching and nutrient loss."
            )

        if isinstance(wind, (int, float)) and wind > 15:
            self.advisories.append(
                "Wind conditions may increase spray drift. Avoid pesticide "
                "spraying until conditions are suitable."
            )

        if weather.get("extreme_heat") is True:
            self.advisories.append(
                "Extreme heat conditions reported. Avoid unnecessary "
                "foliar applications and follow crop-specific guidance."
            )

        if weather.get("water_stress") is True:
            self.advisories.append(
                "Water stress reported. Confirm crop water status before "
                "applying fertilizers or foliar nutrients."
            )

    # --------------------------------------------------------
    # VERIFIED FERTILIZER RULES
    # --------------------------------------------------------

    def _rice_rules(self):

        variety = (self.farm.variety or "").strip().lower().replace(" ", "")
        soil = self.farm.soil

        # PAU Kharif 2026 nutrient rates in kg nutrient/acre.
        # These are baseline values, not fertilizer-product quantities.
        if variety == "pr132":
            nitrogen = 31.5
        else:
            nitrogen = 42

        phosphorus = None
        potassium = None

        if (
            (self.farm.previous_crop or "").lower() == "wheat"
            and self.farm.previous_crop_phosphorus_applied is True
        ):
            phosphorus = 0

        elif self._valid_status(soil.phosphorus_status) in {"low", "deficient"}:
            phosphorus = 12

        if self._valid_status(soil.potassium_status) in {"low", "deficient"}:
            potassium = 12

        return {
            "nutrients_kg_per_acre": {
                "N": nitrogen,
                "P2O5": phosphorus,
                "K2O": potassium,
            },
            "interpretation": (
                "PAU baseline for rice. Phosphorus and potassium are "
                "conditional on soil testing and cropping history. "
                "Nitrogen must be managed using the applicable PAU "
                "schedule and need-based LCC guidance."
            ),
            "source": PAU_SOURCE,
            "source_section": "Rice fertilizer management",
            "limitations": [
                "Confirm the variety and cultivation system.",
                "The rate is not a universal recommendation for all states.",
                "Soil-test interpretation is required for P and K.",
                "Do not treat missing soil-test data as proof of deficiency.",
            ],
        }

    
    def _maize_rules(self):
    
        variety = (self.farm.variety or "").strip().lower().replace(" ", "")
        soil = self.farm.soil
    
        high = {
            "pmh1", "pmh11", "pmh13", "pmh14", "pmh17",
            "nk7328", "dkc9144", "bioseed9788", "adv9293",
            "jc12", "punjabsweetcorn1",
        }
    
        low = {"pmh2", "jc4", "pearlpopcorn"}
    
        if variety in high:
            nitrogen, phosphorus, potassium = 50, 24, 12
        elif variety in low:
            nitrogen, phosphorus, potassium = 35, 12, 8
        else:
            return None
    
        previous_crop = (self.farm.previous_crop or "").strip().lower()
    
        # PAU: omit P when maize follows wheat that received
        # the recommended phosphorus dose.
        if (
            previous_crop == "wheat"
            and self.farm.previous_crop_phosphorus_applied is True
        ):
            phosphorus = 0
    
        # Do not infer a phosphorus dose from a categorical
        # soil status alone. The PAU soil-test recommendation
        # should be used when an actual laboratory result is available.
        elif self._valid_status(soil.phosphorus_status) in {
            "high", "very high", "excess"
        }:
            self.warnings.append(
                "Phosphorus status is reported as elevated. "
                "The categorical status is insufficient to calculate "
                "a revised dose. Obtain the actual soil-test result "
                "and apply the PAU soil-test recommendation."
            )
    
        # PAU: potassium only when soil testing indicates deficiency.
        if self._valid_status(soil.potassium_status) not in {
            "low", "deficient"
        }:
            potassium = None
    
        return {
            "nutrients_kg_per_acre": {
                "N": nitrogen,
                "P2O5": phosphorus,
                "K2O": potassium,
            },
            "interpretation": (
                "PAU baseline for the listed maize varieties, "
                "expressed as nutrient quantities per acre. "
                "Nitrogen is split between sowing, knee-high and "
                "pre-tasseling stages. Potassium is applied only "
                "when soil testing indicates deficiency. "
                "Phosphorus must be adjusted for cropping history "
                "and the actual soil-test recommendation."
            ),
            "source": PAU_SOURCE,
            "source_section": "Maize fertilizer management",
            "limitations": [
                "Confirm the exact variety and applicable PAU region.",
                "Account for DAP, nitrophosphate and other nutrient sources.",
                "Account for FYM, green manure and fish pond sediments.",
                "Use actual soil-test results to adjust phosphorus and potassium.",
                "The figures are nutrient quantities, not fertilizer-product quantities.",
            ],
        }
    

    def _fertilizer_recommendation(self):

        if self.crop == "rice":
            return self._rice_rules()

        if self.crop == "maize":
            return self._maize_rules()

        # Other crops are accepted by the engine, but numeric rates
        # must be added only after verifying the relevant local package.
        return None

    # --------------------------------------------------------
    # PESTICIDE SAFETY AND IPM
    # --------------------------------------------------------

    def _plant_protection_rules(self):

        prediction = self.farm.disease_prediction or {}
        pest_prediction = self.farm.pest_prediction or {}

        confidence = prediction.get("confidence")
        disease = prediction.get("disease")
        pest = pest_prediction.get("pest")

        if disease:
            if not isinstance(confidence, (int, float)) or not 0 <= confidence <= 1:
                self.warnings.append(
                    "Disease prediction confidence is missing or invalid."
                )
            elif confidence < 0.80:
                self.warnings.append(
                    "Disease prediction confidence is low. Obtain field "
                    "confirmation before selecting a treatment."
                )
            else:
                self.advisories.append(
                    f"Image model detected a possible condition: {disease}. "
                    "Confirm symptoms and diagnosis before treatment."
                )

        if pest:
            self.advisories.append(
                f"Possible pest detected: {pest}. Verify pest identity, "
                "population and economic threshold before treatment."
            )

        if self.farm.symptoms:
            self.advisories.append(
                "Farmer-reported symptoms should be checked against "
                "nutrient deficiency, water stress, disease, pests and "
                "herbicide injury before choosing an intervention."
            )

        self.advisories.extend([
            "Use integrated pest management: field monitoring, sanitation, "
            "resistant varieties, cultural and mechanical controls, and "
            "biological control where suitable.",
            "Do not prescribe a pesticide solely from an image classifier.",
            "A chemical recommendation requires an approved crop-target "
            "label, formulation, dose, waiting period and safety instructions.",
        ])

    # --------------------------------------------------------
    # MAIN EVALUATION
    # --------------------------------------------------------

    def evaluate(self):

        self._check_input_quality()
        self._soil_health_rules()
        self._cropping_history_rules()
        self._weather_rules()
        self._plant_protection_rules()

        fertilizer = self._fertilizer_recommendation()

        if fertilizer is None:
            fertilizer_status = "verified_rate_not_configured"
            self.warnings.append(
                f"No verified, location- and variety-specific numeric "
                f"fertilizer schedule is configured for {self.crop}. "
                "Do not use a generic dose. Add the applicable "
                "ICAR/State Agricultural University recommendation."
            )
        else:
            fertilizer_status = "conditional_baseline_available"

        # Convert nutrient quantities to farm totals only if safe to do so.
        if fertilizer and self.farm.land_size:
            if self.farm.land_unit.lower() != "acre":
                self.warnings.append(
                    "Farm-level nutrient totals are not calculated because "
                    "the configured rates are expressed per acre."
                )
            else:
                fertilizer["farm_total_nutrients_kg"] = {
                    nutrient: (
                        round(rate * self.farm.land_size, 2)
                        if rate is not None else None
                    )
                    for nutrient, rate in
                    fertilizer["nutrients_kg_per_acre"].items()
                }

        return {
            "crop": self.crop,
            "location": {
                "state": self.farm.state,
                "district": self.farm.district,
                "location": self.farm.location,
            },
            "crop_details": {
                "variety": self.farm.variety,
                "season": self.farm.season,
                "stage": self.farm.stage,
                "sowing_date": (
                    self.farm.sowing_date.isoformat()
                    if self.farm.sowing_date else None
                ),
            },
            "fertilizer_status": fertilizer_status,
            "fertilizer_recommendation": fertilizer,
            "plant_protection": {
                "status": "diagnosis_and_ipm_advisory",
                "chemical_prescription": None,
                "message": (
                    "No pesticide product or dose is prescribed without "
                    "a verified diagnosis and applicable registered label."
                ),
            },
            "advisories": list(dict.fromkeys(self.advisories)),
            "warnings": list(dict.fromkeys(self.warnings)),
            "missing_information": list(dict.fromkeys(self.missing_information)),
            "matched_rules": self.matched_rules,
            "requires_expert_confirmation": True,
            "disclaimer": (
                "Agricultural decision-support output. Numeric rates are "
                "conditional on the cited source and its region, variety, "
                "soil and crop-system assumptions. Confirm with the local "
                "Krishi Vigyan Kendra or agricultural extension officer."
            ),
        }
