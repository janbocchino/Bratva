# beginning of LLM written Code, Model: GPT-5.2
"""SQLite persistence for append-only valuation summaries."""

from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from pathlib import Path

from backend.persistence.model_price import _sqlite_path


@dataclass(frozen=True)
class ValuationSummaryRow:
    id: int
    asset_id: int
    body: str
    feature_fingerprint: str
    feature_snapshot_json: str
    previous_feature_fingerprint: str | None
    model_price_scaled: bytes | None
    created_at_ms: int


class ValuationSummaryStore:
    def __init__(self, database_url: str, repo_root: Path):
        self.database_path = _sqlite_path(database_url, repo_root)
        if not self.database_path.exists():
            raise FileNotFoundError(
                f"SQLite database not found at {self.database_path}; run migrations before starting the summary worker"
            )
        self._connection = sqlite3.connect(str(self.database_path), timeout=30.0)
        self._connection.execute("PRAGMA journal_mode=WAL")

    def fetch_latest_for_asset(self, asset_id: int) -> ValuationSummaryRow | None:
        row = self._connection.execute(
            """
            SELECT
              id,
              asset_id,
              body,
              feature_fingerprint,
              feature_snapshot_json,
              previous_feature_fingerprint,
              model_price_scaled,
              created_at
            FROM valuation_summaries
            WHERE asset_id = ?
            ORDER BY created_at DESC, id DESC
            LIMIT 1
            """,
            (int(asset_id),),
        ).fetchone()
        if row is None:
            return None
        return ValuationSummaryRow(
            id=int(row[0]),
            asset_id=int(row[1]),
            body=str(row[2]),
            feature_fingerprint=str(row[3]),
            feature_snapshot_json=str(row[4]),
            previous_feature_fingerprint=None if row[5] is None else str(row[5]),
            model_price_scaled=None if row[6] is None else bytes(row[6]),
            created_at_ms=int(row[7]),
        )

    def insert(
        self,
        *,
        asset_id: int,
        body: str,
        feature_fingerprint: str,
        feature_snapshot_json: str,
        previous_feature_fingerprint: str | None,
        model_price_scaled: bytes | None,
        created_at_ms: int,
    ) -> int:
        with self._connection:
            cursor = self._connection.execute(
                """
                INSERT INTO valuation_summaries (
                  asset_id,
                  body,
                  feature_fingerprint,
                  feature_snapshot_json,
                  previous_feature_fingerprint,
                  model_price_scaled,
                  created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    int(asset_id),
                    str(body),
                    str(feature_fingerprint),
                    str(feature_snapshot_json),
                    previous_feature_fingerprint,
                    model_price_scaled,
                    int(created_at_ms),
                ),
            )
            return int(cursor.lastrowid)


# end of LLM written Code
