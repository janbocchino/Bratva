# beginning of LLM written Code, Model: GPT-5.5
"""SQLite persistence for model-price batches emitted by the worker."""

from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Sequence, TypedDict
from urllib.parse import unquote, urlparse

SCALE_PER_CENT = 10**16

_MARKET_FOR_TICKER_SQL = """
SELECT markets.id
FROM assets
JOIN markets ON markets.base_asset_id = assets.id
WHERE assets.ticker = ?
LIMIT 1
"""


class ModelPriceInputRow(TypedDict):
    assetTicker: str
    priceCents: int
    timestamp: float


def _sqlite_path(database_url: str, repo_root: Path) -> Path:
    url = database_url.strip()
    if not url:
        raise ValueError("DATABASE_URL must be set")
    parsed = urlparse(url)
    if parsed.scheme not in ("", "file"):
        raise ValueError(f"worker only supports local SQLite file DATABASE_URL, got {parsed.scheme!r}")
    raw = unquote(parsed.path if parsed.scheme == "file" else url)
    path = Path(raw)
    return path if path.is_absolute() else repo_root / path


class ModelPriceWriter:
    def __init__(self, database_url: str, repo_root: Path):
        self.database_path = _sqlite_path(database_url, repo_root)
        if not self.database_path.exists():
            raise FileNotFoundError(
                f"SQLite database not found at {self.database_path}; run migrations before starting the worker"
            )
        self._connection = sqlite3.connect(str(self.database_path), timeout=30.0)
        self._connection.execute("PRAGMA journal_mode=WAL")

    def write_batch(self, rows: Sequence[ModelPriceInputRow]) -> int:
        if not rows:
            return 0

        inserted_count = 0
        with self._connection:
            for row in rows:
                ticker = row["assetTicker"].strip().lower()
                if not ticker:
                    continue

                market_row = self._connection.execute(_MARKET_FOR_TICKER_SQL, (ticker,)).fetchone()
                if market_row is None:
                    print(f"Skipping model price for unknown asset ticker: {ticker}")
                    continue

                price_blob = str(row["priceCents"] * SCALE_PER_CENT).encode("utf-8")
                self._connection.execute(
                    "INSERT INTO model_price (market_id, price, created_at) VALUES (?, ?, ?)",
                    (int(market_row[0]), price_blob, int(row["timestamp"] * 1000)),
                )
                inserted_count += 1
        return inserted_count


# end of LLM written Code
