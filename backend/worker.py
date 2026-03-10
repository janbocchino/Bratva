"""
Unified Price Worker: Calculates asset prices and sends to REST API.
Supports both single-asset and multi-asset modes.
"""
import time
from typing import Any, Dict, List, Optional
from db.client import DatabaseClient

from backend.ml import load_all_models, calculate_model_price, sample_price_movement
from backend.constants import PRICE_UPDATE_INTERVAL


class AssetState:
    """Tracks state for a single asset."""
    
    def __init__(self, asset_id: str, sample: Dict[str, Any]):
        self.asset_id = asset_id
        self.sample = sample
        self.name = sample.get("name", asset_id)
        self.current_price: Optional[float] = None


class PriceWorker:
    """Unified worker for single or multiple price streams."""
    
    def __init__(
        self, 
        samples: List[Dict[str, Any]], 
    ):
        self.update_count = 0
        self.api_available = False
        
        # Create asset states
        self.assets: List[AssetState] = []
        for sample in samples:
            # Always use the assetId provided in the sample
            asset_id = sample["assetId"]
            self.assets.append(AssetState(asset_id, sample))
        
        # Load ML models (shared)
        print("Loading ML models...")
        self.model, self.scaler, self.embedding_model = load_all_models()
        print("Models loaded.")
        
        # Initialize Database
        self.db = DatabaseClient()
        print("Database initialized.")



    def _calculate_initial_price(self, asset: AssetState) -> float:
        price, _ = calculate_model_price(
            self.model, asset.sample, self.scaler, self.embedding_model
        )
        return price

    def _calculate_next_price(self, asset: AssetState) -> float:
        price, _ = sample_price_movement(asset.current_price)
        return price

    def _send_to_db(self, prices: List[Dict[str, Any]]) -> bool:
        """Save prices to the local database."""
        return self.db.insert_prices(prices)

    def run(self):
        """Main worker loop."""
        print(f"\n{'='*60}")
        print(f"Starting price worker")
        for asset in self.assets:
            print(f"  - {asset.asset_id} ({asset.name})")
        
        destination = "Local SQLite DB"
        print(f"Sending prices to: {destination}")
        print(f"Update interval: {PRICE_UPDATE_INTERVAL}s")
        print(f"{'='*60}\n")

        try:
            # Calculate initial prices
            print("Calculating initial prices...")
            for asset in self.assets:
                asset.current_price = self._calculate_initial_price(asset)
                print(f"  {asset.asset_id}: ${asset.current_price:.4f}")
            print()

            while True:
                timestamp = time.time()

                # Calculate new prices
                db_batch = []
                for asset in self.assets:
                    if asset.current_price is not None:
                        asset.current_price = self._calculate_next_price(asset)
                    
                    # Prepare for DB
                    db_batch.append({
                        "assetId": asset.asset_id,
                        "name": asset.name,
                        "priceCents": int(asset.current_price * 100),
                        "timestamp": timestamp,
                    })

                # Send to DB
                self._send_to_db(db_batch)
                self.update_count += 1

                # Log prices periodically
                if self.update_count % 10 == 0:
                    prices_str = " | ".join(
                        f"{a.name[:12]}: ${a.current_price:.2f}" for a in self.assets
                    )
                    print(f"[{self.update_count}] {prices_str}")

                time.sleep(PRICE_UPDATE_INTERVAL)

        except KeyboardInterrupt:
            print("\nShutting down...")
            print("Worker stopped.")
