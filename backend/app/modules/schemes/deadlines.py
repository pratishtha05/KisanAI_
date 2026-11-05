"""Work out what a scheme's deadline means for this farmer, today.

Seasonal windows (e.g. PMFBY Kharif closes ~31 Jul, Rabi ~31 Dec) are turned into
'open now / closes in N days / opens in N days' using today's date and the
seasons the farmer's crops are normally grown in. Dates in the dataset are
marked `approximate` where states set their own cut-offs.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import List, Optional

from .dataset_models import Deadline, Window

CLOSING_SOON_DAYS = 30
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


@dataclass
class DeadlineInfo:
    status: str                    # rolling | ongoing | check_locally | open | closing_soon | opens_later | closed
    label: str
    text: str = ""
    closes_on: Optional[str] = None
    days_left: Optional[int] = None
    opens_on: Optional[str] = None
    days_until_open: Optional[int] = None
    approximate: bool = False
    season: Optional[str] = None


def _md(s: str) -> tuple:
    m, d = s.split("-")
    return int(m), int(d)


def _fmt(d: date) -> str:
    return f"{d.day} {MONTHS[d.month - 1]}"


def _cycle(w: Window, today: date):
    """The (opens, closes) pair for the occurrence of this window that is current or next."""
    cm, cd = _md(w.closes)
    closes = date(today.year, cm, cd)
    if closes < today:
        closes = date(today.year + 1, cm, cd)
    if w.opens:
        om, od = _md(w.opens)
        opens = date(closes.year if (om, od) <= (cm, cd) else closes.year - 1, om, od)
    else:
        opens = None
    return opens, closes


def compute_deadline(d: Deadline, crop_seasons: List[str], today: date) -> DeadlineInfo:
    if d.type == "rolling":
        return DeadlineInfo("rolling", "Open all year", d.text)
    if d.type == "periodic":
        return DeadlineInfo("ongoing", "Open all year, paid in cycles", d.text)
    if d.type == "info":
        return DeadlineInfo("check_locally", "Dates set by your state or office", d.text)

    if d.type == "fixed" and d.closes:
        closes = date.fromisoformat(d.closes)
        left = (closes - today).days
        if left < 0:
            return DeadlineInfo("closed", f"Closed on {_fmt(closes)}", d.text, closes.isoformat(), left)
        st = "closing_soon" if left <= CLOSING_SOON_DAYS else "open"
        return DeadlineInfo(st, f"Closes {_fmt(closes)} ({left} days left)", d.text, closes.isoformat(), left)

    windows = [w for w in d.windows if not crop_seasons or w.season in crop_seasons] or list(d.windows)
    best = None
    for w in windows:
        opens, closes = _cycle(w, today)
        is_open = opens is None or opens <= today <= closes
        key = (0, (closes - today).days) if is_open else (1, (opens - today).days if opens else 999)
        if best is None or key < best[0]:
            best = (key, w, opens, closes, is_open)
    if best is None:
        return DeadlineInfo("check_locally", "Dates set by your state or office", d.text)

    _, w, opens, closes, is_open = best
    around = "around " if d.approximate else ""
    if is_open:
        left = (closes - today).days
        st = "closing_soon" if left <= CLOSING_SOON_DAYS else "open"
        label = f"{w.label} enrolment closes {around}{_fmt(closes)} ({left} days left)"
        return DeadlineInfo(st, label, d.text, closes.isoformat(), left,
                            opens.isoformat() if opens else None, None, d.approximate, w.season)
    until = (opens - today).days
    label = f"{w.label} enrolment opens {around}{_fmt(opens)} (in {until} days)"
    return DeadlineInfo("opens_later", label, d.text, closes.isoformat(), (closes - today).days,
                        opens.isoformat(), until, d.approximate, w.season)
