
from datetime import date
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class SoilInput(BaseModel):
    ph: Optional[float] = Field(default=None, ge=0, le=14)
    ec: Optional[float] = Field(default=None, ge=0)
    organic_carbon_percent: Optional[float] = Field(default=None, ge=0, le=100)

    nitrogen_status: Optional[str] = None
    phosphorus_status: Optional[str] = None
    potassium_status: Optional[str] = None

    sulphur_status: Optional[str] = None
    zinc_status: Optional[str] = None
    iron_status: Optional[str] = None
    boron_status: Optional[str] = None

    laboratory_values: Dict[str, Any] = Field(default_factory=dict)
    laboratory_units: Dict[str, str] = Field(default_factory=dict)

    texture: Optional[str] = None
    soil_type: Optional[str] = None


class FertilizerRequest(BaseModel):
    # Additional farm and crop details not currently stored in the Farm model.
    state: Optional[str] = None
    district: Optional[str] = None
    location: Optional[str] = None

    variety: Optional[str] = None
    season: Optional[str] = None
    stage: Optional[str] = None

    # Supply land_size and land_unit together if farm-level
    # nutrient quantities are required.
    land_size: Optional[float] = Field(default=None, gt=0)
    land_unit: Optional[str] = None

    soil: SoilInput = Field(default_factory=SoilInput)

    previous_crop: Optional[str] = None
    previous_crop_phosphorus_applied: Optional[bool] = None

    fertilizer_history: List[Dict[str, Any]] = Field(default_factory=list)
    manure_history: List[Dict[str, Any]] = Field(default_factory=list)

    irrigation_type: Optional[str] = None
    irrigation_water_quality: Optional[str] = None

    symptoms: List[str] = Field(default_factory=list)
    pest_observations: List[str] = Field(default_factory=list)
    disease_observations: List[str] = Field(default_factory=list)

    disease_prediction: Optional[Dict[str, Any]] = None
    pest_prediction: Optional[Dict[str, Any]] = None
