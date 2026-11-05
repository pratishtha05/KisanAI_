"""Typed models for the curated scheme dataset (app/knowledge/schemes/*.json).

The dataset is validated against these models when it is loaded, so a typo in a
JSON file fails loudly at startup (and in `python -m app.modules.schemes.validate`)
instead of silently giving a farmer wrong eligibility advice.
"""
from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field, field_validator

Level = Literal["central", "state"]
Availability = Literal["active", "limited", "closed"]
RuleKind = Literal["eligibility", "prerequisite"]
Category = Literal[
    "income_support", "insurance", "credit", "irrigation", "inputs", "machinery",
    "organic", "horticulture", "market", "pension", "soil", "registration",
]


class Rule(BaseModel):
    id: str
    label: str
    kind: RuleKind = "eligibility"          # eligibility = decides the verdict; prerequisite = a to-do (Aadhaar, bank...)
    check: Dict[str, Any]                   # {"field","op","value"} or {"any":[...]} / {"all":[...]}
    pass_text: str = ""
    fail_text: str = ""
    unknown_text: str = ""
    ask: Optional[str] = None               # profile question key (or "farm" / "profile") that resolves 'unknown'


class Eligibility(BaseModel):
    summary: List[str] = []
    rules: List[Rule] = []
    verify: List[str] = []                  # things only the office can confirm


class Tier(BaseModel):
    when: Dict[str, Any]
    text: str


class Adjust(BaseModel):
    when: Dict[str, Any]
    score: float
    reason: str


class Relevance(BaseModel):
    crops: List[str] = ["all"]
    base_priority: float = 50
    adjust: List[Adjust] = []


class Document(BaseModel):
    name: str
    required: bool = True
    note: str = ""


class Link(BaseModel):
    label: str
    url: str


class HowToApply(BaseModel):
    steps: List[str] = []
    online: List[Link] = []
    offline: List[str] = []


class Window(BaseModel):
    season: str
    label: str
    opens: Optional[str] = None             # "MM-DD"
    closes: str                             # "MM-DD"


class Deadline(BaseModel):
    type: Literal["rolling", "periodic", "info", "fixed", "seasonal"]
    text: str = ""
    approximate: bool = False
    closes: Optional[str] = None            # fixed: "YYYY-MM-DD"
    windows: List[Window] = []


class Helpline(BaseModel):
    label: str
    number: str


class Scheme(BaseModel):
    id: str
    name: str
    short_name: str
    aliases: List[str] = []
    level: Level
    states: List[str] = ["ALL"]
    category: Category
    status: Availability = "active"
    status_note: str = ""
    keywords: List[str] = []
    summary: str
    benefits: Dict[str, Any]
    eligibility: Eligibility
    benefit_tiers: List[Tier] = []
    relevance: Relevance = Relevance()
    documents: List[Document] = []
    how_to_apply: HowToApply = HowToApply()
    deadline: Deadline
    helpline: List[Helpline] = []
    official_url: Optional[str] = None
    last_verified: str
    sources: List[str] = []
    caveats: List[str] = []

    @field_validator("id")
    @classmethod
    def _slug(cls, v: str) -> str:
        if not v or any(c not in "abcdefghijklmnopqrstuvwxyz0123456789-" for c in v):
            raise ValueError("id must be a lowercase slug (a-z, 0-9, '-')")
        return v
