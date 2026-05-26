# beginning of LLM written Code, Model: GPT-5.5
"""SQLite persistence for append-only asset feature data."""

from __future__ import annotations

import json
import sqlite3
import threading
import time
from pathlib import Path
from typing import Any, Final

from backend.persistence.model_price import _sqlite_path

ASSET_DATA_FIELDS: Final[tuple[str, ...]] = (
    "occupation",
    "citizenship",
    "net_worth",
    "social_media_followers",
    "associations",
    "news_headlines",
    "age",
)


class AssetsDataStore:
    def __init__(self, database_url: str, repo_root: Path):
        self.database_path = _sqlite_path(database_url, repo_root)
        if not self.database_path.exists():
            raise FileNotFoundError(
                f"SQLite database not found at {self.database_path}; run migrations before scraping"
            )
        self._connections = threading.local()

    def _connection(self) -> sqlite3.Connection:
        conn = getattr(self._connections, "connection", None)
        if conn is None:
            conn = sqlite3.connect(str(self.database_path), timeout=30.0)
            conn.execute("PRAGMA journal_mode=WAL")
            self._connections.connection = conn
        return conn

    def append_field(self, ticker: str, field: str, value: Any) -> bool:
        if field not in ASSET_DATA_FIELDS:
            raise ValueError(f"unknown assets_data field: {field!r}")

        connection = self._connection()
        asset_row = connection.execute(
            "SELECT id FROM assets WHERE ticker = ? LIMIT 1",
            (ticker.strip().lower(),),
        ).fetchone()
        if asset_row is None:
            print(f"[assets_data] skipping append for unknown ticker: {ticker}")
            return False

        with connection:
            connection.execute(
                "INSERT INTO assets_data (asset_id, field, value, created_at) VALUES (?, ?, ?, ?)",
                (
                    int(asset_row[0]),
                    field,
                    json.dumps(value, ensure_ascii=False),
                    int(time.time() * 1000),
                ),
            )
        return True

    def bootstrap_missing_fields(self, ticker: str, source: dict[str, Any]) -> int:
        connection = self._connection()
        asset_row = connection.execute(
            "SELECT id FROM assets WHERE ticker = ? LIMIT 1",
            (ticker.strip().lower(),),
        ).fetchone()
        if asset_row is None:
            print(f"[assets_data] skipping bootstrap for unknown ticker: {ticker}")
            return 0

        asset_id = int(asset_row[0])
        inserted = 0
        now_ms = int(time.time() * 1000)
        with connection:
            for field in ASSET_DATA_FIELDS:
                if field not in source:
                    continue
                existing = connection.execute(
                    "SELECT id FROM assets_data WHERE asset_id = ? AND field = ? LIMIT 1",
                    (asset_id, field),
                ).fetchone()
                if existing is not None:
                    continue
                connection.execute(
                    "INSERT INTO assets_data (asset_id, field, value, created_at) VALUES (?, ?, ?, ?)",
                    (asset_id, field, json.dumps(source[field], ensure_ascii=False), now_ms),
                )
                inserted += 1
        return inserted

    def list_token_inference_samples(self) -> list[dict[str, Any]]:
        connection = self._connection()
        assets = connection.execute(
            "SELECT id, ticker, name FROM assets WHERE kind = 'token' ORDER BY ticker"
        ).fetchall()
        samples_by_asset_id = {
            int(asset_id): {"assetId": str(ticker).strip().lower(), "name": str(name)}
            for asset_id, ticker, name in assets
        }
        seen: set[tuple[int, str]] = set()

        rows = connection.execute(
            "SELECT asset_id, field, value FROM assets_data ORDER BY created_at DESC, id DESC"
        ).fetchall()
        for asset_id_raw, field_raw, value_raw in rows:
            asset_id = int(asset_id_raw)
            field = str(field_raw)
            key = (asset_id, field)
            sample = samples_by_asset_id.get(asset_id)
            if sample is None or key in seen:
                continue
            sample[field] = json.loads(str(value_raw))
            seen.add(key)

        return list(samples_by_asset_id.values())
# end of LLM written Code
