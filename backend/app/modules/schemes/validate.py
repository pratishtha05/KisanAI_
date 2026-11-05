"""Validate the scheme dataset.

    python -m app.modules.schemes.validate

Run it after editing any file in app/knowledge/schemes/. It checks structure,
rule fields/operators, question keys, sources, and warns about stale entries.
"""
from __future__ import annotations

import sys
from datetime import date, datetime

from .repository import DatasetError, load_dir

STALE_DAYS = 120


def main() -> int:
    try:
        schemes = load_dir()
    except DatasetError as exc:
        print(exc)
        return 1
    today = date.today()
    print(f"OK: {len(schemes)} schemes valid")
    stale = []
    for s in schemes.values():
        age = (today - datetime.strptime(s.last_verified, "%Y-%m-%d").date()).days
        if age > STALE_DAYS:
            stale.append((s.id, age))
        print(f"  {s.id:22s} {s.level:8s} {s.status:8s} verified {s.last_verified}")
    if stale:
        print("\nWARNING: re-verify these (benefit amounts and deadlines change):")
        for sid, age in stale:
            print(f"  {sid}: {age} days old")
    return 0


if __name__ == "__main__":
    sys.exit(main())
