# beginning of LLM written Code, Model: GPT-5.2
from __future__ import annotations

import sqlite3
import time
from pathlib import Path
from typing import Any

import os

from backend.constants import DATABASE_URL
from backend.persistence.assets_data import ASSET_DATA_FIELDS, AssetsDataStore
from backend.persistence.model_price import _sqlite_path
from backend.persistence.valuation_summary import ValuationSummaryStore
from backend.summary.fingerprint import snapshot_json_and_fingerprint
from backend.summary.prompt import build_prompt
from backend.summary.providers.gemini import generate_text
from backend.summary.providers.stub import generate as stub_generate


def _latest_model_price_scaled_for_asset_id(connection: sqlite3.Connection, asset_id: int) -> bytes | None:
    row = connection.execute(
        """
        SELECT mp.price
        FROM markets m
        JOIN model_price mp ON mp.market_id = m.id
        WHERE m.base_asset_id = ?
        ORDER BY mp.created_at DESC, mp.id DESC
        LIMIT 1
        """,
        (int(asset_id),),
    ).fetchone()
    if row is None:
        return None
    return None if row[0] is None else bytes(row[0])


def _format_usd_from_scaled(scaled_blob: bytes | None) -> str:
    if scaled_blob is None:
        return "$0.00"
    try:
        scaled_int = int(scaled_blob.decode("utf-8"))
        dollars = scaled_int / 10**18
        return f"${dollars:,.2f}"
    except Exception:
        return "$0.00"


def _select_provider() -> str:
    return os.getenv("SUMMARY_LLM_PROVIDER", "stub").strip().lower()


class SummaryWorker:
    def __init__(self) -> None:
        self.repo_root = Path(__file__).resolve().parents[2]
        self.assets_data_store = AssetsDataStore(DATABASE_URL, self.repo_root)
        self.summary_store = ValuationSummaryStore(DATABASE_URL, self.repo_root)
        self._db_path = _sqlite_path(DATABASE_URL, self.repo_root)
        self._connection = sqlite3.connect(str(self._db_path), timeout=30.0)
        self._connection.execute("PRAGMA journal_mode=WAL")

    def _asset_id_for_ticker(self, ticker: str) -> int | None:
        row = self._connection.execute(
            "SELECT id FROM assets WHERE ticker = ? LIMIT 1",
            (ticker.strip().lower(),),
        ).fetchone()
        return None if row is None else int(row[0])

    def run(self) -> int:
        provider = _select_provider()
        inserted = 0

        for raw_sample in self.assets_data_store.list_token_inference_samples():
            ticker = str(raw_sample.get("assetId") or "").strip().lower()
            if not ticker:
                continue
            asset_id = self._asset_id_for_ticker(ticker)
            if asset_id is None:
                continue

            features: dict[str, Any] = {
                field: raw_sample.get(field) for field in ASSET_DATA_FIELDS if field in raw_sample
            }
            new_snapshot_json, new_fingerprint = snapshot_json_and_fingerprint(
                name=str(raw_sample.get("name") or ""), features=features
            )

            prev = self.summary_store.fetch_latest_for_asset(asset_id)
            if prev is not None and prev.feature_fingerprint == new_fingerprint:
                continue

            old_snapshot_json = None if prev is None else prev.feature_snapshot_json
            model_price_scaled = _latest_model_price_scaled_for_asset_id(self._connection, asset_id)
            model_price_usd = _format_usd_from_scaled(model_price_scaled)

            prompt = build_prompt(
                asset_ticker=ticker,
                model_price_usd=model_price_usd,
                new_feature_snapshot_json=new_snapshot_json,
                old_feature_snapshot_json=old_snapshot_json,
            )

            if provider == "gemini":
                body = generate_text(prompt=prompt)
            else:
                body = stub_generate(
                    new_snapshot_json=new_snapshot_json,
                    old_snapshot_json=old_snapshot_json,
                    model_price_usd=model_price_usd,
                )

            now_ms = int(time.time() * 1000)
            self.summary_store.insert(
                asset_id=asset_id,
                body=body,
                feature_fingerprint=new_fingerprint,
                feature_snapshot_json=new_snapshot_json,
                previous_feature_fingerprint=None if prev is None else prev.feature_fingerprint,
                model_price_scaled=model_price_scaled,
                created_at_ms=now_ms,
            )
            inserted += 1

        return inserted


def run() -> None:
    worker = SummaryWorker()
    inserted = worker.run()
    print(f"[valuation_summary] inserted={inserted}")


# end of LLM written Code
