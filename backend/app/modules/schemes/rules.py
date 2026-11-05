"""Three-valued rule evaluation: True / False / None (= unknown).

Unknown is propagated, never guessed: a rule whose input fact is missing is
'unknown', and only a rule whose input is KNOWN and fails can disqualify.
"""
from __future__ import annotations

from typing import Any, Dict, Optional

OPS = {"eq", "ne", "in", "not_in", "gt", "gte", "lt", "lte", "between",
       "contains_any", "contains_all", "is_true", "is_false"}


def _norm(x: Any) -> Any:
    return x.strip().lower() if isinstance(x, str) else x


def evaluate_check(check: Dict[str, Any], facts: Dict[str, Any]) -> Optional[bool]:
    if "any" in check:
        results = [evaluate_check(c, facts) for c in check["any"]]
        if any(r is True for r in results):
            return True
        return None if any(r is None for r in results) else False
    if "all" in check:
        results = [evaluate_check(c, facts) for c in check["all"]]
        if any(r is False for r in results):
            return False
        return None if any(r is None for r in results) else True

    op = check["op"]
    actual = facts.get(check["field"])
    expected = check.get("value")
    if actual is None:
        return None

    if op == "is_true":
        return actual is True
    if op == "is_false":
        return actual is False
    if op == "eq":
        return _norm(actual) == _norm(expected)
    if op == "ne":
        return _norm(actual) != _norm(expected)
    if op == "in":
        return _norm(actual) in [_norm(e) for e in expected]
    if op == "not_in":
        return _norm(actual) not in [_norm(e) for e in expected]
    if op in ("contains_any", "contains_all"):
        have = {_norm(x) for x in actual}
        want = [_norm(e) for e in expected]
        return any(w in have for w in want) if op == "contains_any" else all(w in have for w in want)
    if op == "gt":
        return actual > expected
    if op == "gte":
        return actual >= expected
    if op == "lt":
        return actual < expected
    if op == "lte":
        return actual <= expected
    if op == "between":
        return expected[0] <= actual <= expected[1]
    raise ValueError(f"unknown op {op!r}")


def collect_fields(check: Dict[str, Any]) -> set:
    """All fact names a check (possibly nested any/all) reads."""
    if "any" in check:
        return set().union(*(collect_fields(c) for c in check["any"])) if check["any"] else set()
    if "all" in check:
        return set().union(*(collect_fields(c) for c in check["all"])) if check["all"] else set()
    return {check["field"]}
