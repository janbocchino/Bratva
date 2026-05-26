"""Shared helpers for the live-asset scrapers.

Three responsibilities:
  - locate the token assets in ``assets/*.json``
  - bootstrap their mirrors in ``assets/live/{ID}.json``
  - update one field in a mirror, atomically

Parallel scrapers may update different fields on the same mirror; per-asset locks
serialize writers so read-modify-write cycles do not clobber each other.
"""

from __future__ import annotations

import json
import os
import threading
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from backend.persistence.assets_data import ASSET_DATA_FIELDS, AssetsDataStore

# beginning of LLM written Code, Model: gpt-5.3-codex
_SCRAPE_DIR = Path(__file__).resolve().parent
_LIVE_DIR = _SCRAPE_DIR.parent
ASSETS_DIR = _LIVE_DIR.parent
LIVE_DIR = _LIVE_DIR

_asset_locks: dict[str, threading.Lock] = {}
_locks_registry_lock = threading.Lock()

# beginning of LLM written Code, Model: GPT-5.5
_repo_root = ASSETS_DIR.parent
_assets_data_store: AssetsDataStore | None = None


def _store() -> AssetsDataStore:
    global _assets_data_store
    if _assets_data_store is None:
        load_dotenv(_repo_root / ".env")
        from backend.constants import DATABASE_URL

        _assets_data_store = AssetsDataStore(DATABASE_URL, _repo_root)
    return _assets_data_store
# end of LLM written Code


def _lock_for_asset(asset_id: str) -> threading.Lock:
    with _locks_registry_lock:
        lock = _asset_locks.get(asset_id)
        if lock is None:
            lock = threading.Lock()
            _asset_locks[asset_id] = lock
        return lock


def list_token_assets() -> list[tuple[str, dict[str, Any]]]:
    """Return ``(asset_id, source_data)`` for every ``assets/*.json`` with kind=token.

    Sorted by asset id for stable iteration order. Files that fail to parse
    or are missing ``kind``/``assetId`` are skipped with a printed warning.
    """
    out: list[tuple[str, dict[str, Any]]] = []
    for asset_file in sorted(ASSETS_DIR.glob("*.json")):
        try:
            data = json.loads(asset_file.read_text(encoding="utf-8"))
        except (OSError, ValueError) as exc:
            print(f"[common] skipping {asset_file.name}: {exc}")
            continue
        if not isinstance(data, dict):
            continue
        if data.get("kind") != "token":
            continue
        aid = data.get("assetId")
        if not isinstance(aid, str):
            continue
        out.append((aid, data))
    return out


def ensure_live_copy(asset_id: str, source_data: dict[str, Any]) -> Path:
    """Create ``assets/live/{ID}.json`` from ``source_data`` if it doesn't exist."""
    live_path = LIVE_DIR / f"{asset_id}.json"
    with _lock_for_asset(asset_id):
        if not live_path.exists():
            live_path.write_text(
                json.dumps(source_data, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
    # beginning of LLM written Code, Model: GPT-5.5
    _store().bootstrap_missing_fields(asset_id, source_data)
    # end of LLM written Code
    return live_path


def update_live_field(asset_id: str, field: str, value: Any) -> None:
    """Read the live mirror, set one field, write atomically.

    The mirror must already exist (call ``ensure_live_copy`` first). The write
    goes through a sibling ``.tmp`` file plus ``os.replace`` so a crash mid-write
    cannot leave the JSON truncated.
    """
    live_path = LIVE_DIR / f"{asset_id}.json"
    with _lock_for_asset(asset_id):
        data = json.loads(live_path.read_text(encoding="utf-8"))
        data[field] = value
        tmp_path = live_path.with_suffix(live_path.suffix + ".tmp")
        tmp_path.write_text(
            json.dumps(data, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        os.replace(tmp_path, live_path)
    # beginning of LLM written Code, Model: GPT-5.5
    if field not in ASSET_DATA_FIELDS:
        print(f"[common] skipping assets_data append for non-feature field: {field}")
        return
    _store().append_field(asset_id, field, value)
    # end of LLM written Code
# end of LLM written Code
