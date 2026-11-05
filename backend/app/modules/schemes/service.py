"""Builds API payloads: loads the farmer's data, runs the engine, shapes the output."""
from __future__ import annotations

from datetime import date
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.core.crypto import ChatCryptoError, encrypt_text
from app.models.farm import Farm
from app.models.farmer_profile import FarmerProfile
from app.models.user import User

from . import repository
from .facts import QUESTION_KEYS, Facts, build_facts
from .profile_store import load_answers
from .questions import QUESTIONS, SECTIONS
from .recommender import Evaluated, build_analysis, evaluate_all, evaluate_one
from .search import search as run_search

DISCLAIMER = ("This guide is based on the answers you gave and on published scheme rules. It is not an official "
              "decision. Amounts, dates and rules change, and states add their own conditions, so confirm with the "
              "scheme office or portal before you apply or spend money.")


def crypto_ready() -> bool:
    try:
        encrypt_text(0, "probe", "x")
        return True
    except ChatCryptoError:
        return False


def load_facts(db: Session, user: User, today: Optional[date] = None) -> Tuple[Facts, Optional[str]]:
    farms = db.query(Farm).filter(Farm.user_id == user.id).order_by(Farm.id).all()
    profile = db.query(FarmerProfile).filter(FarmerProfile.user_id == user.id).first()
    answers, problem = load_answers(db, user.id)
    return build_facts(profile, farms, answers, today), problem


def _summary(e: Evaluated) -> Dict[str, Any]:
    s = e.scheme
    return {
        "id": s.id, "name": s.name, "short_name": s.short_name, "level": s.level, "states": s.states,
        "category": s.category, "summary": s.summary, "benefit_headline": str(s.benefits.get("headline", "")),
        "availability": s.status, "status_note": s.status_note,
        "eligibility": {"status": e.elig.status, "label": e.elig.label, "passed": e.elig.passed,
                        "failed": e.elig.failed, "unknown": e.elig.unknown, "total": e.elig.total},
        "deadline": {k: getattr(e.deadline, k) for k in (
            "status", "label", "text", "closes_on", "days_left", "opens_on", "days_until_open", "approximate", "season")},
        "tier": e.tier, "score": e.score, "plan_ahead": e.plan_ahead, "why": e.why,
        "blockers": e.elig.blockers, "missing_info": e.elig.missing_info, "in_your_state": not e.out_of_state,
    }


def _detail(e: Evaluated) -> Dict[str, Any]:
    s = e.scheme
    d = _summary(e)
    d.update({
        "benefits": s.benefits,
        "eligibility_summary": s.eligibility.summary,
        "rules": [{"id": r.id, "label": r.label, "kind": r.kind, "result": r.result, "message": r.message,
                   "ask": r.ask} for r in e.elig.rule_results],
        "verify": s.eligibility.verify,
        "action_items": e.elig.action_items,
        "benefit_tiers": e.elig.tiers,
        "documents": [doc.model_dump() for doc in s.documents],
        "how_to_apply": s.how_to_apply.model_dump(),
        "helpline": [h.model_dump() for h in s.helpline],
        "official_url": s.official_url, "sources": s.sources, "last_verified": s.last_verified,
        "caveats": s.caveats, "disclaimer": DISCLAIMER,
    })
    return d


def _completeness(facts: Facts) -> Dict[str, Any]:
    ctx = facts.context
    answered, total = ctx["answered"], ctx["total_questions"]
    return {"answered": answered, "total": total, "completeness": round(100 * answered / total) if total else 0,
            "context": {k: ctx[k] for k in ("state", "district", "crops", "land_acres", "land_class", "land_source")}}


def recommendations(facts: Facts, problem: Optional[str], today: Optional[date] = None) -> Dict[str, Any]:
    today = today or date.today()
    schemes = repository.all_schemes()
    evals = evaluate_all(schemes, facts, today)
    analysis = build_analysis(evals, facts, today)
    pick = lambda *tiers: [_summary(e) for e in evals if e.tier in tiers]       # noqa: E731
    oldest = min(s.last_verified for s in schemes)
    warnings = [problem] if problem else []
    return {
        "analysis": analysis,
        "recommended": pick("apply_now", "consider"),
        "need_info": pick("need_info"),
        "not_eligible": pick("not_eligible"),
        "profile": _completeness(facts), "warnings": warnings, "disclaimer": DISCLAIMER,
        "dataset": {"count": len(schemes), "oldest_verified": oldest},
    }


def catalog(facts: Facts, category: Optional[str], include_other_states: bool, today: Optional[date] = None):
    today = today or date.today()
    evals = evaluate_all(repository.all_schemes(), facts, today)
    out = []
    for e in evals:
        if category and e.scheme.category != category:
            continue
        if e.out_of_state and not include_other_states:
            continue
        out.append(_summary(e))
    return out


def search(facts: Facts, query: str, today: Optional[date] = None):
    today = today or date.today()
    hits = run_search(repository.all_schemes(), query)
    return [_summary(evaluate_one(s, facts, today)) for s, _ in hits]


def detail(facts: Facts, scheme_id: str, today: Optional[date] = None) -> Optional[Dict[str, Any]]:
    s = repository.get_scheme(scheme_id)
    if s is None:
        return None
    return _detail(evaluate_one(s, facts, today or date.today()))


def questions_payload() -> Dict[str, Any]:
    return {"questions": QUESTIONS, "sections": SECTIONS}


def completeness_of(answers: Dict[str, Any]) -> int:
    n = sum(1 for k in QUESTION_KEYS if answers.get(k) is not None)
    return round(100 * n / len(QUESTION_KEYS))
