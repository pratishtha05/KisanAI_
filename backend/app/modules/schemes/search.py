"""Search schemes by name, alias (including Hindi), topic keywords, or a question.

Deterministic and dependency-free: exact/alias hits rank first, then token
overlap on names/keywords/summary, with a fuzzy fallback for typos
('pm kisaan', 'fasal beema').
"""
from __future__ import annotations

import re
from difflib import SequenceMatcher
from typing import List, Tuple

from .dataset_models import Scheme

STOPWORDS = {
    "a", "an", "the", "is", "am", "i", "me", "my", "for", "of", "to", "in", "on", "and", "or", "do", "does",
    "can", "get", "how", "what", "which", "about", "tell", "scheme", "schemes", "yojana", "eligible",
    "eligibility", "apply", "application", "documents", "required", "details", "info", "information",
    "government", "govt", "farmer", "farmers", "any", "there", "are", "available", "want", "need", "should",
    "का", "की", "के", "है", "में", "से", "को", "योजना",
}


def tokens(text: str) -> List[str]:
    return [t for t in re.findall(r"[\w]+", text.lower()) if t not in STOPWORDS]


def _norm(text: str) -> str:
    return " ".join(re.findall(r"[\w]+", text.lower()))


def _fuzzy(a: str, b: str) -> float:
    return SequenceMatcher(None, a, b).ratio()


def score_scheme(s: Scheme, q_norm: str, q_tokens: List[str]) -> float:
    names = [_norm(s.name), _norm(s.short_name)] + [_norm(a) for a in s.aliases]
    score = 0.0
    # whole-phrase hits
    for n in names:
        if not n:
            continue
        if q_norm == n:
            score = max(score, 100)
        elif n in q_norm or (len(q_norm) >= 3 and q_norm in n):
            score = max(score, 90 if len(n) >= 3 else 0)
    if score >= 90:
        return score

    keyset = set()
    for k in s.keywords:
        keyset.update(tokens(k))
    nameset = set()
    for n in names:
        nameset.update(n.split())
    summary = set(tokens(s.summary))
    category = set(s.category.replace("_", " ").split())

    for t in q_tokens:
        if t in nameset:
            score += 22
        elif t in keyset:
            score += 18
        elif t in category:
            score += 10
        elif t in summary:
            score += 6
        else:
            best = max((_fuzzy(t, w) for w in nameset | keyset if len(w) > 3), default=0)
            if len(t) > 3 and best >= 0.82:
                score += 15
    # fuzzy whole-name match for typos in short queries
    if score < 40 and len(q_norm) >= 5:
        best = max((_fuzzy(q_norm, n) for n in names if n), default=0)
        if best >= 0.8:
            score = max(score, 70 * best)
    return min(score, 89.0)


def search(schemes: List[Scheme], query: str, limit: int = 20) -> List[Tuple[Scheme, float]]:
    q_norm = _norm(query)
    q_tokens = tokens(query)
    if not q_norm:
        return []
    scored = [(s, score_scheme(s, q_norm, q_tokens)) for s in schemes]
    scored = [(s, sc) for s, sc in scored if sc >= 15]
    scored.sort(key=lambda x: -x[1])
    return scored[:limit]
