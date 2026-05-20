"""
Price worker that reads `assets/live/*.json` each tick, performs ML inference,
and persists model prices through the local FastAPI bridge.
"""
import json
import time
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from backend.constants import FASTAPI_MODEL_PRICE_URL, PRICE_UPDATE_INTERVAL
from backend.ml import calculate_model_price, load_all_models
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
    """Reads live asset JSON mirrors every tick and writes inferred prices via local FastAPI."""

    def __init__(self, assets_dir: Optional[Path] = None):
        self.update_count = 0
        # beginning of LLM written Code, Model: gpt-5.3-codex
        self.repo_root = Path(__file__).resolve().parents[1]
        self.assets_dir = assets_dir or (self.repo_root / "assets" / "live")
        # end of LLM written Code
        self.assets_by_ticker: Dict[str, AssetState] = {}

        print("Loading ML models...")
        self.model, self.scaler, self.embedding_model = load_all_models()
        print("Models loaded.")

    def _normalize_sample(self, sample: Dict[str, Any]) -> Dict[str, Any]:
        required_fields = [
            "assetId",
            "name",
            "occupation",
            "citizenship",
            "net_worth",
            "social_media_followers",
            "associations",
            "age",
        ]
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
        for field in InputData.LOG_TRANSFORM_FIELDS:
            value = max(0, int(sample[field]))
            normalized_sample[field] = value
        # end of LLM written Code
        normalized_sample["associations"] = sample["associations"]
        normalized_sample["age"] = int(sample["age"])
        return normalized_sample

    def _read_asset_samples(self) -> List[Dict[str, Any]]:
        if not self.assets_dir.exists():
            print(f"Assets directory not found: {self.assets_dir}")
            return []

        parsed_samples: List[Dict[str, Any]] = []
        for asset_file in sorted(self.assets_dir.glob("*.json")):
            try:
                with asset_file.open("r", encoding="utf-8") as file_handle:
                    raw_sample = json.load(file_handle)
                if not isinstance(raw_sample, dict):
                    raise ValueError("asset JSON root must be an object")
                parsed_samples.append(self._normalize_sample(raw_sample))
            except Exception as error:
                print(f"Skipping invalid asset file {asset_file}: {error}")
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

    def _send_to_ingest(self, prices: List[Dict[str, Any]]) -> bool:
        if not prices:
            return True

        request = Request(
            FASTAPI_MODEL_PRICE_URL,
            data=json.dumps(prices).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urlopen(request, timeout=10.0) as response:
                body = response.read().decode("utf-8")
                if body.strip():
                    print(body.strip())
                return 200 <= response.status < 300
        except HTTPError as error:
            error_body = error.read().decode("utf-8")
            message = error_body.strip() if error_body else "<no body>"
            print(
                f"Price ingest HTTP request failed ({error.code}) "
                f"against {FASTAPI_MODEL_PRICE_URL}: {message}"
            )
            return False
        except URLError as error:
            print(
                "Price ingest HTTP request failed against "
                f"{FASTAPI_MODEL_PRICE_URL}: {error.reason}"
            )
            return False

    def run(self):
        print(f"\n{'='*60}")
        print("Starting price worker")
        print(f"Assets source: {self.assets_dir}")
        print("Write path: local FastAPI bridge")
        print(f"Update interval: {PRICE_UPDATE_INTERVAL}s")
        print(f"{'='*60}\n")

        try:
            while True:
                tick_timestamp = time.time()
                self._refresh_assets(self._read_asset_samples())

                if not self.assets_by_ticker:
                    print("No valid asset JSON files found, waiting for next tick.")
                    time.sleep(PRICE_UPDATE_INTERVAL)
                    continue

                db_batch: List[Dict[str, Any]] = []
                for asset in self.assets_by_ticker.values():
                    asset.current_price = self._calculate_price(asset)
                    db_batch.append(
                        {
                            "assetTicker": asset.asset_ticker,
                            "priceCents": int(round(asset.current_price * 100)),
                            "timestamp": tick_timestamp,
                        }
                    )

                if self._send_to_ingest(db_batch):
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
