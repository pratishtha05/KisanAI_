"""Encrypted storage for the farmer's eligibility answers."""
from __future__ import annotations

import json
import logging
from datetime import date
from typing import Any, Dict, Literal, Optional, Tuple

from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.core.crypto import ChatCryptoError, decrypt_text, encrypt_text
from app.models.scheme_profile import SchemeProfile

log = logging.getLogger("kisanai.schemes")
ROLE = "scheme_profile"          # bound into the AES-GCM associated data


class SchemeAnswers(BaseModel):
    """Every field optional: unanswered = unknown. Unknown keys are rejected."""
    model_config = ConfigDict(extra="forbid")

    gender: Optional[Literal["male", "female", "other"]] = None
    birth_year: Optional[int] = Field(default=None, ge=1920, le=date.today().year - 10)
    social_category: Optional[Literal["general", "obc", "sc", "st"]] = None
    total_land_acres: Optional[float] = Field(default=None, ge=0, le=5000)
    land_ownership: Optional[Literal["owner", "tenant", "sharecropper"]] = None
    land_owned_before_feb_2019: Optional[bool] = None
    irrigation_source: Optional[Literal["rainfed", "canal", "borewell_tubewell", "open_well", "river_pond"]] = None
    pump_type: Optional[Literal["none", "diesel", "grid_electric", "solar"]] = None
    income_tax_payer: Optional[bool] = None
    govt_employee_or_pensioner: Optional[bool] = None
    constitutional_post_holder: Optional[bool] = None
    registered_professional: Optional[bool] = None
    covered_by_nps_epfo_esic: Optional[bool] = None
    has_aadhaar: Optional[bool] = None
    has_bank_account: Optional[bool] = None
    aadhaar_linked_bank: Optional[bool] = None
    has_farmer_id: Optional[bool] = None
    has_kcc: Optional[bool] = None
    member_group: Optional[Literal["none", "shg", "fpo", "cooperative"]] = None


def load_answers(db: Session, user_id: int) -> Tuple[Dict[str, Any], Optional[str]]:
    """Returns (answers, problem). `problem` is set (and answers empty) if the stored
    data cannot be decrypted, so the caller can warn instead of crashing."""
    row = db.query(SchemeProfile).filter(SchemeProfile.user_id == user_id).first()
    if row is None:
        return {}, None
    try:
        data = json.loads(decrypt_text(user_id, ROLE, row.data_enc))
        return SchemeAnswers.model_validate(data).model_dump(exclude_none=True), None
    except (ChatCryptoError, ValueError) as exc:
        log.error("Could not read scheme answers for user %s: %s", user_id, exc)
        return {}, "Your saved answers could not be read. Please enter them again."


def save_answers(db: Session, user_id: int, answers: SchemeAnswers) -> Dict[str, Any]:
    """Replaces the stored answers. Raises ChatCryptoError if encryption is not configured."""
    clean = answers.model_dump(exclude_none=True)
    token = encrypt_text(user_id, ROLE, json.dumps(clean, separators=(",", ":")))
    row = db.query(SchemeProfile).filter(SchemeProfile.user_id == user_id).first()
    if row is None:
        db.add(SchemeProfile(user_id=user_id, data_enc=token))
    else:
        row.data_enc = token
    db.commit()
    return clean


def delete_answers(db: Session, user_id: int) -> bool:
    n = db.query(SchemeProfile).filter(SchemeProfile.user_id == user_id).delete(synchronize_session=False)
    db.commit()
    return bool(n)
