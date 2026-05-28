# beginning of LLM written Code, Model: GPT-5.2
"""Valuation summary generator.

Runs as part of the scrape supervisor loop. Source of truth is the DB.
"""

from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv


def run() -> None:
    repo_root = Path(__file__).resolve().parents[3]
    load_dotenv(repo_root / ".env")

    from backend.summary.worker import run as run_worker

    run_worker()


# end of LLM written Code
