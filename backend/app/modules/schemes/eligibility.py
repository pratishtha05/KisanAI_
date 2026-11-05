"""Evaluate one scheme for one farmer.

Verdicts (about the DECIDING rules only, kind == "eligibility"):
  eligible      every deciding rule passes
  likely        nothing fails, at least half pass, some are still unknown
  need_info     nothing fails but fewer than half are confirmed
  not_eligible  at least one deciding rule definitely fails

Prerequisites (Aadhaar, bank account, Farmer ID...) never change the verdict.
They become 'things to do first'.
This is guidance based on the farmer's own answers, not an official decision;
the `verify` list names what only the office can confirm.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List

from .dataset_models import Rule, Scheme
from .questions import describe_ask
from .rules import evaluate_check

LABELS = {
    "eligible": "You look eligible",
    "likely": "You are likely eligible",
    "need_info": "Need a few details",
    "not_eligible": "Not eligible",
}


@dataclass
class RuleResult:
    id: str
    label: str
    kind: str
    result: str            # pass | fail | unknown
    message: str
    ask: Any = None


@dataclass
class Eligibility:
    status: str
    label: str
    passed: int
    failed: int
    unknown: int
    total: int
    rule_results: List[RuleResult] = field(default_factory=list)
    blockers: List[str] = field(default_factory=list)
    missing_info: List[Dict[str, Any]] = field(default_factory=list)
    action_items: List[Dict[str, Any]] = field(default_factory=list)
    tiers: List[str] = field(default_factory=list)


def _result_for(rule: Rule, facts: Dict[str, Any]) -> RuleResult:
    outcome = evaluate_check(rule.check, facts)
    if outcome is True:
        res, msg = "pass", rule.pass_text or rule.label
    elif outcome is False:
        res, msg = "fail", rule.fail_text or rule.label
    else:
        res, msg = "unknown", rule.unknown_text or f"We could not check: {rule.label}"
    return RuleResult(rule.id, rule.label, rule.kind, res, msg, describe_ask(rule.ask) if rule.ask else None)


def evaluate_scheme(scheme: Scheme, facts: Dict[str, Any]) -> Eligibility:
    results = [_result_for(r, facts) for r in scheme.eligibility.rules]
    deciding = [r for r in results if r.kind == "eligibility"]
    passed = sum(r.result == "pass" for r in deciding)
    failed = sum(r.result == "fail" for r in deciding)
    unknown = sum(r.result == "unknown" for r in deciding)
    total = len(deciding)

    if failed:
        status = "not_eligible"
    elif unknown == 0:
        status = "eligible"
    elif passed * 2 >= total:
        status = "likely"
    else:
        status = "need_info"

    missing, seen = [], set()
    for r in deciding:
        if r.result == "unknown" and r.ask and r.ask["field"] not in seen:
            seen.add(r.ask["field"])
            missing.append(r.ask)

    actions = []
    for r in results:
        if r.kind != "prerequisite" or r.result == "pass":
            continue
        actions.append({"id": r.id, "label": r.label, "state": "todo" if r.result == "fail" else "check",
                        "message": r.message, "ask": r.ask})

    tiers = [t.text for t in scheme.benefit_tiers if evaluate_check(t.when, facts) is True]
    blockers = [r.message for r in deciding if r.result == "fail"]

    return Eligibility(status=status, label=LABELS[status], passed=passed, failed=failed, unknown=unknown,
                       total=total, rule_results=results, blockers=blockers, missing_info=missing,
                       action_items=actions, tiers=tiers)
