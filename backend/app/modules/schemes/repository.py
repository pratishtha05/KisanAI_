"""Loads and validates the scheme dataset (one JSON file per scheme)."""
from __future__ import annotations

import json
import logging
from functools import lru_cache
from pathlib import Path
from typing import Dict, List, Optional

from .dataset_models import Scheme
from .facts import KNOWN_FIELDS
from .questions import QUESTION_BY_KEY, SPECIAL_ASKS
from .rules import OPS, collect_fields

log = logging.getLogger("kisanai.schemes")
DATA_DIR = Path(__file__).resolve().parents[2] / "knowledge" / "schemes"


class DatasetError(Exception):
    pass


def _check_nodes(check, where: str, problems: List[str]) -> None:
    if "any" in check or "all" in check:
        for c in check.get("any", []) + check.get("all", []):
            _check_nodes(c, where, problems)
        return
    if check.get("op") not in OPS:
        problems.append(f"{where}: unknown op {check.get('op')!r}")
    if check.get("field") not in KNOWN_FIELDS:
        problems.append(f"{where}: unknown field {check.get('field')!r}")


def validate_scheme(s: Scheme) -> List[str]:
    """Semantic checks beyond the pydantic types. Returns a list of problems."""
    p: List[str] = []
    ids = set()
    for r in s.eligibility.rules:
        where = f"{s.id}/rule:{r.id}"
        if r.id in ids:
            p.append(f"{where}: duplicate rule id")
        ids.add(r.id)
        _check_nodes(r.check, where, p)
        if r.ask and r.ask not in QUESTION_BY_KEY and r.ask not in SPECIAL_ASKS:
            p.append(f"{where}: ask={r.ask!r} is not a known question")
        if not r.fail_text and r.kind == "eligibility":
            p.append(f"{where}: eligibility rule needs fail_text")
    for i, t in enumerate(s.benefit_tiers):
        _check_nodes(t.when, f"{s.id}/tier[{i}]", p)
    for i, a in enumerate(s.relevance.adjust):
        _check_nodes(a.when, f"{s.id}/adjust[{i}]", p)
    if s.level == "state" and s.states == ["ALL"]:
        p.append(f"{s.id}: a state-level scheme must list its states")
    if s.deadline.type == "seasonal" and not s.deadline.windows:
        p.append(f"{s.id}: seasonal deadline needs windows")
    if s.deadline.type == "fixed" and not s.deadline.closes:
        p.append(f"{s.id}: fixed deadline needs 'closes'")
    if not s.sources:
        p.append(f"{s.id}: at least one source URL is required")
    if not s.documents:
        p.append(f"{s.id}: documents list is empty")
    if not s.how_to_apply.steps:
        p.append(f"{s.id}: how_to_apply.steps is empty")
    return p


def load_dir(path: Path = DATA_DIR) -> Dict[str, Scheme]:
    schemes: Dict[str, Scheme] = {}
    problems: List[str] = []
    for f in sorted(path.glob("*.json")):
        try:
            s = Scheme.model_validate(json.loads(f.read_text(encoding="utf-8")))
        except Exception as exc:                                       # noqa: BLE001
            problems.append(f"{f.name}: {exc}")
            continue
        if s.id != f.stem:
            problems.append(f"{f.name}: id {s.id!r} must match the file name")
        if s.id in schemes:
            problems.append(f"{f.name}: duplicate id {s.id!r}")
        problems += validate_scheme(s)
        schemes[s.id] = s
    if problems:
        raise DatasetError("Scheme dataset is invalid:\n  - " + "\n  - ".join(problems))
    return schemes


@lru_cache(maxsize=1)
def _cached() -> Dict[str, Scheme]:
    data = load_dir()
    log.info("Loaded %d schemes", len(data))
    return data


def all_schemes() -> List[Scheme]:
    return list(_cached().values())


def get_scheme(scheme_id: str) -> Optional[Scheme]:
    return _cached().get(scheme_id)


def reload() -> None:
    _cached.cache_clear()
