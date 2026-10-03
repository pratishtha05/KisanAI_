from __future__ import annotations

import re
from typing import Dict, List, Optional

_LABEL = re.compile(
    r"(?im)^[\s*#>_-]*(recommendation|why|actions?|what to do|watch\s*out|keep an eye on)\s*[:\-–—]\s*"
)

_FIELD = {
    "recommendation": "recommendation",
    "why": "reason",
    "action": "actions",
    "actions": "actions",
    "what to do": "actions",
    "watch out": "watch_out",
    "keep an eye on": "watch_out",
}

NO_ANSWER = "I could not find enough information to answer this safely."


def _clean(s: str) -> str:
    return re.sub(r"\s+", " ", s.replace("**", "")).strip(" \n\t*_")


def _split_actions(block: str) -> List[str]:
    items = []
    for line in block.splitlines():
        line = re.sub(r"^\s*(?:[-*•●]|\d+[.)])\s*", "", line).strip()
        line = _clean(line)
        if line:
            items.append(line)
    return items[:5]


def parse_advice(text: str) -> Dict:
    text = (text or "").strip()
    matches = list(_LABEL.finditer(text))
    fields: Dict[str, str] = {}

    for i, m in enumerate(matches):
        key = _FIELD[re.sub(r"\s+", " ", m.group(1).lower())]
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        fields.setdefault(key, text[m.end():end].strip())

    if "recommendation" in fields:
        recommendation = _clean(fields["recommendation"])
        reason = _clean(fields.get("reason", ""))
        actions = _split_actions(fields.get("actions", ""))
        watch: Optional[str] = _clean(fields.get("watch_out", "")) or None
    else:
        flat = _clean(text)
        parts = re.split(r"(?<=[.!?])\s+", flat, maxsplit=1)
        recommendation = parts[0] if flat else ""
        reason = parts[1] if len(parts) > 1 else ""
        actions, watch = [], None

    if watch and re.fullmatch(r"(none|n/?a|nothing|no)\.?", watch.strip(), re.I):
        watch = None

    return {
        "recommendation": recommendation or NO_ANSWER,
        "reason": reason or "",
        "actions": actions,
        "watch_out": watch,
    }
