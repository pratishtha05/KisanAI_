"""API response models for the Government Scheme Assistant."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class EligibilityBrief(BaseModel):
    status: str                      # eligible | likely | need_info | not_eligible
    label: str
    passed: int
    failed: int
    unknown: int
    total: int


class DeadlineOut(BaseModel):
    status: str
    label: str
    text: str = ""
    closes_on: Optional[str] = None
    days_left: Optional[int] = None
    opens_on: Optional[str] = None
    days_until_open: Optional[int] = None
    approximate: bool = False
    season: Optional[str] = None


class SchemeSummary(BaseModel):
    id: str
    name: str
    short_name: str
    level: str
    states: List[str]
    category: str
    summary: str
    benefit_headline: str
    availability: str                # active | limited | closed
    status_note: str = ""
    eligibility: EligibilityBrief
    deadline: DeadlineOut
    tier: str                        # apply_now | consider | need_info | not_eligible | unavailable | other_state
    score: float = 0
    plan_ahead: bool = False
    why: List[str] = []
    blockers: List[str] = []
    missing_info: List[Dict[str, Any]] = []
    in_your_state: bool = True


class RuleResultOut(BaseModel):
    id: str
    label: str
    kind: str                        # eligibility | prerequisite
    result: str                      # pass | fail | unknown
    message: str
    ask: Optional[Dict[str, Any]] = None


class SchemeDetail(SchemeSummary):
    benefits: Dict[str, Any]
    eligibility_summary: List[str]
    rules: List[RuleResultOut]
    verify: List[str]
    action_items: List[Dict[str, Any]]
    benefit_tiers: List[str]
    documents: List[Dict[str, Any]]
    how_to_apply: Dict[str, Any]
    helpline: List[Dict[str, str]]
    official_url: Optional[str] = None
    sources: List[str]
    last_verified: str
    caveats: List[str]
    disclaimer: str


class ProfileSummary(BaseModel):
    answered: int
    total: int
    completeness: int
    context: Dict[str, Any]


class RecommendationsOut(BaseModel):
    analysis: Dict[str, Any]
    recommended: List[SchemeSummary]
    need_info: List[SchemeSummary]
    not_eligible: List[SchemeSummary]
    profile: ProfileSummary
    warnings: List[str] = []
    disclaimer: str
    dataset: Dict[str, Any]


class SearchOut(BaseModel):
    query: str
    results: List[SchemeSummary]


class AnswersOut(BaseModel):
    answers: Dict[str, Any]
    questions: List[Dict[str, Any]]
    sections: List[Dict[str, Any]]
    encryption_available: bool
    problem: Optional[str] = None
    completeness: int
