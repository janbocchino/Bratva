# beginning of LLM written Code, Model: gpt-5.3-codex
"""Local FastAPI service that stores and serves model-price batches."""

import json
from threading import Lock
from typing import Any, Dict, List

import uvicorn
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field, field_validator

from backend.constants import BACKEND_FASTAPI_HOST, BACKEND_FASTAPI_PORT, FASTAPI_MODEL_PRICE_TOKEN


class ModelPriceRow(BaseModel):
    assetTicker: str
    priceCents: int = Field(ge=0)
    timestamp: float

    @field_validator("assetTicker")
    @classmethod
    def normalize_ticker(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not normalized:
            raise ValueError("assetTicker must be non-empty")
        return normalized


app = FastAPI(title="Bratva Local Price Ingest API")
_LATEST_MODEL_PRICE_ROWS: List[Dict[str, Any]] = []
_LATEST_MODEL_PRICE_ROWS_LOCK = Lock()

def _assert_valid_token(x_model_price_token: str | None) -> None:
    if not FASTAPI_MODEL_PRICE_TOKEN:
        return
    provided = (x_model_price_token or "").strip()
    if provided != FASTAPI_MODEL_PRICE_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid model-price token")


@app.post("/model-prices")
def ingest_model_prices(rows: List[ModelPriceRow]) -> Dict[str, Any]:
    serialized_rows = [row.model_dump() for row in rows]
    with _LATEST_MODEL_PRICE_ROWS_LOCK:
        _LATEST_MODEL_PRICE_ROWS.clear()
        _LATEST_MODEL_PRICE_ROWS.extend(serialized_rows)

    return {
        "ok": True,
        "storedRows": len(rows),
    }


@app.get("/model-prices")
def list_model_prices(x_model_price_token: str | None = Header(default=None)) -> List[Dict[str, Any]]:
    _assert_valid_token(x_model_price_token)
    with _LATEST_MODEL_PRICE_ROWS_LOCK:
        return json.loads(json.dumps(_LATEST_MODEL_PRICE_ROWS))


def main() -> None:
    uvicorn.run(app, host=BACKEND_FASTAPI_HOST, port=BACKEND_FASTAPI_PORT, log_level="info")


if __name__ == "__main__":
    main()
# end of LLM written Code
