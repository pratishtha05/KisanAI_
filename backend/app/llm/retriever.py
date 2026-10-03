from __future__ import annotations

import re
from dataclasses import dataclass
from functools import lru_cache
from typing import List, Optional

from .ingest import get_collection

CROP_GROUPS = {
    "wheat": ("wheat",),
    "rice": ("rice", "paddy"),
    "maize": ("maize", "corn"),
    "potato": ("potato",),
    "tomato": ("tomato",),
    "apple": ("apple",),
    "tea": ("tea",),
    "sugarcane": ("sugarcane",),
    "cassava": ("cassava",),
    "mustard": ("mustard",),
    "cotton": ("cotton",),
}

# Chunks are ~150 words (see ingest.py), i.e. roughly 1000 chars. The old limit (1200)
# combined with 500-word chunks silently cut most of every chunk off.
MAX_CHUNK_CHARS = 1500


def _trim(text: str, limit: int = MAX_CHUNK_CHARS) -> str:
    if len(text) <= limit:
        return text
    cut = text[:limit]
    # cut at the last sentence end, else the last space, never mid-word
    for sep in (". ", "\n", " "):
        i = cut.rfind(sep)
        if i > limit * 0.6:
            return cut[: i + 1].rstrip()
    return cut


# Words that mean "this is a government scheme / money question", not a crop question.
SCHEME_WORDS = (
    "scheme", "yojana", "subsid", "loan", "insurance", "bima", "pension", "msp",
    "pm-kisan", "pm kisan", "pmfby", "e-nam", "enam", "kisan credit", "kcc",
    "government", "sarkari", "eligib",
)


def detect_category(text: Optional[str]) -> Optional[str]:
    """'schemes' for scheme/finance questions, else None (= normal crop question).
    The category name must match the first folder under docs/ used at ingest time."""
    if not text:
        return None
    t = text.lower()
    return "schemes" if any(w in t for w in SCHEME_WORDS) else None


@dataclass
class Retrieved:
    text: str
    source: str
    similarity: float


@lru_cache(maxsize=1)
def _collection():
    return get_collection()


def knowledge_base_size() -> int:
    try:
        return _collection().count()
    except Exception:
        return 0


def detect_crop(text: Optional[str]) -> Optional[str]:
    """Return the canonical crop named in `text` ('Corn/Maize' -> 'maize')."""
    if not text:
        return None
    t = text.lower()
    for crop, words in CROP_GROUPS.items():
        if any(re.search(rf"\b{re.escape(w)}", t) for w in words):
            return crop
    return None


def _crops_in_path(source: str) -> set:
    tokens = [t for t in re.split(r"[^a-z]+", source.lower()) if t]
    return {
        c for c, words in CROP_GROUPS.items()
        if any(t.startswith(w) for t in tokens for w in words)
    }


def retrieve(
    question: str,
    farm_crop: Optional[str] = None,
    top_k: int = 3,
    min_similarity: float = 0.25,
    category: Optional[str] = None,
) -> List[Retrieved]:
    coll = _collection()
    if coll.count() == 0:
        return []

    q_crop = detect_crop(question)
    target_crop = q_crop or detect_crop(farm_crop)

    # A question like "when should I irrigate?" carries no crop signal, so
    # add the farmer's crop to the search text.
    search_text = question if q_crop or not farm_crop else f"{farm_crop}: {question}"

    n = max(top_k * 4, 10)
    res = None
    if category:
        # restrict to e.g. the schemes/ folder; metadata "category" is set by ingest.py
        res = coll.query(query_texts=[search_text], n_results=n, where={"category": category})
    if not res or not res["documents"] or not res["documents"][0]:
        category = None  # nothing in that category -> search the whole KB
        res = coll.query(query_texts=[search_text], n_results=n)
    if not res["documents"] or not res["documents"][0]:
        return []
    if category:
        min_similarity = min(min_similarity, 0.15)  # already filtered by category

    out: List[Retrieved] = []
    for chunk, meta, dist in zip(res["documents"][0], res["metadatas"][0], res["distances"][0]):
        source = (meta or {}).get("source", "unknown")
        similarity = 1.0 - float(dist)  # collection uses cosine distance

       
        path_crops = _crops_in_path(source)
        if target_crop and path_crops and target_crop not in path_crops:
            continue
        if similarity < min_similarity:
            continue

        out.append(Retrieved(text=_trim(chunk), source=source, similarity=similarity))
        if len(out) >= top_k:
            break
    return out
