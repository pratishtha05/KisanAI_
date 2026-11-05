"""Ranks schemes for one farmer and writes the 'which one should I pick' analysis.

Scoring is deliberately simple and explainable (every point has a reason that is
shown to the farmer):

    score = base priority of the scheme (how broadly valuable it is)
          + verdict bonus      (eligible +15, likely +5, need_info -10)
          + local bonus        (state scheme that applies to the farmer's state +8)
          + crop fit           (+10 if it targets the farmer's crop, -20 if it targets other crops)
          + scheme-specific adjustments from the dataset (e.g. diesel pump -> solar pump +12)
          + deadline urgency   (closing within 30 days +12, window open +6, opens later -4)
          + availability       (limited -35)

Eligibility itself is decided by rules only (eligibility.py), never by the score.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Any, Dict, List, Optional

from .dataset_models import Scheme
from .deadlines import DeadlineInfo, compute_deadline
from .eligibility import Eligibility, evaluate_scheme
from .facts import CROP_SEASONS, Facts, normalize_state
from .rules import evaluate_check

APPLY_NOW_SCORE = 70
PLAN_AHEAD_DAYS = 45            # a window opening later than this is 'plan ahead'


@dataclass
class Evaluated:
    scheme: Scheme
    elig: Eligibility
    deadline: DeadlineInfo
    score: float
    tier: str                       # apply_now | consider | need_info | not_eligible | unavailable | other_state
    why: List[str] = field(default_factory=list)
    out_of_state: bool = False
    plan_ahead: bool = False        # window is still far off: worth knowing about, not worth doing today


def _crop_seasons(facts: Facts) -> List[str]:
    seasons: List[str] = []
    for c in facts.get("crops") or []:
        for s in CROP_SEASONS.get(c, []):
            if s not in seasons:
                seasons.append(s)
    return seasons


def _in_state(s: Scheme, state: Optional[str]) -> Optional[bool]:
    if "ALL" in s.states:
        return True
    if not state:
        return None
    return normalize_state(state) in {normalize_state(x) for x in s.states}


def evaluate_one(s: Scheme, facts: Facts, today: date) -> Evaluated:
    f = facts.values
    elig = evaluate_scheme(s, f)
    dl = compute_deadline(s.deadline, _crop_seasons(facts), today)
    in_state = _in_state(s, f.get("state"))
    out_of_state = in_state is False

    score = s.relevance.base_priority
    why: List[str] = []

    score += {"eligible": 15, "likely": 5, "need_info": -10, "not_eligible": 0}[elig.status]
    if s.level == "state" and in_state:
        score += 8
        why.append(f"This is a {', '.join(s.states)} government scheme for your state.")

    targets = [c for c in s.relevance.crops if c != "all"]
    crops = f.get("crops") or []
    if targets and crops:
        if set(targets) & set(crops):
            score += 10
            why.append("It is meant for crops like yours.")
        else:
            score -= 20

    for a in s.relevance.adjust:
        if evaluate_check(a.when, f) is True:
            score += a.score
            if a.score > 0:
                why.append(a.reason + ".")

    if dl.status == "closing_soon":
        score += 12
    elif dl.status == "open":
        score += 6
    plan_ahead = dl.status == "opens_later" and (dl.days_until_open or 0) > PLAN_AHEAD_DAYS
    if dl.status == "opens_later":
        score -= 25 if plan_ahead else 4
    if dl.status in ("closing_soon", "open"):
        why.append(dl.label + ".")
    elif plan_ahead:
        why.append("Plan ahead: " + dl.label[0].lower() + dl.label[1:] + ".")

    if s.status == "limited":
        score -= 35
    score = max(0.0, round(score, 1))   # not capped: keeps the ranking order among strong matches

    # passed deciding rules are the most concrete 'why it fits'
    for r in elig.rule_results:
        if r.kind == "eligibility" and r.result == "pass" and r.id not in ("has_land", "has_farm"):
            why.insert(0, r.message)
    why.extend(elig.tiers)

    if s.status == "closed":
        tier = "unavailable"
    elif out_of_state:
        tier = "other_state"
    elif elig.status == "not_eligible":
        tier = "not_eligible"
    elif elig.status == "need_info" or (s.level == "state" and in_state is None):
        tier = "need_info"            # never say "apply now" for a state scheme before we know the farmer's state
    elif plan_ahead:
        tier = "consider"
    elif score >= APPLY_NOW_SCORE or (dl.status == "closing_soon" and elig.status == "eligible"):
        tier = "apply_now"
    else:
        tier = "consider"

    seen, uniq = set(), []
    for w in why:
        if w and w not in seen:
            seen.add(w)
            uniq.append(w)
    return Evaluated(s, elig, dl, score, tier, uniq[:5], out_of_state, plan_ahead)


def evaluate_all(schemes: List[Scheme], facts: Facts, today: Optional[date] = None) -> List[Evaluated]:
    today = today or date.today()
    out = [evaluate_one(s, facts, today) for s in schemes]
    out.sort(key=lambda e: (-e.score, e.scheme.name))
    return out


def _headline_benefit(s: Scheme) -> str:
    return str(s.benefits.get("headline", ""))


def _next_step(e: Evaluated) -> str:
    todo = [a for a in e.elig.action_items if a["state"] == "todo"]
    if todo:
        return f"Before you apply: {todo[0]['label'].rstrip('.')}."
    steps = e.scheme.how_to_apply.steps
    return steps[0] if steps else ""


def _caution(e: Evaluated) -> Optional[str]:
    if e.scheme.status == "limited" and e.scheme.status_note:
        return e.scheme.status_note
    if e.elig.status == "likely" and e.elig.missing_info:
        return "Answer " + ("one more question" if len(e.elig.missing_info) == 1
                            else f"{len(e.elig.missing_info)} more questions") + " to confirm this."
    return e.scheme.eligibility.verify[0] if e.scheme.eligibility.verify else None


def build_analysis(evals: List[Evaluated], facts: Facts, today: Optional[date] = None) -> Dict[str, Any]:
    today = today or date.today()
    recommended = [e for e in evals if e.tier in ("apply_now", "consider")]
    needs = [e for e in evals if e.tier == "need_info"]
    not_elig = [e for e in evals if e.tier == "not_eligible"]
    counts = {
        "apply_now": sum(e.tier == "apply_now" for e in evals),
        "consider": sum(e.tier == "consider" for e in evals),
        "need_info": len(needs),
        "not_eligible": len(not_elig),
        "other_state": sum(e.tier == "other_state" for e in evals),
    }

    top = recommended[:3]
    top_picks = [{
        "id": e.scheme.id, "name": e.scheme.short_name, "full_name": e.scheme.name,
        "benefit": _headline_benefit(e.scheme), "verdict": e.elig.label, "why": e.why[:4],
        "next_step": _next_step(e), "deadline": e.deadline.label if e.deadline.status in
        ("open", "closing_soon", "opens_later", "closed") else None,
        "caution": _caution(e),
    } for e in top]

    deadlines = sorted(
        [{"id": e.scheme.id, "name": e.scheme.short_name, "label": e.deadline.label,
          "days_left": e.deadline.days_left, "status": e.deadline.status}
         for e in recommended + needs
         if e.deadline.status == "closing_soon" or (e.deadline.status == "open" and (e.deadline.days_left or 999) <= 90)],
        key=lambda d: d["days_left"] if d["days_left"] is not None else 999)

    do_first, seen = [], set()
    for e in top:
        for a in e.elig.action_items:
            if a["state"] == "todo" and a["id"] not in seen:
                seen.add(a["id"])
                do_first.append({"label": a["label"], "message": a["message"], "for": e.scheme.short_name})
    do_first = do_first[:4]

    unlock: Dict[str, Dict[str, Any]] = {}
    for e in needs + recommended:
        for m in e.elig.missing_info:
            u = unlock.setdefault(m["field"], {**m, "unlocks": []})
            if e.scheme.short_name not in u["unlocks"]:
                u["unlocks"].append(e.scheme.short_name)
    unlock_list = sorted(unlock.values(), key=lambda u: -len(u["unlocks"]))[:6]

    ctx = facts.context
    if not ctx.get("crops") and not ctx.get("state"):
        headline = "Add your farm and location in Profile so we can match schemes to you."
    else:
        n = len(recommended)
        parts = []
        if n:
            parts.append(f"{n} scheme{'s' if n != 1 else ''} look like a good fit for you.")
            first = top_picks[0]
            parts.append(f"Start with {first['name']}: {first['benefit']}.")
        else:
            parts.append("We could not confirm any scheme for you yet.")
        watch = [e for e in needs if e.score >= 70 and e.elig.missing_info]
        if watch:
            w = watch[0]
            k = len(w.elig.missing_info)
            parts.append(f"{w.scheme.short_name} ({_headline_benefit(w.scheme)}) may also apply: "
                         f"answer {k} question{'s' if k != 1 else ''} to check.")
        if deadlines:
            d = deadlines[0]
            parts.append(f"Time-sensitive: {d['label']} ({d['name']}).")
        if unlock_list and (needs or any(e.elig.missing_info for e in recommended)):
            total_unlocked = len({n for u in unlock_list for n in u["unlocks"]})
            parts.append(f"Answer a few questions to confirm or unlock {total_unlocked} more.")
        headline = " ".join(parts)

    return {
        "headline": headline, "top_picks": top_picks, "upcoming_deadlines": deadlines[:5],
        "do_first": do_first, "unlock": unlock_list, "counts": counts, "notes": facts.notes,
    }
