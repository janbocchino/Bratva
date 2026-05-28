"""Concurrent supervisor: runs all due scrapers in one tick in parallel.

Run with ``uv run python -m assets.live.scrape``. Cadence lives in
``assets/live/scrape/config.py``; restart to pick up changes. Last-run timestamps
persist in ``assets/live/scrape/.last_run.json``.

## Decision questionnaire

What concurrency model for I/O-bound sync scrapers?

- [x] ``ThreadPoolExecutor`` — minimal change; scrapers stay sync; combine with
      per-asset locks in ``common`` for safe JSON updates.
- [ ] ``asyncio`` — would require async ports for httpx/requests paths.
- [ ] Separate OS processes — heavier; unnecessary here.
"""

from __future__ import annotations

import json
import time
import traceback
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Callable

# beginning of LLM written Code, Model: gpt-5.3-codex
from assets.live.scrape import config
from assets.live.scrape import extended_associations as extended_associations_mod
from assets.live.scrape import followers as followers_mod
from assets.live.scrape import news as news_mod
from assets.live.scrape import scrapeForbes as scrapeForbes_mod
from assets.live.scrape import valuation_summary as valuation_summary_mod

SCRAPERS: dict[str, Callable[[], None]] = {
    "news": news_mod.run,
    "followers_v2": followers_mod.run,
    "scrapeForbes_v2": scrapeForbes_mod.run,
    "extended_associations_v2": extended_associations_mod.run,
    "valuation_summary": valuation_summary_mod.run,
}

LAST_RUN_PATH = Path(__file__).resolve().parent / ".last_run.json"
TICK_SECONDS = 60


def _load_last_run() -> dict[str, float]:
    if not LAST_RUN_PATH.exists():
        return {}
    try:
        return json.loads(LAST_RUN_PATH.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def _write_last_run(last: dict[str, float]) -> None:
    LAST_RUN_PATH.write_text(json.dumps(last, indent=2), encoding="utf-8")


def main() -> None:
    last = _load_last_run()
    print(f"[supervisor] starting; intervals={config.INTERVALS_SECONDS}")
    while True:
        now = time.time()
        due: list[tuple[str, Callable[[], None]]] = []
        for name, fn in SCRAPERS.items():
            interval = config.INTERVALS_SECONDS[name]
            if now - last.get(name, 0.0) >= interval:
                due.append((name, fn))

        if due:
            print(f"[supervisor] running in parallel: {[n for n, _ in due]}")
            with ThreadPoolExecutor(max_workers=len(due)) as pool:
                future_to_name = {pool.submit(fn): name for name, fn in due}
                for fut in as_completed(future_to_name):
                    name = future_to_name[fut]
                    try:
                        fut.result()
                        last[name] = time.time()
                    except Exception:
                        traceback.print_exc()
            _write_last_run(last)

        time.sleep(TICK_SECONDS)
# end of LLM written Code
