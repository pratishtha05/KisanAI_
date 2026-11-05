"""Turns a farmer's database records + the optional eligibility answers into a
flat dict of 'facts' that scheme rules are evaluated against.

A fact that is `None` means UNKNOWN (never "no"). Rules treat unknown
separately from false, so a missing answer can never wrongly disqualify a
farmer, and the UI can ask precisely for what is missing.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date
from typing import Any, Dict, List, Optional

ACRE_IN_HECTARES = 0.404686

# canonical crop -> broad types (a crop can have several)
CROP_TYPES = {
    "wheat": ["foodgrain"], "rice": ["foodgrain"], "maize": ["foodgrain"],
    "potato": ["vegetable", "horticulture"], "tomato": ["vegetable", "horticulture"],
    "apple": ["fruit", "horticulture"],
    "tea": ["plantation"],
    "sugarcane": ["commercial"], "cassava": ["commercial"],
}
# crop -> insurance/market seasons it is normally grown in ([] = perennial/unknown)
CROP_SEASONS = {
    "wheat": ["rabi"], "rice": ["kharif"], "maize": ["kharif", "rabi"],
    "potato": ["rabi"], "tomato": ["kharif", "rabi"],
}
CROP_ALIASES = {"corn": "maize", "corn/maize": "maize", "paddy": "rice"}

STATE_ALIASES = {
    "orissa": "Odisha", "uttaranchal": "Uttarakhand", "nct of delhi": "Delhi", "new delhi": "Delhi",
    "jammu & kashmir": "Jammu and Kashmir", "jammu and kashmir": "Jammu and Kashmir",
    "andaman & nicobar islands": "Andaman and Nicobar Islands",
    "dadra & nagar haveli and daman & diu": "Dadra and Nagar Haveli and Daman and Diu",
}


def normalize_crop(raw: Optional[str]) -> Optional[str]:
    if not raw:
        return None
    key = raw.strip().lower()
    if key in CROP_ALIASES:
        return CROP_ALIASES[key]
    words = re.findall(r"[a-z]+", key)
    for w in words:                       # "Corn/Maize" -> maize
        if w in CROP_ALIASES:
            return CROP_ALIASES[w]
    return words[0] if len(words) == 1 else (key or None)


def normalize_state(raw: Optional[str]) -> Optional[str]:
    if not raw or not raw.strip():
        return None
    key = " ".join(raw.strip().lower().split())
    if key in STATE_ALIASES:
        return STATE_ALIASES[key]
    return " ".join(w.capitalize() if w not in ("and", "of") else w for w in key.split())


def land_class(hectares: Optional[float]) -> Optional[str]:
    """Agricultural Census holding classes."""
    if hectares is None:
        return None
    if hectares < 1:
        return "marginal"
    if hectares < 2:
        return "small"
    if hectares < 4:
        return "semi_medium"
    if hectares < 10:
        return "medium"
    return "large"


@dataclass
class Facts:
    values: Dict[str, Any] = field(default_factory=dict)
    context: Dict[str, Any] = field(default_factory=dict)     # human-readable summary of what we used
    notes: List[str] = field(default_factory=list)

    def get(self, key: str) -> Any:
        return self.values.get(key)


def build_facts(profile, farms, answers: Optional[Dict[str, Any]], today: Optional[date] = None) -> Facts:
    """profile: FarmerProfile | None; farms: list[Farm]; answers: eligibility answers dict."""
    today = today or date.today()
    a = dict(answers or {})
    v: Dict[str, Any] = {}
    notes: List[str] = []

    v["state"] = normalize_state(getattr(profile, "state", None))
    v["district"] = getattr(profile, "district", None) or None

    # ---- farms -------------------------------------------------------------
    crops, stages = [], []
    for f in farms:
        c = normalize_crop(f.crop)
        if c and c not in crops:
            crops.append(c)
        if f.stage and f.stage not in stages:
            stages.append(f.stage)
    v["crops"] = crops or None
    v["crop_stages"] = stages or None
    types: List[str] = []
    for c in crops:
        for t in CROP_TYPES.get(c, []):
            if t not in types:
                types.append(t)
    v["crop_types"] = types or (None if not crops else [])
    v["has_farm"] = True if farms else None

    registered = sum(float(f.land_size or 0) for f in farms) if farms else None
    declared = a.get("total_land_acres")
    if declared is not None:
        acres = float(declared)
    else:
        acres = registered
        if registered is not None and len(farms) > 1:
            notes.append("We added up the land of all your crops. If the same land grows different crops in "
                         "different seasons, your real total is smaller; tell us your total land to be exact.")
    v["land_acres_total"] = acres
    v["land_hectares_total"] = round(acres * ACRE_IN_HECTARES, 3) if acres is not None else None
    v["land_class"] = land_class(v["land_hectares_total"])

    birth_year = a.get("birth_year")
    v["age"] = (today.year - int(birth_year)) if birth_year else None

    for key in ("gender", "social_category", "land_ownership", "land_owned_before_feb_2019",
                "income_tax_payer", "govt_employee_or_pensioner", "constitutional_post_holder",
                "registered_professional", "covered_by_nps_epfo_esic", "has_aadhaar", "has_bank_account",
                "aadhaar_linked_bank", "has_kcc", "has_farmer_id", "irrigation_source", "pump_type",
                "member_group"):
        v[key] = a.get(key)

    # An Aadhaar-linked account implies both a bank account and Aadhaar-seeding.
    if v.get("aadhaar_linked_bank") is True:
        v["has_bank_account"] = True
    if v.get("has_bank_account") is False:
        v["aadhaar_linked_bank"] = False

    ctx = {
        "state": v["state"], "district": v["district"], "crops": crops,
        "land_acres": acres, "land_class": v["land_class"],
        "land_source": "declared" if declared is not None else ("from your farms" if farms else None),
        "answered": sum(1 for k in QUESTION_KEYS if a.get(k) is not None),
        "total_questions": len(QUESTION_KEYS),
    }
    return Facts(values=v, context=ctx, notes=notes)


# Keys of the eligibility questions the farmer can answer (see questions.py for wording)
QUESTION_KEYS = [
    "gender", "birth_year", "social_category", "total_land_acres", "land_ownership",
    "land_owned_before_feb_2019", "irrigation_source", "pump_type",
    "income_tax_payer", "govt_employee_or_pensioner", "constitutional_post_holder",
    "registered_professional", "covered_by_nps_epfo_esic",
    "has_aadhaar", "has_bank_account", "aadhaar_linked_bank", "has_farmer_id", "has_kcc",
    "member_group",
]

# Every field a rule may reference (validated against the dataset on load)
KNOWN_FIELDS = {
    "state", "district", "crops", "crop_stages", "crop_types", "has_farm", "land_acres_total",
    "land_hectares_total", "land_class", "age",
    "gender", "social_category", "land_ownership", "land_owned_before_feb_2019", "income_tax_payer",
    "govt_employee_or_pensioner", "constitutional_post_holder", "registered_professional",
    "covered_by_nps_epfo_esic", "has_aadhaar", "has_bank_account", "aadhaar_linked_bank", "has_kcc",
    "has_farmer_id", "irrigation_source", "pump_type", "member_group",
}
