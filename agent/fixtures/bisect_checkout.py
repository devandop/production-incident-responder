"""Find the first inflection in a live time series (Grafana or PostHog).

Write MCP results to a JSON file in the sandbox, then:

    python bisect_checkout.py timeseries.json

Each row:

    {"at": "2026-08-21T10:41:00Z", "error_rate": 0.12, "source": "grafana", "label": "checkout_error_ratio"}

`error_rate` may be a ratio (0–1) or, for PostHog, failed / (failed + succeeded)
in that bucket. Do not use the old canned deploy fixture.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path


THRESHOLD = 0.05


def inflection(history: list[dict]) -> dict:
    ordered = sorted(history, key=lambda row: row["at"])
    previous = None
    for row in ordered:
        rate = float(row.get("error_rate", 0))
        if rate > THRESHOLD:
            return {
                "inflection_at": row["at"],
                "error_rate": rate,
                "source": row.get("source"),
                "label": row.get("label"),
                "previous_at": None if previous is None else previous.get("at"),
                "previous_error_rate": None
                if previous is None
                else float(previous.get("error_rate", 0)),
            }
        previous = row
    return {"inflection_at": None, "note": "no bucket above 5% error rate"}


def main() -> None:
    path = Path(sys.argv[1] if len(sys.argv) > 1 else "timeseries.json")
    history = json.loads(path.read_text())
    if not isinstance(history, list):
        raise SystemExit("timeseries JSON must be a list of {at, error_rate, ...}")
    print(json.dumps(inflection(history), indent=2))


if __name__ == "__main__":
    main()
