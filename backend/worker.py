"""
Price worker that reads latest `assets_data` feature rows each tick, performs ML inference,
and persists model prices directly to SQLite.
"""
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

from backend.constants import DATABASE_URL, PRICE_UPDATE_INTERVAL
from backend.ml import calculate_model_price, load_all_models
from backend.persistence.assets_data import AssetsDataStore
from backend.persistence.model_price import ModelPriceInputRow, ModelPriceWriter
from backend.types_ import InputData


# beginning of LLM written Code, Model: gpt-5.3-codex
class AssetState:
    """Tracks runtime state for one asset ticker."""

    def __init__(self, asset_ticker: str, sample: Dict[str, Any]):
        self.asset_ticker = asset_ticker
        self.sample = sample
        self.name = sample.get("name", asset_ticker)
        self.current_price: Optional[float] = None


class PriceWorker:
    """Reads asset feature snapshots every tick and writes inferred prices to SQLite."""

    def __init__(self):
        self.update_count = 0
        # beginning of LLM written Code, Model: gpt-5.3-codex
        self.repo_root = Path(__file__).resolve().parents[1]
        # end of LLM written Code
        # beginning of LLM written Code, Model: GPT-5.5
        self.assets_data_store = AssetsDataStore(DATABASE_URL, self.repo_root)
        self.model_price_writer = ModelPriceWriter(DATABASE_URL, self.repo_root)
        # end of LLM written Code
        self.assets_by_ticker: Dict[str, AssetState] = {}

        print("Loading ML models...")
        self.model, self.scaler, self.embedding_model = load_all_models()
        print("Models loaded.")

    def _normalize_sample(self, sample: Dict[str, Any]) -> Dict[str, Any]:
        # beginning of LLM written Code, Model: Composer
        required_fields = ["assetId", *InputData.field_names()]
        # end of LLM written Code
        missing_fields = [field for field in required_fields if field not in sample]
        if missing_fields:
            raise ValueError(f"Missing required fields: {missing_fields}")

        normalized_sample = dict(sample)
        normalized_sample["assetId"] = str(sample["assetId"]).strip().lower()
        normalized_sample["name"] = str(sample["name"]).strip()
        normalized_sample["occupation"] = sample["occupation"]
        normalized_sample["citizenship"] = sample["citizenship"]
        # beginning of LLM written Code, Model: gpt-5.5-medium
        # log1p(undefined); scrapers may leave legacy -1 for "unknown".
        for field in InputData.log_transform_fields():
            value = max(0, int(sample[field]))
            normalized_sample[field] = value
        # end of LLM written Code
        normalized_sample["associations"] = sample["associations"]
        headlines = sample["news_headlines"]
        if not isinstance(headlines, list):
            raise ValueError("news_headlines must be a list")
        normalized_sample["news_headlines"] = [str(headline).strip() for headline in headlines]
        normalized_sample["age"] = int(sample["age"])
        return normalized_sample

    def _read_asset_samples(self) -> List[Dict[str, Any]]:
        parsed_samples: List[Dict[str, Any]] = []
        for raw_sample in self.assets_data_store.list_token_inference_samples():
            try:
                if not isinstance(raw_sample, dict):
                    raise ValueError("assets_data sample must be an object")
                parsed_samples.append(self._normalize_sample(raw_sample))
            except Exception as error:
                ticker = (
                    raw_sample.get("assetId", "unknown")
                    if isinstance(raw_sample, dict)
                    else "unknown"
                )
                print(f"Skipping invalid assets_data sample for {ticker}: {error}")
        return parsed_samples

    def _refresh_assets(self, samples: List[Dict[str, Any]]) -> None:
        next_assets_by_ticker: Dict[str, AssetState] = {}
        for sample in samples:
            ticker = sample["assetId"]
            previous = self.assets_by_ticker.get(ticker)
            if previous is None:
                next_assets_by_ticker[ticker] = AssetState(ticker, sample)
                continue

            previous.sample = sample
            previous.name = sample.get("name", ticker)
            next_assets_by_ticker[ticker] = previous

        self.assets_by_ticker = next_assets_by_ticker

    def _calculate_price(self, asset: AssetState) -> float:
        inferred_price, _ = calculate_model_price(
            self.model,
            asset.sample,
            self.scaler,
            self.embedding_model,
        )
        return inferred_price

    # beginning of LLM written Code, Model: GPT-5.5
    def _write_model_prices(self, prices: List[ModelPriceInputRow]) -> bool:
        if not prices:
            return True

        try:
            written_count = self.model_price_writer.write_batch(prices)
            if written_count != len(prices):
                print(f"Model price write skipped {len(prices) - written_count} unknown assets.")
            return True
        except Exception as error:
            print(f"Model price SQLite write failed: {error}")
            return False
    # end of LLM written Code

    def run(self):
        print(f"\n{'='*60}")
        print("Starting price worker")
        print("Assets source: SQLite assets_data (latest per field)")
        # beginning of LLM written Code, Model: GPT-5.5
        print("Write path: SQLite (DATABASE_URL)")
        # end of LLM written Code
        print(f"Update interval: {PRICE_UPDATE_INTERVAL}s")
        print(f"{'='*60}\n")

        try:
            while True:
                tick_timestamp = time.time()
                self._refresh_assets(self._read_asset_samples())

                if not self.assets_by_ticker:
                    print("No token assets with complete assets_data rows found, waiting for next tick.")
                    time.sleep(PRICE_UPDATE_INTERVAL)
                    continue

                # beginning of LLM written Code, Model: GPT-5.5
                db_batch: List[ModelPriceInputRow] = []
                # end of LLM written Code
                for asset in self.assets_by_ticker.values():
                    asset.current_price = self._calculate_price(asset)
                    db_batch.append(
                        {
                            "assetTicker": asset.asset_ticker,
                            "priceCents": int(round(asset.current_price * 100)),
                            "timestamp": tick_timestamp,
                        }
                    )

                # beginning of LLM written Code, Model: GPT-5.5
                if self._write_model_prices(db_batch):
                    # end of LLM written Code
                    self.update_count += 1
                    if self.update_count % 10 == 0:
                        prices_str = " | ".join(
                            f"{asset.name[:12]}: ${asset.current_price:.2f}"
                            for asset in self.assets_by_ticker.values()
                            if asset.current_price is not None
                        )
                        print(f"[{self.update_count}] {prices_str}")

                time.sleep(PRICE_UPDATE_INTERVAL)
        except KeyboardInterrupt:
            print("\nShutting down...")
            print("Worker stopped.")
# end of LLM written Code
