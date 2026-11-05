"""The eligibility questions a farmer can answer. The frontend renders its form
from this list (served by the API), so wording lives in exactly one place.

Every question is OPTIONAL. 'Not answered' means unknown, never 'no'.
"""
from __future__ import annotations

from typing import Any, Dict, List

YES_NO = [{"value": True, "label": "Yes"}, {"value": False, "label": "No"}]

SECTIONS = [
    {"id": "about", "title": "About you"},
    {"id": "land", "title": "Your land and water"},
    {"id": "family", "title": "Your family (for exclusion checks)"},
    {"id": "docs", "title": "Documents and bank"},
    {"id": "groups", "title": "Groups"},
]

QUESTIONS: List[Dict[str, Any]] = [
    {"key": "gender", "section": "about", "type": "choice", "label": "Gender",
     "options": [{"value": "male", "label": "Male"}, {"value": "female", "label": "Female"}, {"value": "other", "label": "Other"}]},
    {"key": "birth_year", "section": "about", "type": "number", "label": "Year of birth",
     "help": "Used for age limits (for example the pension scheme is for ages 18 to 40).", "min": 1920, "max": 2010},
    {"key": "social_category", "section": "about", "type": "choice", "label": "Social category",
     "help": "Some schemes give a higher subsidy to SC/ST farmers.",
     "options": [{"value": "general", "label": "General"}, {"value": "obc", "label": "OBC"},
                 {"value": "sc", "label": "SC"}, {"value": "st", "label": "ST"}]},

    {"key": "total_land_acres", "section": "land", "type": "number", "label": "Total land your family owns or farms (acres)",
     "help": "All plots together. Many schemes depend on total holding size.", "min": 0, "max": 5000},
    {"key": "land_ownership", "section": "land", "type": "choice", "label": "Is the land you farm owned or leased?",
     "options": [{"value": "owner", "label": "Owned by my family"}, {"value": "tenant", "label": "Leased / rented"},
                 {"value": "sharecropper", "label": "Sharecropping"}]},
    {"key": "land_owned_before_feb_2019", "section": "land", "type": "bool",
     "label": "Did your family own this land on 1 February 2019 (including land you later inherited)?",
     "help": "PM-KISAN uses this cut-off date.", "options": YES_NO},
    {"key": "irrigation_source", "section": "land", "type": "choice", "label": "How do you irrigate?",
     "options": [{"value": "rainfed", "label": "Rain only"}, {"value": "canal", "label": "Canal"},
                 {"value": "borewell_tubewell", "label": "Borewell / tubewell"}, {"value": "open_well", "label": "Open well"},
                 {"value": "river_pond", "label": "River / pond"}]},
    {"key": "pump_type", "section": "land", "type": "choice", "label": "What kind of irrigation pump do you use?",
     "options": [{"value": "none", "label": "No pump"}, {"value": "diesel", "label": "Diesel"},
                 {"value": "grid_electric", "label": "Electric (grid)"}, {"value": "solar", "label": "Solar"}]},

    {"key": "income_tax_payer", "section": "family", "type": "bool",
     "label": "Did you or anyone in your family (husband, wife, minor children) pay income tax last year?", "options": YES_NO},
    {"key": "govt_employee_or_pensioner", "section": "family", "type": "bool",
     "label": "Is anyone in your family a government officer/employee (serving or retired), or a pensioner getting ₹10,000+ a month?",
     "help": "Multi-Tasking Staff, Class IV and Group D employees do not count.", "options": YES_NO},
    {"key": "constitutional_post_holder", "section": "family", "type": "bool",
     "label": "Does anyone in your family hold, or has held, a constitutional post (for example Minister, MP, MLA, Mayor)?", "options": YES_NO},
    {"key": "registered_professional", "section": "family", "type": "bool",
     "label": "Is anyone in your family a registered, practising doctor, engineer, lawyer, chartered accountant or architect?", "options": YES_NO},
    {"key": "covered_by_nps_epfo_esic", "section": "family", "type": "bool",
     "label": "Are you a member of NPS, EPFO or ESIC?", "options": YES_NO},

    {"key": "has_aadhaar", "section": "docs", "type": "bool", "label": "Do you have an Aadhaar card?", "options": YES_NO},
    {"key": "has_bank_account", "section": "docs", "type": "bool", "label": "Do you have a bank account?", "options": YES_NO},
    {"key": "aadhaar_linked_bank", "section": "docs", "type": "bool", "label": "Is your bank account linked to Aadhaar?", "options": YES_NO},
    {"key": "has_farmer_id", "section": "docs", "type": "bool", "label": "Do you have a Farmer ID (Farmer Registry / AgriStack)?", "options": YES_NO},
    {"key": "has_kcc", "section": "docs", "type": "bool", "label": "Do you already have a Kisan Credit Card?", "options": YES_NO},

    {"key": "member_group", "section": "groups", "type": "choice", "label": "Are you a member of a farmer group?",
     "options": [{"value": "none", "label": "No"}, {"value": "shg", "label": "Self Help Group"},
                 {"value": "fpo", "label": "Farmer Producer Organisation"}, {"value": "cooperative", "label": "Cooperative / PACS"}]},
]

QUESTION_BY_KEY = {q["key"]: q for q in QUESTIONS}

# 'ask' values that are not profile questions
SPECIAL_ASKS = {
    "farm": {"label": "Add your farm (crop and land size) in Profile", "kind": "farm"},
    "profile": {"label": "Add your state in Profile", "kind": "profile"},
}


def describe_ask(key: str) -> Dict[str, Any]:
    if key in SPECIAL_ASKS:
        return {"field": key, **SPECIAL_ASKS[key]}
    q = QUESTION_BY_KEY.get(key)
    return {"field": key, "label": q["label"] if q else key, "kind": "question"}
